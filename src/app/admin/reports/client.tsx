'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import PrintButton from '@/components/reports/print-button'

type DailySummary = {
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

type CompanyOption = { company_id: string; name: string }
type ShedOption = { shed_id: string; name: string }

export default function ReportsClient({
  data,
  sheds,
  companies,
  hasError
}: {
  data: DailySummary[]
  sheds: ShedOption[]
  companies: CompanyOption[]
  hasError: boolean
}) {
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterShed, setFilterShed] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const filteredData = data.filter(row => {
    if (filterCompany !== 'all' && row.company_id !== filterCompany) return false
    if (filterShed !== 'all' && row.shed_id !== filterShed) return false
    if (startDate && row.summary_date < startDate) return false
    if (endDate && row.summary_date > endDate) return false
    return true
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label>Date Range (Start)</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label>Date Range (End)</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label>Company</Label>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label>Shed</Label>
            <Select value={filterShed} onValueChange={setFilterShed}>
              <SelectTrigger>
                <SelectValue placeholder="All Sheds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sheds</SelectItem>
                {sheds.map(s => <SelectItem key={s.shed_id} value={s.shed_id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredData.length} records
        </p>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead className="text-right">Raw (kg)</TableHead>
              <TableHead className="text-right text-emerald-700">Processed (kg)</TableHead>
              <TableHead className="text-right text-red-600">Loss/Diff (kg)</TableHead>
              <TableHead className="text-right text-purple-700">Yield %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasError ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-red-500 bg-red-50/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-6 w-6" />
                    <p className="font-semibold">Database View Missing</p>
                    <p className="text-sm">Cannot load daily summary report. The view `v_daily_summary` might not have been created yet or isn&apos;t accessible to the API.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No summary data matches the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.summary_date}</TableCell>
                  <TableCell>{row.company_name || 'N/A'}</TableCell>
                  <TableCell>{row.shed_name || 'N/A'}</TableCell>
                  <TableCell className="text-right">{Number(row.raw_weight_kg || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-700 bg-emerald-50/10">
                    {Number(row.processed_weight_kg || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {Number(row.diff_kg || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-purple-700">
                    {Number(row.yield_percent || 0).toFixed(2)}%
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
