import { supabase } from './supabase'

type StockInwardInput = {
  entryDate: string
  shedId: string
  companyId: string
  rawWeightKg: number
}

type MemberWeightInput = {
  memberId: string
  weightKg: number
}

type ProcessingAtomicInput = {
  lotId: string
  batchId: string
  processingTypeId: string
  countRangeId: string
  ratePerKgSnapshot: number
  memberWeights: MemberWeightInput[]
}

type EntryIdRow = { entry_id?: string | null }
type AmountRow = { amount_snapshot?: number | null } & EntryIdRow

type InsertAttempt = {
  label: string
  payload: Record<string, unknown> | Record<string, unknown>[]
  select: string
  many?: boolean
}

async function tryInsertProcessingEntries(
  attempts: InsertAttempt[]
): Promise<{ entryId: string; amountSnapshot?: number }> {
  let lastError: Error | null = null

  for (const attempt of attempts) {
    const query = supabase.from('processing_entries').insert(attempt.payload as never)
    const { data, error } = attempt.many
      ? await query.select(attempt.select)
      : await query.select(attempt.select).single()

    if (!error) {
      if (Array.isArray(data)) {
        const first = (data[0] as AmountRow | undefined) || {}
        return {
          entryId: first.entry_id || '',
          amountSnapshot: typeof first.amount_snapshot === 'number' ? Number(first.amount_snapshot) : undefined,
        }
      }

      const one = (data as AmountRow | null) || {}
      return {
        entryId: one.entry_id || '',
        amountSnapshot: typeof one.amount_snapshot === 'number' ? Number(one.amount_snapshot) : undefined,
      }
    }

    console.warn(`[processing_entries insert attempt failed: ${attempt.label}]`, error.message)
    lastError = new Error(error.message)
  }

  throw lastError || new Error('All processing entry insert attempts failed')
}

function isBusinessValidationError(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes('lot is not open') ||
    text.includes('lot not found') ||
    text.includes('processing exceeds lot balance') ||
    text.includes('member weights') ||
    text.includes('total member weight')
  )
}

// ─── Stock Inward ─────────────────────────────────────────────────────────────
// Actual DB columns: inward_id (PK), inward_date, shed_id, company_id,
//   raw_weight_kg, created_by (NOT NULL), created_at
export async function submitStockInward(input: StockInwardInput): Promise<{ stockInwardId: string; lotId?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expired. Please login again.')

  const { data, error } = await supabase
    .from('stock_inward')
    .insert({
      inward_date: input.entryDate,
      shed_id: input.shedId,
      company_id: input.companyId,
      raw_weight_kg: input.rawWeightKg,
      created_by: user?.id ?? null,   // required: NOT NULL column
    })
    .select('inward_id')
    .single()

  if (error) throw error

  const stockInwardId = data.inward_id as string

  // Wait briefly for the DB trigger to create the processing_lot
  await new Promise((r) => setTimeout(r, 400))

  const { data: lotData } = await supabase
    .from('processing_lots')
    .select('lot_id')
    .eq('stock_inward_id', stockInwardId)
    .maybeSingle()

  return {
    stockInwardId,
    lotId: lotData?.lot_id as string | undefined,
  }
}

