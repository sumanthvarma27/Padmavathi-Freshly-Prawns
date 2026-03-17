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
  lot?: string
}

export default async function LotClosureReportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const resolvedParams = (searchParams && typeof (searchParams as Promise<SearchParams>).then === 'function')
    ? await (searchParams as Promise<SearchParams>)
    : ((searchParams || {}) as SearchParams)

  const supabase = await createClient()
  const { closedLotReports } = await getOperationalReports(supabase as never, { status: 'all' })

  const selectedLotId = resolvedParams.lot || closedLotReports[0]?.lotId || ''
  const selectedLot = closedLotReports.find((lot) => lot.lotId === selectedLotId) || closedLotReports[0] || null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Closed Lot Report</h1>
          <p className="text-muted-foreground">
            Individual closure report for stock inward, worker payout, and company payout cross-check.
          </p>
        </div>
        <PrintButton />
      </div>

      <form className="rounded-md border bg-white p-4 flex flex-wrap items-end gap-3" method="get">
        <div className="grid gap-1.5 min-w-[280px]">
          <label className="text-sm font-medium">Closed Lot</label>
          <select
            name="lot"
            defaultValue={selectedLotId}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {closedLotReports.map((lot) => (
              <option key={lot.lotId} value={lot.lotId}>
                {lot.entryDate} | {lot.companyName} | {lot.shedName} | {lot.lotId.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Load Report</Button>
      </form>

      {!selectedLot ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No closed stock lots available yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Card><CardHeader><CardTitle>Raw Weight</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{selectedLot.rawWeightKg.toFixed(2)} kg</CardContent></Card>
            <Card><CardHeader><CardTitle>Processed Weight</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-emerald-700">{selectedLot.processedWeightKg.toFixed(2)} kg</CardContent></Card>
            <Card><CardHeader><CardTitle>Variation</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-700">{selectedLot.variationWeightKg.toFixed(2)} kg</CardContent></Card>
            <Card><CardHeader><CardTitle>Yield</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{selectedLot.yieldPercent.toFixed(2)}%</CardContent></Card>
            <Card><CardHeader><CardTitle>Worker Payout</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rs. {selectedLot.workerPayoutTotal.toFixed(2)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Company Payout</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rs. {selectedLot.companyPayoutTotal.toFixed(2)}</CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lot Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
              <div><span className="font-semibold">Entry Date:</span> {selectedLot.entryDate}</div>
              <div><span className="font-semibold">Closed Date:</span> {selectedLot.closedDate}</div>
              <div><span className="font-semibold">Company:</span> {selectedLot.companyName}</div>
              <div><span className="font-semibold">Shed:</span> {selectedLot.shedName}</div>
              <div><span className="font-semibold">Lot ID:</span> {selectedLot.lotId}</div>
              <div><span className="font-semibold">Status:</span> {selectedLot.status}</div>
              <div><span className="font-semibold">Entries:</span> {selectedLot.processingEntriesCount}</div>
              <div><span className="font-semibold">Workers:</span> {selectedLot.workersCount}</div>
              <div className="xl:col-span-4"><span className="font-semibold">Close Reason:</span> {selectedLot.closedReason || '-'}</div>
            </CardContent>
          </Card>

          {selectedLot.missingCompanyRates.length > 0 ? (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="py-4 text-amber-900">
                Missing company rates: {selectedLot.missingCompanyRates.join(', ')}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Processing Entries</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Leader</TableHead>
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
                  {selectedLot.entries.map((entry) => (
                    <TableRow key={entry.entryId}>
                      <TableCell>{entry.batchLabel}</TableCell>
                      <TableCell>{entry.leaderName}</TableCell>
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
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell className="text-right">{selectedLot.processedWeightKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{selectedLot.avgWorkerRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{selectedLot.workerPayoutTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{selectedLot.avgCompanyRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{selectedLot.companyPayoutTotal.toFixed(2)}</TableCell>
                    <TableCell>{selectedLot.netAmount.toFixed(2)} net</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Worker Payout by Member</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Processed (kg)</TableHead>
                    <TableHead className="text-right">Payout Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedLot.memberPayouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No member splits recorded.</TableCell>
                    </TableRow>
                  ) : (
                    selectedLot.memberPayouts.map((member) => (
                      <TableRow key={member.memberId}>
                        <TableCell>{member.memberName}</TableCell>
                        <TableCell>{member.batchLabel}</TableCell>
                        <TableCell className="text-right">{member.processedWeightKg.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">{member.payoutAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
