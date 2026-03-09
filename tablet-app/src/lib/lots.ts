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

type ProcessingEntryWeightRow = {
  lot_id?: string | null
  processed_weight_kg?: number | string | null
}

function labelById(options: Array<{ id: string; label: string }>, id: string): string {
  return options.find((item) => item.id === id)?.label || id
}

export async function fetchOpenAndClosedLots(masterData: MasterData): Promise<StockInwardContext[]> {
  const { data, error } = await supabase
    .from('processing_lots')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  const lotRows = (data || []) as ProcessingLotRow[]
  const lotIds = lotRows.map((row) => row.lot_id).filter(Boolean)
  let processedByLot = new Map<string, number>()

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

  return lotRows.map((row) => ({
    id: row.lot_id,
    stockInwardId: row.stock_inward_id || undefined,
    entryDate: row.entry_date,
    shedId: row.shed_id,
    shedLabel: labelById(masterData.sheds, row.shed_id),
    companyId: row.company_id,
    companyLabel: labelById(masterData.companies, row.company_id),
    rawWeightKg: Number(row.raw_weight_kg || 0),
    // Prefer computed sum from processing entries when available.
    // This keeps UI correct even if lot processed_weight_kg update lags/fails.
    processedWeightKg: (() => {
      const computed = processedByLot.get(row.lot_id)
      return Number((typeof computed === 'number' ? computed : Number(row.processed_weight_kg || 0)).toFixed(3))
    })(),
    status: row.status === 'closed' ? 'closed' : 'open',
    closedAt: row.closed_at || undefined,
  }))
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
