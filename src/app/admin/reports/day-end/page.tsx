import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
import { Button } from '@/components/ui/button'
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

type SearchParams = {
  date?: string
}

export default async function DayEndReportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const resolvedParams = (searchParams && typeof (searchParams as Promise<SearchParams>).then === 'function')
    ? await (searchParams as Promise<SearchParams>)
    : ((searchParams || {}) as SearchParams)

  const supabase = await createClient()
  const { dayReports } = await getOperationalReports(supabase as never, { status: 'all' })

  const selectedDate = resolvedParams.date || dayReports[0]?.reportDate || ''
  const selectedReport = dayReports.find((report) => report.reportDate === selectedDate) || dayReports[0] || null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Day-End Processing Report</h1>
          <p className="text-muted-foreground">
            Final closed-lot cross-check for admin, grouped by closed date and shed.
          </p>
        </div>
        <PrintButton />
      </div>

      <form className="rounded-md border bg-white p-4 flex flex-wrap items-end gap-3" method="get">
        <div className="grid gap-1.5 min-w-[240px]">
          <label className="text-sm font-medium">Closed Date</label>
          <select
            name="date"
            defaultValue={selectedDate}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {dayReports.map((report) => (
              <option key={report.reportDate} value={report.reportDate}>
                {report.reportDate}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Load Report</Button>
      </form>

      {!selectedReport ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No closed stock inward reports yet. Close a lot to generate a day-end report.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card><CardHeader><CardTitle>Total Stock Inward</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{selectedReport.totalStockInwardKg.toFixed(2)} kg</CardContent></Card>
            <Card><CardHeader><CardTitle>Total Processed</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-emerald-700">{selectedReport.totalProcessedKg.toFixed(2)} kg</CardContent></Card>
            <Card><CardHeader><CardTitle>Total Variation</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-700">{selectedReport.totalVariationKg.toFixed(2)} kg</CardContent></Card>
            <Card><CardHeader><CardTitle>Worker Payout</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rs. {selectedReport.totalWorkerPayout.toFixed(2)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Company Payout</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rs. {selectedReport.totalCompanyPayout.toFixed(2)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Avg Yield Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{selectedReport.avgYieldPercent.toFixed(2)}%</CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock Inward</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Shed</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">Raw (kg)</TableHead>
                    <TableHead className="text-right">Processed (kg)</TableHead>
                    <TableHead className="text-right">Variation (kg)</TableHead>
                    <TableHead className="text-right">Yield %</TableHead>
                    <TableHead className="text-right">Worker Payout</TableHead>
                    <TableHead className="text-right">Company Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReport.lotReports.map((lot) => (
                    <TableRow key={lot.lotId}>
                      <TableCell>{lot.companyName}</TableCell>
                      <TableCell>{lot.shedName}</TableCell>
                      <TableCell>
                        <Link className="text-emerald-700 underline" href={`/admin/reports/lot-closure?lot=${lot.lotId}`}>
                          {lot.lotId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{lot.rawWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{lot.processedWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{lot.variationWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{lot.yieldPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{lot.workerPayoutTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{lot.companyPayoutTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedReport.entriesByShed.map((shed) => (
            <Card key={shed.shedId}>
              <CardHeader>
                <CardTitle>{shed.shedName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Process Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Output (kg)</TableHead>
                      <TableHead className="text-right">Worker Rate</TableHead>
                      <TableHead className="text-right">Worker Payout</TableHead>
                      <TableHead className="text-right">Company Rate</TableHead>
                      <TableHead className="text-right">Company Payout</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shed.entries.map((entry) => (
                      <TableRow key={entry.entryId}>
                        <TableCell>{entry.batchLabel}</TableCell>
                        <TableCell>{entry.companyName}</TableCell>
                        <TableCell>{entry.processingTypeName}</TableCell>
                        <TableCell>{entry.countRangeLabel}</TableCell>
                        <TableCell className="text-right">{entry.processedWeightKg.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{entry.workerRatePerKg.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{entry.workerPayout.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{entry.companyRatePerKg == null ? '-' : entry.companyRatePerKg.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{entry.companyPayout == null ? '-' : entry.companyPayout.toFixed(2)}</TableCell>
                        <TableCell>{entry.createdTimeLabel}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={4}>{shed.shedName} Total</TableCell>
                      <TableCell className="text-right">{shed.totalProcessedKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{shed.totalWorkerPayout.toFixed(2)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{shed.totalCompanyPayout.toFixed(2)}</TableCell>
                      <TableCell>{shed.avgYieldPercent.toFixed(2)}% yield</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Company Cross Check</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Raw (kg)</TableHead>
                    <TableHead className="text-right">Processed (kg)</TableHead>
                    <TableHead className="text-right">Worker Payout</TableHead>
                    <TableHead className="text-right">Company Payout</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReport.companyTotals.map((company) => (
                    <TableRow key={company.companyId}>
                      <TableCell>{company.companyName}</TableCell>
                      <TableCell className="text-right">{company.rawWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{company.processedWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{company.workerPayout.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{company.companyPayout.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-semibold ${company.netAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {company.netAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
