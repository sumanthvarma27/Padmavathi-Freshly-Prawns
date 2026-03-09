'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Lookup = { id: string; name: string }

type StockInwardRecord = {
  inward_id?: string
  stock_inward_id?: string
  entry_date?: string
  inward_date?: string
  company_id?: string
  shed_id?: string
  raw_weight_kg?: number
  created_at?: string
  notes?: string
  remarks?: string
  companies?: { name?: string } | null
  sheds?: { name?: string } | null
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function resolveEntryDate(row: StockInwardRecord) {
  return row.entry_date || row.inward_date || row.created_at || ''
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function StockInwardTable({
  rows,
  sheds,
  companies,
}: {
  rows: StockInwardRecord[]
  sheds: Lookup[]
  companies: Lookup[]
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [shedId, setShedId] = useState('all')
  const [companyId, setCompanyId] = useState('all')

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (shedId !== 'all' && row.shed_id !== shedId) return false
      if (companyId !== 'all' && row.company_id !== companyId) return false

      const date = formatDate(resolveEntryDate(row))
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    })
  }, [rows, shedId, companyId, startDate, endDate])

  const onExport = () => {
    const headers = ['Date', 'Company', 'Shed', 'Raw Weight (kg)', 'Notes']
    const csvRows = filteredRows.map((row) => [
      formatDate(resolveEntryDate(row)),
      row.companies?.name || '-',
      row.sheds?.name || '-',
      String(Number(row.raw_weight_kg || 0).toFixed(2)),
      row.notes || row.remarks || '-',
    ])
    downloadCsv(`stock_inward_${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Shed</Label>
            <Select value={shedId} onValueChange={setShedId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sheds</SelectItem>
                {sheds.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {filteredRows.length} records</p>
        <Button onClick={onExport} disabled={filteredRows.length === 0} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead className="text-right">Raw Weight (kg)</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No stock inward records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, i) => (
                <TableRow key={row.stock_inward_id || row.inward_id || i}>
                  <TableCell>{formatDate(resolveEntryDate(row))}</TableCell>
                  <TableCell>{row.companies?.name || '-'}</TableCell>
                  <TableCell>{row.sheds?.name || '-'}</TableCell>
                  <TableCell className="text-right">{Number(row.raw_weight_kg || 0).toFixed(2)}</TableCell>
                  <TableCell>{row.notes || row.remarks || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
