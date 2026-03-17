'use server'

import { createClient } from '@/lib/supabase/server'
import { getLotFinancialReport } from '@/lib/reports/operational-reporting'
import { revalidatePath } from 'next/cache'

export async function closeStockLot(lotId: string, reason: string) {
  const supabase = await createClient()

  if (!reason.trim()) {
    return { error: 'Reason is required' }
  }

  const lotReport = await getLotFinancialReport(supabase as never, lotId)
  if (!lotReport) {
    return { error: 'Stock lot not found.' }
  }

  if (lotReport.status !== 'open') {
    return { error: 'Only open stock lots can be closed.' }
  }

  if (lotReport.missingCompanyRates.length > 0) {
    const preview = lotReport.missingCompanyRates.slice(0, 4).join(', ')
    return {
      error: `Cannot close this stock inward until company rates are configured for: ${preview}${lotReport.missingCompanyRates.length > 4 ? '...' : ''}`
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const closedAt = new Date().toISOString()
  const snapshot = {
    report_date: lotReport.entryDate,
    raw_weight_kg: lotReport.rawWeightKg,
    processed_weight_kg: lotReport.processedWeightKg,
    balance_weight_kg: lotReport.balanceWeightKg,
    variation_weight_kg: lotReport.variationWeightKg,
    yield_percent: lotReport.yieldPercent,
    worker_payout_total: lotReport.workerPayoutTotal,
    company_payout_total: lotReport.companyPayoutTotal,
    net_amount: lotReport.netAmount,
    avg_worker_rate: lotReport.avgWorkerRate,
    avg_company_rate: lotReport.avgCompanyRate,
    processing_entries_count: lotReport.processingEntriesCount,
    workers_count: lotReport.workersCount,
  }

  const { error } = await supabase
    .from('processing_lots')
    .update({
      status: 'closed',
      closed_reason: reason,
      closed_at: closedAt,
      closed_by: user?.id || null,
    })
    .eq('lot_id', lotId)
    .eq('status', 'open')

  if (error) return { error: error.message }

  await supabase.from('processing_lot_actions').insert({
    lot_id: lotId,
    action: 'close',
    reason,
    changed_by: user?.id || null,
    meta: {
      snapshot,
      closed_at: closedAt,
    },
  })

  revalidatePath('/admin/ops/stock-lots')
  revalidatePath('/admin/reports/day-end')
  revalidatePath('/admin/reports/lot-closure')
  revalidatePath('/admin/reports/profitability')
  revalidatePath('/admin/reports/reconciliation')
  revalidatePath('/admin/exports')
  revalidatePath('/accounting/exports')
  return { success: true }
}

export async function reopenStockLot(lotId: string, reason: string) {
  const supabase = await createClient()

  if (!reason.trim()) {
    return { error: 'Reason is required' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('processing_lots')
    .update({
      status: 'open',
      closed_reason: null,
      closed_at: null,
      closed_by: null,
    })
    .eq('lot_id', lotId)
    .eq('status', 'closed')

  if (error) return { error: error.message }

  await supabase.from('processing_lot_actions').insert({
    lot_id: lotId,
    action: 'reopen',
    reason,
    changed_by: user?.id || null,
  })

  revalidatePath('/admin/ops/stock-lots')
  revalidatePath('/admin/reports/day-end')
  revalidatePath('/admin/reports/lot-closure')
  revalidatePath('/admin/reports/profitability')
  revalidatePath('/admin/reports/reconciliation')
  revalidatePath('/admin/exports')
  revalidatePath('/accounting/exports')
  return { success: true }
}
