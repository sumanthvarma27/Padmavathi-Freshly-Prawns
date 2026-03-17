import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PrintButton from '@/components/reports/print-button'

export default async function DailySummaryPage() {
  const supabase = await createClient()
  const { dayReports } = await getOperationalReports(supabase as never, { status: 'all' })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Summary</h1>
          <p className="text-muted-foreground">Closed-day raw vs processed totals with payout and yield summary.</p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Raw (kg)</TableHead>
              <TableHead className="text-right">Processed (kg)</TableHead>
              <TableHead className="text-right">Diff (kg)</TableHead>
              <TableHead className="text-right">Yield %</TableHead>
              <TableHead className="text-right">Worker Payout</TableHead>
              <TableHead className="text-right">Company Payout</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dayReports.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No closed day reports available.</TableCell></TableRow>
            ) : (
              dayReports.map((row) => (
                <TableRow key={row.reportDate}>
                  <TableCell className="font-medium">{row.reportDate}</TableCell>
                  <TableCell className="text-right">{row.totalStockInwardKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{row.totalProcessedKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-amber-700">{row.totalVariationKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-purple-700">{row.avgYieldPercent.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{row.totalWorkerPayout.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.totalCompanyPayout.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.netAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{row.netAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
