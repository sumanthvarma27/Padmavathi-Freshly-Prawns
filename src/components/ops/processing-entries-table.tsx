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

type ProcessingEntry = {
  processing_entry_id?: string
  entry_date?: string
  processed_weight_kg?: number
  rate_per_kg_snapshot?: number
  amount_snapshot?: number
  company_id?: string
  shed_id?: string
  batch_id?: string
  processing_type_id?: string
  count_range_id?: string
  created_at?: string
  companies?: { name?: string } | null
  sheds?: { name?: string } | null
  batches?: { batch_code?: string; batch_name?: string } | null
  processing_types?: { name?: string } | null
  count_ranges?: { label?: string } | null
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function resolveDate(row: ProcessingEntry) {
  return row.entry_date || row.created_at || ''
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

export default function ProcessingEntriesTable({
  rows,
  sheds,
  companies,
}: {
  rows: ProcessingEntry[]
  sheds: Lookup[]
  companies: Lookup[]
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [shedId, setShedId] = useState('all')
  const [companyId, setCompanyId] = useState('all')
  const [batchId, setBatchId] = useState('all')

  const batchOptions = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((row) => {
      if (!row.batch_id) return
      const name = row.batches?.batch_code || row.batches?.batch_name || row.batch_id
      map.set(row.batch_id, name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (shedId !== 'all' && row.shed_id !== shedId) return false
      if (companyId !== 'all' && row.company_id !== companyId) return false
      if (batchId !== 'all' && row.batch_id !== batchId) return false

      const date = formatDate(resolveDate(row))
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    })
  }, [rows, shedId, companyId, batchId, startDate, endDate])

  const onExport = () => {
    const headers = ['Date', 'Company', 'Shed', 'Batch', 'Processing Type', 'Count Range', 'Processed Weight (kg)', 'Rate Snapshot', 'Amount Snapshot']
    const csvRows = filteredRows.map((row) => [
      formatDate(resolveDate(row)),
      row.companies?.name || '-',
      row.sheds?.name || '-',
      row.batches?.batch_code || row.batches?.batch_name || '-',
      row.processing_types?.name || '-',
      row.count_ranges?.label || '-',
      String(Number(row.processed_weight_kg || 0).toFixed(2)),
      String(Number(row.rate_per_kg_snapshot || 0).toFixed(2)),
      String(Number(row.amount_snapshot || 0).toFixed(2)),
    ])
    downloadCsv(`processing_entries_${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-5">
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
          <div className="grid gap-1.5">
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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
              <TableHead>Batch</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Count</TableHead>
              <TableHead className="text-right">Processed (kg)</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No processing entries found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, i) => (
                <TableRow key={row.processing_entry_id || i}>
                  <TableCell>{formatDate(resolveDate(row))}</TableCell>
                  <TableCell>{row.companies?.name || '-'}</TableCell>
                  <TableCell>{row.sheds?.name || '-'}</TableCell>
                  <TableCell>{row.batches?.batch_code || row.batches?.batch_name || '-'}</TableCell>
                  <TableCell>{row.processing_types?.name || '-'}</TableCell>
                  <TableCell>{row.count_ranges?.label || '-'}</TableCell>
                  <TableCell className="text-right">{Number(row.processed_weight_kg || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(row.rate_per_kg_snapshot || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(row.amount_snapshot || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
