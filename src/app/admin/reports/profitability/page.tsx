import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PrintButton from '@/components/reports/print-button'

type SearchParams = {
  start?: string
  end?: string
  status?: string
}

export default async function ProfitabilityReportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const resolvedParams = (searchParams && typeof (searchParams as Promise<SearchParams>).then === 'function')
    ? await (searchParams as Promise<SearchParams>)
    : ((searchParams || {}) as SearchParams)

  const supabase = await createClient()
  const status = resolvedParams.status === 'open' || resolvedParams.status === 'closed'
    ? resolvedParams.status
    : 'all'

  const { lotReports, dayReports } = await getOperationalReports(supabase as never, {
    status,
    startDate: resolvedParams.start || undefined,
    endDate: resolvedParams.end || undefined,
  })

  const grand = lotReports.reduce(
    (acc, lot) => {
      acc.raw += lot.rawWeightKg
      acc.processed += lot.processedWeightKg
      acc.worker += lot.workerPayoutTotal
      acc.company += lot.companyPayoutTotal
      acc.net += lot.netAmount
      return acc
    },
    { raw: 0, processed: 0, worker: 0, company: 0, net: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profitability by Stock Inward</h1>
          <p className="text-muted-foreground">
            Company payout is now calculated from configured company rates by processing type and count range.
          </p>
        </div>
        <PrintButton />
      </div>

      <form className="rounded-md border bg-white p-4 grid gap-3 md:grid-cols-4" method="get">
        <div className="grid gap-1.5">
          <Label>Start Date</Label>
          <Input type="date" name="start" defaultValue={resolvedParams.start || ''} />
        </div>
        <div className="grid gap-1.5">
          <Label>End Date</Label>
          <Input type="date" name="end" defaultValue={resolvedParams.end || ''} />
        </div>
        <div className="grid gap-1.5">
          <Label>Status</Label>
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All lots</option>
            <option value="open">Open only</option>
            <option value="closed">Closed only</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" asChild>
            <a href="/admin/reports/profitability">Clear</a>
          </Button>
        </div>
      </form>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead className="text-right">Raw (kg)</TableHead>
              <TableHead className="text-right">Processed (kg)</TableHead>
              <TableHead className="text-right">Yield %</TableHead>
              <TableHead className="text-right">Worker Payout</TableHead>
              <TableHead className="text-right">Company Payout</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">No stock inward lots in selected filters.</TableCell>
              </TableRow>
            ) : (
              lotReports.map((lot) => (
                <TableRow key={lot.lotId}>
                  <TableCell>{lot.entryDate}</TableCell>
                  <TableCell className="font-mono text-xs">{lot.lotId.slice(0, 8)}</TableCell>
                  <TableCell>{lot.companyName}</TableCell>
                  <TableCell>{lot.shedName}</TableCell>
                  <TableCell className="text-right">{lot.rawWeightKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{lot.processedWeightKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{lot.yieldPercent.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{lot.workerPayoutTotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{lot.companyPayoutTotal.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${lot.netAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {lot.netAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>{lot.status}</TableCell>
                </TableRow>
              ))
            )}
            {lotReports.length > 0 ? (
              <TableRow className="bg-slate-50 font-semibold">
                <TableCell colSpan={4}>Grand Total</TableCell>
                <TableCell className="text-right">{grand.raw.toFixed(2)}</TableCell>
                <TableCell className="text-right">{grand.processed.toFixed(2)}</TableCell>
                <TableCell className="text-right">{grand.raw > 0 ? ((grand.processed / grand.raw) * 100).toFixed(2) : '0.00'}%</TableCell>
                <TableCell className="text-right">{grand.worker.toFixed(2)}</TableCell>
                <TableCell className="text-right">{grand.company.toFixed(2)}</TableCell>
                <TableCell className={`text-right ${grand.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{grand.net.toFixed(2)}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Raw</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead className="text-right">Worker Payout</TableHead>
              <TableHead className="text-right">Company Payout</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dayReports.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">No day totals.</TableCell></TableRow>
            ) : (
              dayReports.map((day) => (
                <TableRow key={day.reportDate}>
                  <TableCell>{day.reportDate}</TableCell>
                  <TableCell className="text-right">{day.totalStockInwardKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{day.totalProcessedKg.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{day.totalWorkerPayout.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{day.totalCompanyPayout.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${day.netAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {day.netAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
