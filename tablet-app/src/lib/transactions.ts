import { supabase } from './supabase'

export async function submitStockInward(params: {
  entryDate: string
  shedId: string
  companyId: string
  rawWeightKg: number
}) {
  const payloads = [
    {
      entry_date: params.entryDate,
      shed_id: params.shedId,
      company_id: params.companyId,
      raw_weight_kg: params.rawWeightKg,
    },
    {
      inward_date: params.entryDate,
      shed_id: params.shedId,
      company_id: params.companyId,
      raw_weight_kg: params.rawWeightKg,
    },
  ]

  let lastError: Error | null = null

  for (const payload of payloads) {
    const { error } = await supabase.from('stock_inward').insert(payload)
    if (!error) return
    lastError = new Error(error.message)
  }

  throw lastError || new Error('Failed to submit stock inward entry')
}

export async function submitProcessingEntry(params: {
  entryDate: string
  shedId: string
  companyId: string
  batchId: string
  processingTypeId: string
  countRangeId: string
  processedWeightKg: number
  ratePerKgSnapshot: number
}) {
  const amountSnapshot = Number((params.processedWeightKg * params.ratePerKgSnapshot).toFixed(2))

  const { data, error } = await supabase
    .from('processing_entries')
    .insert({
      entry_date: params.entryDate,
      shed_id: params.shedId,
      company_id: params.companyId,
      batch_id: params.batchId,
      processing_type_id: params.processingTypeId,
      count_range_id: params.countRangeId,
      processed_weight_kg: params.processedWeightKg,
      rate_per_kg_snapshot: params.ratePerKgSnapshot,
      amount_snapshot: amountSnapshot,
    })
    .select('processing_entry_id')
    .single()

  if (error) throw error

  return {
    amountSnapshot,
    processingEntryId: data?.processing_entry_id as string | undefined,
  }
}

export async function saveMemberWeightsBestEffort(params: {
  processingEntryId?: string
  memberWeights: Array<{ memberId: string; weightKg: number }>
}) {
  if (!params.processingEntryId || params.memberWeights.length === 0) return

  // Optional table. If unavailable in DB, we silently skip and keep batch-level save.
  const { error } = await supabase.from('processing_entry_members').insert(
    params.memberWeights.map((item) => ({
      processing_entry_id: params.processingEntryId,
      member_id: item.memberId,
      processed_weight_kg: item.weightKg,
    }))
  )

  if (error) {
    return
  }
}
