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

export default async function AccountingReportsPage() {
  const supabase = await createClient()
  const { dayReports } = await getOperationalReports(supabase as never, { status: 'all' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Daily summary reporting with payout cross-checks.</p>
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
                  <TableCell>{row.reportDate}</TableCell>
                  <TableCell className="text-right">{row.totalStockInwardKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.totalProcessedKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.totalVariationKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.avgYieldPercent.toFixed(2)}%</TableCell>
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