// ─── Processing Entry (per-member rows, grouped by run_ref) ───────────────────
// Actual DB columns: entry_id (PK), entry_date, company_id, shed_id, batch_id,
//   member_id, processing_type_id, count_range_id, processed_weight_kg,
//   rate_per_kg_snapshot, amount_snapshot, created_by, run_ref
export async function submitProcessingEntryAtomic(input: ProcessingAtomicInput): Promise<{
  processingEntryId: string
  amountSnapshot: number
  lotRemainingKg: number
}> {
  const memberWeights = input.memberWeights
    .filter((item) => item.weightKg > 0)
    .map((item) => ({ member_id: item.memberId, weight_kg: Number(item.weightKg.toFixed(3)) }))

  if (memberWeights.length === 0) {
    throw new Error('At least one member weight is required')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expired. Please login again.')

  // Try RPC first (atomic, safe)
  const { data, error } = await supabase.rpc('process_round_submit', {
    p_lot_id: input.lotId,
    p_batch_id: input.batchId,
    p_processing_type_id: input.processingTypeId,
    p_count_range_id: input.countRangeId,
    p_member_weights: memberWeights,
    p_rate_per_kg_snapshot: input.ratePerKgSnapshot,
    p_actor: user?.id ?? null,
  })

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data
    return {
      processingEntryId: row.processing_entry_id || row.entry_id,
      amountSnapshot: Number(row.amount_snapshot || 0),
      lotRemainingKg: Number(row.lot_remaining_kg || 0),
    }
  }

  if (isBusinessValidationError(error.message || '')) {
    throw error
  }

  // Fallback: insert one row per member directly using actual column names
  console.warn('[submitProcessingEntryAtomic] RPC failed, using fallback:', error.message)

  const { data: lot, error: lotError } = await supabase
    .from('processing_lots')
    .select('lot_id,entry_date,shed_id,company_id,raw_weight_kg,processed_weight_kg,status')
    .eq('lot_id', input.lotId)
    .single()

  if (lotError) throw lotError
  if (lot.status !== 'open') throw new Error('Lot is not open')

  const totalKg = memberWeights.reduce((sum, item) => sum + Number(item.weight_kg), 0)
  const remaining = Number(lot.raw_weight_kg) - Number(lot.processed_weight_kg)
  if (totalKg > remaining) {
    throw new Error(`Processing exceeds lot balance (${remaining.toFixed(2)} kg left)`)
  }

  const runRef = `run-${Date.now()}`
  const totalAmount = Number((totalKg * input.ratePerKgSnapshot).toFixed(2))

  // Insert one row per member using actual column names
  const rows = memberWeights.map((mw) => {
    const memberKg = Number(mw.weight_kg)
    const memberAmount = Number((memberKg * input.ratePerKgSnapshot).toFixed(2))
    return {
      lot_id: lot.lot_id,
      shed_id: lot.shed_id,
      company_id: lot.company_id,
      batch_id: input.batchId,
      member_id: mw.member_id,
      processing_type_id: input.processingTypeId,
      count_range_id: input.countRangeId,
      processed_weight_kg: memberKg,
      rate_per_kg_snapshot: input.ratePerKgSnapshot,
      amount_snapshot: memberAmount,
      run_ref: runRef,
      created_by: user?.id ?? null,
    }
  })

  let firstEntryId = ''
  try {
    const result = await tryInsertProcessingEntries([
      // Most complete row shape.
      { label: 'member+run_ref+created_by', payload: rows, select: 'entry_id,amount_snapshot', many: true },
      // No run_ref.
      {
        label: 'member+created_by',
        payload: rows.map((r) => {
          const { run_ref: _omit, ...rest } = r
          void _omit
          return rest
        }),
        select: 'entry_id,amount_snapshot',
        many: true,
      },
      // Aggregate with run_ref.
      {
        label: 'aggregate+run_ref+created_by',
        payload: {
          lot_id: lot.lot_id,
          shed_id: lot.shed_id,
          company_id: lot.company_id,
          batch_id: input.batchId,
          processing_type_id: input.processingTypeId,
          count_range_id: input.countRangeId,
          processed_weight_kg: Number(totalKg.toFixed(3)),
          rate_per_kg_snapshot: input.ratePerKgSnapshot,
          amount_snapshot: totalAmount,
          created_by: user.id,
          run_ref: runRef,
        },
        select: 'entry_id,amount_snapshot',
      },
      // Aggregate without run_ref.
      {
        label: 'aggregate+created_by',
        payload: {
          lot_id: lot.lot_id,
          shed_id: lot.shed_id,
          company_id: lot.company_id,
          batch_id: input.batchId,
          processing_type_id: input.processingTypeId,
          count_range_id: input.countRangeId,
          processed_weight_kg: Number(totalKg.toFixed(3)),
          rate_per_kg_snapshot: input.ratePerKgSnapshot,
          amount_snapshot: totalAmount,
          created_by: user.id,
        },
        select: 'entry_id,amount_snapshot',
      },
      // Minimal aggregate (for very strict legacy schemas).
      {
        label: 'aggregate-minimal',
        payload: {
          lot_id: lot.lot_id,
          shed_id: lot.shed_id,
          company_id: lot.company_id,
          batch_id: input.batchId,
          processing_type_id: input.processingTypeId,
          count_range_id: input.countRangeId,
          processed_weight_kg: Number(totalKg.toFixed(3)),
          rate_per_kg_snapshot: input.ratePerKgSnapshot,
          amount_snapshot: totalAmount,
        },
        select: 'entry_id,amount_snapshot',
      },
    ])

    firstEntryId = result.entryId
  } catch (insertEx) {
    throw insertEx
  }

  const { error: updateError } = await supabase
    .from('processing_lots')
    .update({ processed_weight_kg: Number((Number(lot.processed_weight_kg) + totalKg).toFixed(3)) })
    .eq('lot_id', input.lotId)

  if (updateError) throw updateError

  // Best effort member-split write when we inserted one aggregate entry.
  if (firstEntryId && memberWeights.length > 0) {
    const splitRows = memberWeights.map((mw) => ({
      entry_id: firstEntryId,
      member_id: mw.member_id,
      processed_weight_kg: Number(mw.weight_kg),
    }))
    const splitRes = await supabase.from('processing_entry_members').insert(splitRows)
    if (splitRes.error) {
      console.warn('[submitProcessingEntryAtomic] member split insert failed:', splitRes.error.message)
    }
  }

  return {
    processingEntryId: firstEntryId,
    amountSnapshot: totalAmount,
    lotRemainingKg: Number((remaining - totalKg).toFixed(3)),
  }
}

