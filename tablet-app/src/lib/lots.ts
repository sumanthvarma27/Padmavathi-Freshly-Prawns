import { supabase } from './supabase'
import type { MasterData } from '../types/db'
import type { StockInwardContext } from '../types/workflow'

type ProcessingLotRow = {
  lot_id: string
  stock_inward_id?: string | null
  entry_date: string
  shed_id: string
  company_id: string
  raw_weight_kg?: number | string | null
  processed_weight_kg?: number | string | null
  status?: string | null
  closed_at?: string | null
}

type StockInwardMetaRow = {
  inward_id: string
  inward_date?: string | null
  shed_id: string
  company_id: string
  raw_weight_kg?: number | string | null
  count_range_id?: string | null
  remarks?: string | null
}

type StockInwardRemarks = {
  processingTypeId?: string
  ratePerKgSnapshot?: number
}

type ProcessingEntryWeightRow = {
  lot_id?: string | null
  processed_weight_kg?: number | string | null
}

function labelById(options: Array<{ id: string; label: string }>, id?: string | null): string | undefined {
  if (!id) return undefined
  return options.find((item) => item.id === id)?.label || id
}

function parseRemarks(raw?: string | null): StockInwardRemarks {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as StockInwardRemarks
    return {
      processingTypeId: parsed.processingTypeId,
      ratePerKgSnapshot:
        typeof parsed.ratePerKgSnapshot === 'number' ? Number(parsed.ratePerKgSnapshot) : undefined,
    }
  } catch {
    return {}
  }
}

async function fetchLotRows(): Promise<ProcessingLotRow[]> {
  const { data, error } = await supabase
    .from('processing_lots')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ProcessingLotRow[]
}

async function repairMissingProcessingLots(): Promise<void> {
  const { data: inwardData, error: inwardError } = await supabase
    .from('stock_inward')
    .select('inward_id,inward_date,shed_id,company_id,raw_weight_kg,count_range_id,remarks')
    .order('created_at', { ascending: false })

  if (inwardError) throw inwardError

  const inwardRows = (inwardData || []) as StockInwardMetaRow[]
  if (inwardRows.length === 0) return

  const { data: lotData, error: lotError } = await supabase
    .from('processing_lots')
    .select('stock_inward_id')

  if (lotError) throw lotError

  const linkedStockIds = new Set(
    ((lotData || []) as Array<{ stock_inward_id?: string | null }>)
      .map((row) => row.stock_inward_id)
      .filter(Boolean) as string[]
  )

  const missingRows = inwardRows.filter((row) => !linkedStockIds.has(row.inward_id))
  if (missingRows.length === 0) return

  const payload = missingRows.map((row) => ({
    stock_inward_id: row.inward_id,
    entry_date: row.inward_date,
    shed_id: row.shed_id,
    company_id: row.company_id,
    raw_weight_kg: Number(row.raw_weight_kg || 0),
    processed_weight_kg: 0,
    status: 'open',
  }))

  const { error: insertError } = await supabase
    .from('processing_lots')
    .upsert(payload, { onConflict: 'stock_inward_id', ignoreDuplicates: true })

  if (insertError) {
    console.warn('[fetchOpenAndClosedLots] repair missing lots failed:', insertError.message)
  }
}

export async function fetchOpenAndClosedLots(masterData: MasterData): Promise<StockInwardContext[]> {
  await repairMissingProcessingLots()

  const lotRows = await fetchLotRows()
  const lotIds = lotRows.map((row) => row.lot_id).filter(Boolean)
  const stockInwardIds = lotRows.map((row) => row.stock_inward_id).filter(Boolean) as string[]
  let processedByLot = new Map<string, number>()
  let stockMetaById = new Map<string, StockInwardMetaRow>()

  if (lotIds.length > 0) {
    const { data: entryData, error: entryError } = await supabase
      .from('processing_entries')
      .select('lot_id,processed_weight_kg')
      .in('lot_id', lotIds)

    if (entryError) throw entryError

    processedByLot = ((entryData || []) as ProcessingEntryWeightRow[]).reduce((map, row) => {
      const lotId = row.lot_id as string | null
      if (!lotId) return map
      const prev = map.get(lotId) || 0
      const next = prev + Number(row.processed_weight_kg || 0)
      map.set(lotId, Number(next.toFixed(3)))
      return map
    }, new Map<string, number>())
  }

  if (stockInwardIds.length > 0) {
    const { data: inwardData, error: inwardError } = await supabase
      .from('stock_inward')
      .select('inward_id,count_range_id,remarks')
      .in('inward_id', stockInwardIds)

    if (inwardError) throw inwardError

    stockMetaById = ((inwardData || []) as StockInwardMetaRow[]).reduce((map, row) => {
      map.set(row.inward_id, row)
      return map
    }, new Map<string, StockInwardMetaRow>())
  }

  return lotRows.map((row) => {
    const stockMeta = row.stock_inward_id ? stockMetaById.get(row.stock_inward_id) : undefined
    const remarks = parseRemarks(stockMeta?.remarks)
    const processingTypeId = remarks.processingTypeId
    const countRangeId = stockMeta?.count_range_id || undefined

    return {
      id: row.lot_id,
      stockInwardId: row.stock_inward_id || undefined,
      entryDate: row.entry_date,
      shedId: row.shed_id,
      shedLabel: labelById(masterData.sheds, row.shed_id) || row.shed_id,
      companyId: row.company_id,
      companyLabel: labelById(masterData.companies, row.company_id) || row.company_id,
      rawWeightKg: Number(row.raw_weight_kg || 0),
      processedWeightKg: (() => {
        const computed = processedByLot.get(row.lot_id)
        return Number((typeof computed === 'number' ? computed : Number(row.processed_weight_kg || 0)).toFixed(3))
      })(),
      processingTypeId,
      processingTypeLabel: labelById(masterData.processingTypes, processingTypeId),
      countRangeId,
      countRangeLabel: labelById(masterData.countRanges, countRangeId),
      workerRatePerKg: remarks.ratePerKgSnapshot,
      status: row.status === 'closed' ? 'closed' : 'open',
      closedAt: row.closed_at || undefined,
    }
  })
}

export async function closeLot(lotId: string, reason: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('processing_lots')
    .update({
      status: 'closed',
      closed_reason: reason,
      closed_by: user?.id || null,
      closed_at: new Date().toISOString(),
    })
    .eq('lot_id', lotId)
    .eq('status', 'open')

  if (error) throw error
}
