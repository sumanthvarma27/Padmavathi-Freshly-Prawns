import { createClient } from '@/lib/supabase/server'
import ExportHub from '@/components/exports/export-hub'

function toDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString().slice(0, 10)
}

export default async function AdminExportsPage() {
  const supabase = await createClient()

  const [{ data: stock }, { data: processing }, { data: summary }] = await Promise.all([
    supabase
      .from('stock_inward')
      .select('*,companies(name),sheds(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('processing_entries')
      .select('*,companies(name),sheds(name),batches(batch_code,batch_name,leader_name),processing_types(name),count_ranges(label)')
      .order('created_at', { ascending: false }),
    supabase
      .from('v_daily_summary')
      .select('*')
      .order('summary_date', { ascending: false }),
  ])

  const payrollMap = new Map<string, { batch: string; leader: string; entries: number; weight: number; amount: number }>()
  ;(processing || []).forEach((row: any) => {
    const batchId = row.batch_id || 'unknown'
    const current = payrollMap.get(batchId) || {
      batch: row.batches?.batch_code || row.batches?.batch_name || 'Unknown Batch',
      leader: row.batches?.leader_name || '-',
      entries: 0,
      weight: 0,
      amount: 0,
    }

    current.entries += 1
    current.weight += Number(row.processed_weight_kg || 0)
    current.amount += Number(row.amount_snapshot || 0)
    payrollMap.set(batchId, current)
  })

  const payrollRows = Array.from(payrollMap.values()).sort((a, b) => b.amount - a.amount)

  const exportsList = [
    {
      key: 'stock-inward',
      title: 'Stock Inward CSV',
      description: 'Date, company, shed, raw weights.',
      filenamePrefix: 'stock_inward',
      headers: ['Date', 'Company', 'Shed', 'Raw Weight (kg)'],
      rows: (stock || []).map((row: any) => [
        toDate(row.entry_date || row.inward_date || row.created_at),
        row.companies?.name || '-',
        row.sheds?.name || '-',
        Number(row.raw_weight_kg || 0).toFixed(2),
      ]),
    },
    {
      key: 'processing-entries',
      title: 'Processing Entries CSV',
      description: 'All processing rows with snapshot rate and amount.',
      filenamePrefix: 'processing_entries',
      headers: ['Date', 'Company', 'Shed', 'Batch', 'Type', 'Count', 'Processed (kg)', 'Rate', 'Amount'],
      rows: (processing || []).map((row: any) => [
        toDate(row.entry_date || row.created_at),
        row.companies?.name || '-',
        row.sheds?.name || '-',
        row.batches?.batch_code || row.batches?.batch_name || '-',
        row.processing_types?.name || '-',
        row.count_ranges?.label || '-',
        Number(row.processed_weight_kg || 0).toFixed(2),
        Number(row.rate_per_kg_snapshot || 0).toFixed(2),
        Number(row.amount_snapshot || 0).toFixed(2),
      ]),
    },
    {
      key: 'payroll-summary',
      title: 'Payroll Summary CSV',
      description: 'Batch-level payout summary from amount snapshots.',
      filenamePrefix: 'payroll_summary',
      headers: ['Batch', 'Leader', 'Entries', 'Processed (kg)', 'Total Amount'],
      rows: payrollRows.map((row) => [
        row.batch,
        row.leader,
        String(row.entries),
        row.weight.toFixed(2),
        row.amount.toFixed(2),
      ]),
    },
    {
      key: 'daily-summary',
      title: 'Daily Summary CSV',
      description: 'Raw vs processed and yield percentages.',
      filenamePrefix: 'daily_summary',
      headers: ['Date', 'Company', 'Shed', 'Raw (kg)', 'Processed (kg)', 'Diff (kg)', 'Yield %'],
      rows: (summary || []).map((row: any) => [
        toDate(row.summary_date),
        row.company_name || '-',
        row.shed_name || '-',
        Number(row.raw_weight_kg || 0).toFixed(2),
        Number(row.processed_weight_kg || 0).toFixed(2),
        Number(row.diff_kg || 0).toFixed(2),
        Number(row.yield_percent || 0).toFixed(2),
      ]),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exports</h1>
        <p className="text-muted-foreground">Download accounting-ready CSV files.</p>
      </div>
      <ExportHub exportsList={exportsList} />
    </div>
  )
}