// Keep for backwards compat (offline queue fallback)
export async function submitProcessingEntry(input: {
  lotId?: string
  entryDate: string
  shedId: string
  companyId: string
  batchId: string
  processingTypeId: string
  countRangeId: string
  processedWeightKg: number
  ratePerKgSnapshot: number
}): Promise<{ processingEntryId: string; amountSnapshot: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expired. Please login again.')

  const amountSnapshot = Number((input.processedWeightKg * input.ratePerKgSnapshot).toFixed(2))
  const insertResult = await tryInsertProcessingEntries([
    {
      label: 'legacy-submit+created_by+run_ref',
      payload: {
        lot_id: input.lotId ?? null,
        shed_id: input.shedId,
        company_id: input.companyId,
        batch_id: input.batchId,
        processing_type_id: input.processingTypeId,
        count_range_id: input.countRangeId,
        processed_weight_kg: input.processedWeightKg,
        rate_per_kg_snapshot: input.ratePerKgSnapshot,
        amount_snapshot: amountSnapshot,
        created_by: user.id,
        run_ref: `run-${Date.now()}`,
      },
      select: 'entry_id,amount_snapshot',
    },
    {
      label: 'legacy-submit+created_by',
      payload: {
        lot_id: input.lotId ?? null,
        shed_id: input.shedId,
        company_id: input.companyId,
        batch_id: input.batchId,
        processing_type_id: input.processingTypeId,
        count_range_id: input.countRangeId,
        processed_weight_kg: input.processedWeightKg,
        rate_per_kg_snapshot: input.ratePerKgSnapshot,
        amount_snapshot: amountSnapshot,
        created_by: user.id,
      },
      select: 'entry_id,amount_snapshot',
    },
    {
      label: 'legacy-submit-minimal',
      payload: {
        lot_id: input.lotId ?? null,
        shed_id: input.shedId,
        company_id: input.companyId,
        batch_id: input.batchId,
        processing_type_id: input.processingTypeId,
        count_range_id: input.countRangeId,
        processed_weight_kg: input.processedWeightKg,
        rate_per_kg_snapshot: input.ratePerKgSnapshot,
        amount_snapshot: amountSnapshot,
      },
      select: 'entry_id,amount_snapshot',
    },
  ])

  return {
    processingEntryId: insertResult.entryId || '',
    amountSnapshot: Number(insertResult.amountSnapshot || amountSnapshot),
  }
}

export async function saveMemberWeightsBestEffort(params: {
  processingEntryId: string
  memberWeights: MemberWeightInput[]
}) {
  void params
  // No-op: in actual schema, member weights are stored as individual processing_entries rows
  // This function is kept for API compatibility with the offline queue fallback path
  console.log('[saveMemberWeightsBestEffort] skipped - member weights stored as processing_entries rows')
}
