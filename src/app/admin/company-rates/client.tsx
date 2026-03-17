'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus, Ban, CheckCircle2, Edit2 } from 'lucide-react'
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
import { addCompanyRate, seedReferenceCompanyRates, updateCompanyRate, toggleCompanyRateActive } from './actions'

type CompanyRate = {
  company_rate_id: string
  company_id: string
  processing_type_id: string | null
  count_range_id: string | null
  rate_per_kg: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  company_name: string
  processing_type_name: string
  count_range_label: string
}

type Company = { company_id: string; name: string }
type ProcessingType = { processing_type_id: string; name: string }
type CountRange = { count_range_id: string; label: string }

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const PREFERRED_PROCESSING_TYPE_ORDER = [
  'Peeled & Deveined',
  'Easy Peel',
  'Tail On',
  'Cooked Tail On',
  'Tail-On Full Cut',
  'PD Full Cut',
  'Tail-On Shaving',
] as const

function normalizeProcessingType(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function compareProcessingTypes(a: string, b: string) {
  const preferred = PREFERRED_PROCESSING_TYPE_ORDER.map(normalizeProcessingType)
  const aIndex = preferred.indexOf(normalizeProcessingType(a))
  const bIndex = preferred.indexOf(normalizeProcessingType(b))

  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
  if (aIndex !== -1) return -1
  if (bIndex !== -1) return 1
  return a.localeCompare(b)
}

function compareRangeLabels(a: string, b: string) {
  const parse = (label: string) => {
    const match = label.match(/^(\d+)-(\d+)$/)
    if (!match) return { min: Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }
    return { min: Number(match[1]), max: Number(match[2]) }
  }

  const left = parse(a)
  const right = parse(b)
  if (left.min !== right.min) return left.min - right.min
  if (left.max !== right.max) return left.max - right.max
  return a.localeCompare(b)
}

const localIso = () =>
  new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

export default function CompanyRatesClient({
  initialRates,
  companies,
  processingTypes,
  countRanges,
}: {
  initialRates: CompanyRate[]
  companies: Company[]
  processingTypes: ProcessingType[]
  countRanges: CountRange[]
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<CompanyRate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [activeOnly, setActiveOnly] = useState(true)
  const [companyFilter, setCompanyFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedProcTypeId, setSelectedProcTypeId] = useState('')
  const [selectedCountRangeId, setSelectedCountRangeId] = useState('')
  const [effectiveFromValue, setEffectiveFromValue] = useState('')

  const sortedCountRanges = useMemo(
    () => [...countRanges].sort((a, b) => compareRangeLabels(a.label, b.label)),
    [countRanges]
  )

  const sortedProcessingTypes = useMemo(
    () => [...processingTypes].sort((a, b) => compareProcessingTypes(a.name, b.name)),
    [processingTypes]
  )

  const displayedCountRanges = useMemo(
    () => sortedCountRanges.filter((range) => initialRates.some((rate) => rate.is_active && rate.count_range_id === range.count_range_id)),
    [initialRates, sortedCountRanges]
  )

  const filtered = initialRates.filter((row) => {
    if (activeOnly && !row.is_active) return false
    if (companyFilter !== 'all' && row.company_id !== companyFilter) return false
    if (typeFilter !== 'all' && row.processing_type_id !== typeFilter) return false
    return true
  })

  const matrixCompanies = useMemo(() => {
    const selectedCompanies = companyFilter === 'all'
      ? companies
      : companies.filter((company) => company.company_id === companyFilter)

    const activeRates = initialRates.filter((rate) => rate.is_active)

    return selectedCompanies.map((company) => ({
      company,
      rows: sortedProcessingTypes.map((type) => ({
        ...type,
        cells: displayedCountRanges.map((range) => {
          const match = activeRates.find(
            (rate) =>
              rate.company_id === company.company_id &&
              rate.processing_type_id === type.processing_type_id &&
              rate.count_range_id === range.count_range_id
          )
          return match || null
        }),
      })),
    }))
  }, [companies, companyFilter, displayedCountRanges, initialRates, sortedProcessingTypes])

  const openAdd = () => {
    setEditingRate(null)
    setSelectedCompanyId(companyFilter !== 'all' ? companyFilter : '')
    setSelectedProcTypeId('')
    setSelectedCountRangeId('')
    setEffectiveFromValue(localIso())
    setIsModalOpen(true)
  }

  const openEdit = (rate: CompanyRate) => {
    setEditingRate(rate)
    setSelectedCompanyId(rate.company_id)
    setSelectedProcTypeId(rate.processing_type_id || '')
    setSelectedCountRangeId(rate.count_range_id || '')
    setEffectiveFromValue(
      rate.effective_from
        ? new Date(new Date(rate.effective_from).getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : localIso()
    )
    setIsModalOpen(true)
  }

  const onSeedReference = async () => {
    setIsSeeding(true)
    try {
      const res = await seedReferenceCompanyRates()
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Seeded company rates. Added ${res?.inserted || 0}, skipped ${res?.skipped || 0}.`)
        window.location.reload()
      }
    } finally {
      setIsSeeding(false)
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('company_id', selectedCompanyId)
    formData.set('processing_type_id', selectedProcTypeId)
    formData.set('count_range_id', selectedCountRangeId)
    formData.set('is_active', 'true')

    const res = editingRate
      ? await updateCompanyRate(editingRate.company_rate_id, formData)
      : await addCompanyRate(formData)

    if (res?.error) {
      toast.error(res.error)
    } else {
      if ('skipped' in res && res.skipped) {
        toast.info(res.message || 'Skipped overlapping company rate entry.')
      } else {
        toast.success(res.message || (editingRate ? 'Company rate updated.' : 'Company rate added.'))
      }
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
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fixed Company Rate Matrix</h2>
          <p className="text-sm text-slate-600">
            Company rates grouped like the Excel sheet. Add new count ranges or processing types from setup, then edit saved values here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/count-ranges">Manage Count Ranges</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/processing-types">Manage Processing Types</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/companies">Manage Companies</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Company:</Label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-8 w-[220px] text-xs border-0 shadow-none">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 border-l pl-3">
            <Label className="text-sm whitespace-nowrap">Type:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[180px] text-xs border-0 shadow-none">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {sortedProcessingTypes.map((pt) => (
                  <SelectItem key={pt.processing_type_id} value={pt.processing_type_id}>{pt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 border-l pl-3">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only-company" />
            <Label htmlFor="active-only-company" className="text-sm">Active only</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onSeedReference} disabled={isSeeding}>
            {isSeeding ? 'Seeding…' : 'Seed Reference Rates'}
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Company Rate
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {matrixCompanies.map(({ company, rows }) => (
          <div key={company.company_id} className="overflow-x-auto rounded-xl border bg-white">
            <div className="border-b bg-slate-50 px-4 py-3">
              <h3 className="font-semibold text-slate-900">{company.name}</h3>
            </div>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-3 text-left font-semibold text-slate-700">Processing Type</th>
                  {displayedCountRanges.map((range) => (
                    <th key={range.count_range_id} className="border p-3 text-center font-semibold text-slate-700">
                      {range.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${company.company_id}-${row.processing_type_id}`}>
                    <td className="border bg-slate-50 p-3 font-semibold text-slate-900">{row.name}</td>
                    {row.cells.map((cell, index) => (
                      <td key={`${company.company_id}-${row.processing_type_id}-${displayedCountRanges[index]?.count_range_id}`} className="border p-3 text-center">
                        {cell ? (
                          <button
                            type="button"
                            onClick={() => openEdit(cell)}
                            className="rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            {Number(cell.rate_per_kg).toFixed(2)}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Processing Type</TableHead>
              <TableHead>Count Range</TableHead>
              <TableHead className="text-right text-blue-700 font-semibold">Rate (₹/kg)</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No company rates found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.company_rate_id} className={!row.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{row.company_name}</TableCell>
                  <TableCell>{row.processing_type_name}</TableCell>
                  <TableCell>{row.count_range_label}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-blue-700 bg-blue-50/50">
                    {Number(row.rate_per_kg || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(row.effective_from)}</TableCell>
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
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon" onClick={() => openEdit(row)} title="Edit Rate">
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => onToggle(row)} title={row.is_active ? 'Deactivate' : 'Activate'}>
                        {row.is_active ? (
                          <Ban className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Edit Company Rate' : 'Add Company Rate'}</DialogTitle>
              <DialogDescription>
                {editingRate
                  ? 'Update the selected company / processing type / count combination.'
                  : 'Add a new fixed company rate. Older overlapping active entries will be closed, and same/newer overlaps will be skipped.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Company <span className="text-red-500">*</span></Label>
                <input type="hidden" name="company_id" value={selectedCompanyId} />
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId} required>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Processing Type <span className="text-red-500">*</span></Label>
                  <input type="hidden" name="processing_type_id" value={selectedProcTypeId} />
                  <Select value={selectedProcTypeId} onValueChange={setSelectedProcTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedProcessingTypes.map((pt) => (
                        <SelectItem key={pt.processing_type_id} value={pt.processing_type_id}>{pt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Count Range <span className="text-red-500">*</span></Label>
                  <input type="hidden" name="count_range_id" value={selectedCountRangeId} />
                  <Select value={selectedCountRangeId} onValueChange={setSelectedCountRangeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedCountRanges.map((cr) => (
                        <SelectItem key={cr.count_range_id} value={cr.count_range_id}>{cr.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Rate per KG (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  name="rate_per_kg"
                  defaultValue={editingRate ? editingRate.rate_per_kg : ''}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Effective From <span className="text-red-500">*</span></Label>
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
                  <Input
                    name="effective_to"
                    type="datetime-local"
                    defaultValue={editingRate?.effective_to
                      ? new Date(new Date(editingRate.effective_to).getTime() - new Date().getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : ''}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingRate ? 'Update Rate' : 'Save Rate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
