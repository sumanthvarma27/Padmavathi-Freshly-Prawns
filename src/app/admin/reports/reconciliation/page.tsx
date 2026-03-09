import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PrintButton from '@/components/reports/print-button'

type DailySummaryRow = {
  summary_date: string
  company_id: string
  shed_id: string
  company_name: string
  shed_name: string
  raw_weight_kg: number
  processed_weight_kg: number
  diff_kg: number
  yield_percent: number
}

export default async function ReconciliationReportPage() {
  const supabase = await createClient()

  const [{ data: summary }] = await Promise.all([
    supabase.from('v_daily_summary').select('*').order('summary_date', { ascending: false }).limit(100),
  ])

  const totalRaw = ((summary as DailySummaryRow[] | null) || []).reduce((sum: number, r) => sum + Number(r.raw_weight_kg || 0), 0)
  const totalProcessed = ((summary as DailySummaryRow[] | null) || []).reduce((sum: number, r) => sum + Number(r.processed_weight_kg || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Reconciliation</h1>
        <p className="text-muted-foreground">Raw vs processed vs paid variance overview.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total Raw (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalRaw.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Processed (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalProcessed.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Variance (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{(totalRaw - totalProcessed).toFixed(2)}</CardContent></Card>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead className="text-right">Raw</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead className="text-right">Yield %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(summary || []).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No summary rows.</TableCell></TableRow>
            ) : (
              ((summary as DailySummaryRow[] | null) || []).map((row, i: number) => (
                <TableRow key={`${row.summary_date}-${row.company_id}-${row.shed_id}-${i}`}>
                  <TableCell>{row.summary_date}</TableCell>
                  <TableCell>{row.company_name || '-'}</TableCell>
                  <TableCell>{row.shed_name || '-'}</TableCell>
                  <TableCell className="text-right">{Number(row.raw_weight_kg || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(row.processed_weight_kg || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(row.diff_kg || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(row.yield_percent || 0).toFixed(2)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
