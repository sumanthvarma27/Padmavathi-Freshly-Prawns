import { createClient } from '@/lib/supabase/server'
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
  shed?: string
  company?: string
}

type CompanyRateRow = {
  company_id: string
  rate_per_kg: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
}

type CompanyRow = { company_id: string; name: string }
type ShedRow = { shed_id: string; name: string }
type LotRow = {
  lot_id: string
  entry_date: string
  company_id: string
  shed_id: string
  raw_weight_kg: number
  processed_weight_kg: number
  status: string
}
type ProcessingEntryRow = { lot_id: string | null; amount_snapshot: number | null }

function toYmd(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function getRateForDate(rates: CompanyRateRow[], date: string): number | null {
  const target = new Date(`${date}T00:00:00Z`).getTime()
  for (const row of rates) {
    const from = new Date(row.effective_from).getTime()
    const to = row.effective_to ? new Date(row.effective_to).getTime() : Number.POSITIVE_INFINITY
    if (target >= from && target < to) {
      return Number(row.rate_per_kg || 0)
    }
  }
  return null
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

  const start = resolvedParams.start || ''
  const end = resolvedParams.end || ''
  const shedFilter = resolvedParams.shed || 'all'
  const companyFilter = resolvedParams.company || 'all'

  const [{ data: companies }, { data: sheds }, lotsRes, peRes, crRes] = await Promise.all([
    supabase.from('companies').select('company_id,name').order('name'),
    supabase.from('sheds').select('shed_id,name').order('name'),
    supabase.from('processing_lots').select('*').order('entry_date', { ascending: false }),
    supabase.from('processing_entries').select('lot_id,amount_snapshot'),
    supabase
      .from('company_rates')
      .select('company_id,rate_per_kg,effective_from,effective_to,is_active')
      .eq('is_active', true)
      .order('effective_from', { ascending: false }),
  ])

  const companyNameById = new Map(((companies as CompanyRow[] | null) || []).map((c) => [c.company_id, c.name]))
  const shedNameById = new Map(((sheds as ShedRow[] | null) || []).map((s) => [s.shed_id, s.name]))

  const payrollByLot = new Map<string, number>()
  for (const row of ((peRes.data as ProcessingEntryRow[] | null) || [])) {
    if (!row.lot_id) continue
    payrollByLot.set(row.lot_id, (payrollByLot.get(row.lot_id) || 0) + Number(row.amount_snapshot || 0))
  }

  const ratesByCompany = new Map<string, CompanyRateRow[]>()
  for (const row of ((crRes.data as CompanyRateRow[] | null) || [])) {
    const key = row.company_id
    const list = ratesByCompany.get(key) || []
    list.push(row as CompanyRateRow)
    ratesByCompany.set(key, list)
  }

  const sampleRate = 420

  const rows = (((lotsRes.data as LotRow[] | null) || []))
    .filter((lot) => {
      const date = toYmd(lot.entry_date)
      if (start && date < start) return false
      if (end && date > end) return false
      if (shedFilter !== 'all' && lot.shed_id !== shedFilter) return false
      if (companyFilter !== 'all' && lot.company_id !== companyFilter) return false
      return true
    })
    .map((lot) => {
      const processed = Number(lot.processed_weight_kg || 0)
      const raw = Number(lot.raw_weight_kg || 0)
      const payroll = Number((payrollByLot.get(lot.lot_id) || 0).toFixed(2))

      const companyRates = ratesByCompany.get(lot.company_id) || []
      const appliedRate = getRateForDate(companyRates, toYmd(lot.entry_date))
      const companyRate = appliedRate ?? sampleRate
      const rateSource = appliedRate == null ? 'Sample' : 'Configured'

      const revenue = Number((processed * companyRate).toFixed(2))
      const profitLoss = Number((revenue - payroll).toFixed(2))
      const yieldPct = raw > 0 ? Number(((processed / raw) * 100).toFixed(2)) : 0

      return {
        lotId: lot.lot_id,
        date: toYmd(lot.entry_date),
        companyName: companyNameById.get(lot.company_id) || lot.company_id,
        shedName: shedNameById.get(lot.shed_id) || lot.shed_id,
        raw,
        processed,
        payroll,
        companyRate,
        revenue,
        profitLoss,
        yieldPct,
        status: lot.status,
        rateSource,
      }
    })

  const grand = rows.reduce(
    (acc, row) => {
      acc.raw += row.raw
      acc.processed += row.processed
      acc.payroll += row.payroll
      acc.revenue += row.revenue
      acc.profitLoss += row.profitLoss
      return acc
    },
    { raw: 0, processed: 0, payroll: 0, revenue: 0, profitLoss: 0 }
  )

  const dayTotalsMap = new Map<string, { raw: number; processed: number; payroll: number; revenue: number; profitLoss: number }>()
  for (const row of rows) {
    const day = dayTotalsMap.get(row.date) || { raw: 0, processed: 0, payroll: 0, revenue: 0, profitLoss: 0 }
    day.raw += row.raw
    day.processed += row.processed
    day.payroll += row.payroll
    day.revenue += row.revenue
    day.profitLoss += row.profitLoss
    dayTotalsMap.set(row.date, day)
  }

  const dayTotals = Array.from(dayTotalsMap.entries())
    .map(([date, t]) => ({ date, ...t }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profitability by Stock Inward</h1>
          <p className="text-muted-foreground">
            Per lot payroll vs company value with profit/loss. Includes day totals and grand total.
          </p>
        </div>
        <PrintButton />
      </div>

      <form className="rounded-md border bg-white p-4 grid gap-3 md:grid-cols-5" method="get">
        <div className="grid gap-1.5">
          <Label>Start Date</Label>
          <Input type="date" name="start" defaultValue={start} />
        </div>
        <div className="grid gap-1.5">
          <Label>End Date</Label>
          <Input type="date" name="end" defaultValue={end} />
        </div>
        <div className="grid gap-1.5">
          <Label>Shed ID</Label>
          <Input name="shed" placeholder="all" defaultValue={shedFilter === 'all' ? '' : shedFilter} />
        </div>
        <div className="grid gap-1.5">
          <Label>Company ID</Label>
          <Input name="company" placeholder="all" defaultValue={companyFilter === 'all' ? '' : companyFilter} />
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
              <TableHead className="text-right">Payroll</TableHead>
              <TableHead className="text-right">Company Rate</TableHead>
              <TableHead>Rate Source</TableHead>
              <TableHead className="text-right">Company Value</TableHead>
              <TableHead className="text-right">Profit/Loss</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">No stock inward lots in selected filters.</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.lotId}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="font-mono text-xs">{row.lotId.slice(0, 8)}</TableCell>
                  <TableCell>{row.companyName}</TableCell>
                  <TableCell>{row.shedName}</TableCell>
                  <TableCell className="text-right">{row.raw.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.processed.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.yieldPct.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{row.payroll.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.companyRate.toFixed(2)}</TableCell>
                  <TableCell>{row.rateSource}</TableCell>
                  <TableCell className="text-right">{row.revenue.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.profitLoss >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {row.profitLoss.toFixed(2)}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            )}

            {rows.length > 0 ? (
              <TableRow className="bg-slate-50 font-semibold">
                <TableCell colSpan={4}>Grand Total</TableCell>
                <TableCell className="text-right">{grand.raw.toFixed(2)}</TableCell>
                <TableCell className="text-right">{grand.processed.toFixed(2)}</TableCell>
                <TableCell className="text-right">{grand.raw > 0 ? ((grand.processed / grand.raw) * 100).toFixed(2) : '0.00'}%</TableCell>
                <TableCell className="text-right">{grand.payroll.toFixed(2)}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{grand.revenue.toFixed(2)}</TableCell>
                <TableCell className={`text-right ${grand.profitLoss >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {grand.profitLoss.toFixed(2)}
                </TableCell>
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
              <TableHead className="text-right">Payroll</TableHead>
              <TableHead className="text-right">Company Value</TableHead>
              <TableHead className="text-right">Profit/Loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dayTotals.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">No day totals.</TableCell></TableRow>
            ) : (
              dayTotals.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{day.date}</TableCell>
                  <TableCell className="text-right">{day.raw.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{day.processed.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{day.payroll.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{day.revenue.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${day.profitLoss >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {day.profitLoss.toFixed(2)}
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
