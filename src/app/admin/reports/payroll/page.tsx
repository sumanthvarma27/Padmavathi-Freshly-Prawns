import { createClient } from '@/lib/supabase/server'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function PayrollReportPage() {
  const supabase = await createClient()

  const { data: processing } = await supabase
    .from('processing_entries')
    .select('batch_id,processed_weight_kg,amount_snapshot,batches(batch_code,batch_name,leader_name)')

  const totals = new Map<string, { batch: string; leader: string; entries: number; weight: number; amount: number }>()

  ;(processing || []).forEach((row: any) => {
    const key = row.batch_id || 'unknown'
    const current = totals.get(key) || {
      batch: row.batches?.batch_code || row.batches?.batch_name || 'Unknown Batch',
      leader: row.batches?.leader_name || '-',
      entries: 0,
      weight: 0,
      amount: 0,
    }

    current.entries += 1
    current.weight += Number(row.processed_weight_kg || 0)
    current.amount += Number(row.amount_snapshot || 0)
    totals.set(key, current)
  })

  const rows = Array.from(totals.values()).sort((a, b) => b.amount - a.amount)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Summary</h1>
        <p className="text-muted-foreground">Batch-level payouts computed from processing entry snapshots.</p>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Leader</TableHead>
              <TableHead className="text-right">Entries</TableHead>
              <TableHead className="text-right">Processed (kg)</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No payroll data available.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.batch}-${row.leader}`}>
                  <TableCell>{row.batch}</TableCell>
                  <TableCell>{row.leader}</TableCell>
                  <TableCell className="text-right">{row.entries}</TableCell>
                  <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{row.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
