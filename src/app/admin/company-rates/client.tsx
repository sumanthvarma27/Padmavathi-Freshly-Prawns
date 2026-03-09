'use client'

import { useState } from 'react'
import { Plus, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { addCompanyRate, toggleCompanyRateActive } from './actions'

type CompanyRate = {
  company_rate_id: string
  company_id: string
  rate_per_kg: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  company_name: string
}

type Company = {
  company_id: string
  name: string
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

export default function CompanyRatesClient({
  initialRates,
  companies,
}: {
  initialRates: CompanyRate[]
  companies: Company[]
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOnly, setActiveOnly] = useState(true)
  const [companyFilter, setCompanyFilter] = useState('all')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [effectiveFromValue, setEffectiveFromValue] = useState('')

  const filtered = initialRates.filter((row) => {
    if (activeOnly && !row.is_active) return false
    if (companyFilter !== 'all' && row.company_id !== companyFilter) return false
    return true
  })

  const openAdd = () => {
    setSelectedCompanyId('')
    setEffectiveFromValue(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
    setIsModalOpen(true)
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('company_id', selectedCompanyId)
    formData.set('is_active', 'true')

    const res = await addCompanyRate(formData)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Company rate added.')
      setIsModalOpen(false)
      window.location.reload()
    }

    setIsSubmitting(false)
  }

  const onToggle = async (row: CompanyRate) => {
    const res = await toggleCompanyRateActive(row.company_rate_id, row.is_active)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Rate ${row.is_active ? 'deactivated' : 'activated'}.`)
      window.location.reload()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only-company" />
            <Label htmlFor="active-only-company">Active only</Label>
          </div>
        </div>

        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Company Rate
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Rate (₹/kg)</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No company rates.</TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.company_rate_id}>
                  <TableCell className="font-medium">{row.company_name || '-'}</TableCell>
                  <TableCell className="text-right font-semibold">{Number(row.rate_per_kg || 0).toFixed(2)}</TableCell>
                  <TableCell>{formatDateTime(row.effective_from)}</TableCell>
                  <TableCell>{formatDateTime(row.effective_to)}</TableCell>
                  <TableCell>
                    {row.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        <Ban className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onToggle(row)}>
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Add Company Rate</DialogTitle>
              <DialogDescription>
                Effective-dated company payout rate used for profitability reporting.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Company</Label>
                <input type="hidden" name="company_id" value={selectedCompanyId} />
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Rate per KG (₹)</Label>
                <Input type="number" step="0.01" name="rate_per_kg" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Effective From</Label>
                  <Input
                    name="effective_from"
                    type="datetime-local"
                    value={effectiveFromValue}
                    onChange={(e) => setEffectiveFromValue(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Effective To</Label>
                  <Input name="effective_to" type="datetime-local" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
