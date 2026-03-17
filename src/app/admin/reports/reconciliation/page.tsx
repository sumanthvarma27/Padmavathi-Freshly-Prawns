import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
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

export default async function ReconciliationReportPage() {
  const supabase = await createClient()
  const { dayReports } = await getOperationalReports(supabase as never, { status: 'all' })

  const totalRaw = dayReports.reduce((sum, row) => sum + row.totalStockInwardKg, 0)
  const totalProcessed = dayReports.reduce((sum, row) => sum + row.totalProcessedKg, 0)
  const totalWorkerPayout = dayReports.reduce((sum, row) => sum + row.totalWorkerPayout, 0)
  const totalCompanyPayout = dayReports.reduce((sum, row) => sum + row.totalCompanyPayout, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reconciliation</h1>
          <p className="text-muted-foreground">Raw vs processed vs worker payout vs company payout variance overview.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Total Raw (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalRaw.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Processed (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalProcessed.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Worker Payout</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalWorkerPayout.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Company Payout</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalCompanyPayout.toFixed(2)}</CardContent></Card>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Raw</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead className="text-right">Yield %</TableHead>
              <TableHead className="text-right">Worker Payout</TableHead>
              <TableHead className="text-right">Company Payout</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Lots</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dayReports.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No closed day reports yet.</TableCell></TableRow>
            ) : (
              dayReports.map((row) => (
                <TableRow key={row.reportDate}>
                  <TableCell>{row.reportDate}</TableCell>
                  <TableCell className="text-right">{row.totalStockInwardKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.totalProcessedKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.totalVariationKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.avgYieldPercent.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{row.totalWorkerPayout.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.totalCompanyPayout.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.netAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {row.netAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{row.lotReports.length}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
