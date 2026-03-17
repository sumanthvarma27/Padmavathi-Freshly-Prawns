'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus, Ban, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { addWorkerRate, seedReferenceWorkerRates, updateWorkerRate, toggleWorkerRateActive } from './actions'

type WorkerRate = {
  worker_rate_id: string
  processing_type_id: string
  count_range_id: string
  rate_per_kg: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  processing_type_name: string
  count_range_label: string
}

type ProcessingType = { processing_type_id: string; name: string }
type CountRange = { count_range_id: string; label: string }

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().replace('T', ' ').slice(0, 19)
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

export default function WorkerRatesClient({
  initialRates,
  processingTypes,
  countRanges,
}: {
  initialRates: WorkerRate[]
  processingTypes: ProcessingType[]
  countRanges: CountRange[]
}) {
  const rates = initialRates
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<WorkerRate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [filterActiveOnly, setFilterActiveOnly] = useState(true)
  const [selectedProcessingTypeId, setSelectedProcessingTypeId] = useState('')
  const [selectedCountRangeId, setSelectedCountRangeId] = useState('')
  const [effectiveFromValue, setEffectiveFromValue] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterRange, setFilterRange] = useState('all')

  const localIsoString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  const sortedCountRanges = useMemo(
    () => [...countRanges].sort((a, b) => compareRangeLabels(a.label, b.label)),
    [countRanges]
  )

  const sortedProcessingTypes = useMemo(
    () => [...processingTypes].sort((a, b) => compareProcessingTypes(a.name, b.name)),
    [processingTypes]
  )

  const displayedCountRanges = useMemo(
    () => sortedCountRanges.filter((range) => rates.some((rate) => rate.is_active && rate.count_range_id === range.count_range_id)),
    [rates, sortedCountRanges]
  )

  const activeMatrix = useMemo(() => {
    const activeRates = rates.filter((rate) => rate.is_active)
    return sortedProcessingTypes.map((type) => ({
      ...type,
      cells: displayedCountRanges.map((range) => {
        const match = activeRates.find(
          (rate) =>
            rate.processing_type_id === type.processing_type_id &&
            rate.count_range_id === range.count_range_id
        )
        return match || null
      }),
    }))
  }, [displayedCountRanges, rates, sortedProcessingTypes])

  const handleOpenAdd = () => {
    setEditingRate(null)
    setSelectedProcessingTypeId('')
    setSelectedCountRangeId('')
    setEffectiveFromValue(localIsoString)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (rate: WorkerRate) => {
    setEditingRate(rate)
    setSelectedProcessingTypeId(rate.processing_type_id)
    setSelectedCountRangeId(rate.count_range_id)
    setEffectiveFromValue(
      rate.effective_from
        ? new Date(new Date(rate.effective_from).getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : localIsoString
    )
    setIsModalOpen(true)
  }

  const handleToggleActive = async (rate: WorkerRate) => {
    const action = rate.is_active ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} this rate?`)) {
      return
    }
    try {
      const res = await toggleWorkerRateActive(rate.worker_rate_id, rate.is_active)
      if (res?.error) {
        toast.error(`Failed to ${action} rate: ${res.error}`)
      } else {
        toast.success(`Rate ${action}d successfully.`)
        window.location.reload()
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    }
  }

  const handleSeedReference = async () => {
    setIsSeeding(true)
    try {
      const res = await seedReferenceWorkerRates()
      if (res?.error) {
        toast.error(res.error)
      } else if (res?.missingTypes?.length) {
        toast.info(`Seeded worker rates. Missing processing types: ${res.missingTypes.join(', ')}`)
        window.location.reload()
      } else {
        toast.success(`Seeded worker rates. Added ${res?.inserted || 0}, skipped ${res?.skipped || 0}.`)
        window.location.reload()
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSeeding(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.set('processing_type_id', selectedProcessingTypeId)
    formData.set('count_range_id', selectedCountRangeId)
    formData.set('is_active', 'true')

    try {
      const res = editingRate
        ? await updateWorkerRate(editingRate.worker_rate_id, formData)
        : await addWorkerRate(formData)

      if (res?.error) throw new Error(res.error)

      if ('skipped' in res && res.skipped) {
        toast.info(res.message || 'Skipped overlapping rate entry.')
      } else {
        toast.success(res.message || (editingRate ? 'Rate updated successfully.' : 'Rate added successfully.'))
      }

      setIsModalOpen(false)
      window.location.reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredRates = rates.filter((r) => {
    if (filterActiveOnly && !r.is_active) return false
    if (filterType !== 'all' && r.processing_type_id !== filterType) return false
    if (filterRange !== 'all' && r.count_range_id !== filterRange) return false
    return true
  })

  const conflictingRates = rates.filter((rate) => {
    if (!selectedProcessingTypeId || !selectedCountRangeId || !effectiveFromValue) return false
    if (rate.processing_type_id !== selectedProcessingTypeId) return false
    if (rate.count_range_id !== selectedCountRangeId) return false
    if (!rate.is_active) return false

    const start = new Date(rate.effective_from).getTime()
    const end = rate.effective_to ? new Date(rate.effective_to).getTime() : Number.POSITIVE_INFINITY
    const newStart = new Date(effectiveFromValue).getTime()
    return Number.isFinite(newStart) && newStart >= start && newStart < end
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fixed Worker Rate Matrix</h2>
          <p className="text-sm text-slate-600">
            Active worker rates shown like the Excel sheet. Add new counts or processing types from setup, then edit rates here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/count-ranges">Manage Count Ranges</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/processing-types">Manage Processing Types</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
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
            {activeMatrix.map((row) => (
              <tr key={row.processing_type_id}>
                <td className="border bg-slate-50 p-3 font-semibold text-slate-900">{row.name}</td>
                {row.cells.map((cell, index) => (
                  <td key={`${row.processing_type_id}-${displayedCountRanges[index]?.count_range_id}`} className="border p-3 text-center">
                    {cell ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cell)}
                        className="rounded-md px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        {cell.rate_per_kg.toFixed(2)}
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

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4 rounded-md border bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Label className="border-r pr-2 text-sm">Type:</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[160px] border-0 text-xs shadow-none">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {sortedProcessingTypes.map((pt) => (
                  <SelectItem key={pt.processing_type_id} value={pt.processing_type_id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="border-l border-r px-2 text-sm">Range:</Label>
            <Select value={filterRange} onValueChange={setFilterRange}>
              <SelectTrigger className="h-8 w-[140px] border-0 text-xs shadow-none">
                <SelectValue placeholder="All ranges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ranges</SelectItem>
                {sortedCountRanges.map((cr) => (
                  <SelectItem key={cr.count_range_id} value={cr.count_range_id}>
                    {cr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-2 flex items-center gap-2 border-l pl-4">
            <Switch id="active-only" checked={filterActiveOnly} onCheckedChange={setFilterActiveOnly} />
            <Label htmlFor="active-only" className="whitespace-nowrap text-sm">Active Only</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleSeedReference} disabled={isSeeding}>
            {isSeeding ? 'Seeding…' : 'Seed Reference Rates'}
          </Button>
          <Button onClick={handleOpenAdd} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Worker Rate
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processing Type</TableHead>
              <TableHead>Count Range</TableHead>
              <TableHead className="text-right font-semibold text-emerald-700">Rate (₹/kg)</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-5 w-5 opacity-50" />
                    <p>No rates match your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRates.map((rate) => (
                <TableRow key={rate.worker_rate_id} className={!rate.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{rate.processing_type_name || '-'}</TableCell>
                  <TableCell>{rate.count_range_label || '-'}</TableCell>
                  <TableCell className="bg-emerald-50/50 text-right font-mono font-bold text-emerald-700">
                    {rate.rate_per_kg.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(rate.effective_from)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(rate.effective_to)}</TableCell>
                  <TableCell>
                    {rate.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        <Ban className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon" onClick={() => handleOpenEdit(rate)} title="Edit Rate">
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(rate)}
                        title={rate.is_active ? 'Deactivate Rate' : 'Reactivate Rate'}
                      >
                        {rate.is_active ? <Ban className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
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
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Edit Worker Rate' : 'Add Worker Rate'}</DialogTitle>
              <DialogDescription>
                {editingRate
                  ? 'Update the rate value and date range. Processing type and count range cannot be changed from edit mode.'
                  : 'Add a new fixed worker rate. Older overlapping active entries will be closed, and same/newer overlaps will be skipped.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="processing_type_id">Processing Type <span className="text-red-500">*</span></Label>
                  <input type="hidden" name="processing_type_id" value={selectedProcessingTypeId} />
                  {editingRate ? (
                    <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {editingRate.processing_type_name}
                    </div>
                  ) : (
                    <Select value={selectedProcessingTypeId} onValueChange={setSelectedProcessingTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedProcessingTypes.map((pt) => (
                          <SelectItem key={pt.processing_type_id} value={pt.processing_type_id}>
                            {pt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="count_range_id">Count Range <span className="text-red-500">*</span></Label>
                  <input type="hidden" name="count_range_id" value={selectedCountRangeId} />
                  {editingRate ? (
                    <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {editingRate.count_range_label}
                    </div>
                  ) : (
                    <Select value={selectedCountRangeId} onValueChange={setSelectedCountRangeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCountRanges.map((cr) => (
                          <SelectItem key={cr.count_range_id} value={cr.count_range_id}>
                            {cr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {!editingRate && conflictingRates.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  A same or overlapping active rate exists for this combination. Saving will skip newer overlaps and close only older ones.
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="rate_per_kg">Rate per KG (₹) <span className="text-red-500">*</span></Label>
                <Input id="rate_per_kg" type="number" step="0.01" name="rate_per_kg" defaultValue={editingRate ? editingRate.rate_per_kg : ''} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="effective_from">Effective From <span className="text-red-500">*</span></Label>
                  <Input
                    id="effective_from"
                    name="effective_from"
                    type="datetime-local"
                    value={effectiveFromValue}
                    onChange={(e) => setEffectiveFromValue(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="effective_to">Effective To</Label>
                  <Input
                    id="effective_to"
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
