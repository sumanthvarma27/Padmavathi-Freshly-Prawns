'use client'

import { useState } from 'react'
import { Plus, Ban, CheckCircle2, AlertCircle } from 'lucide-react'
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
import { addWorkerRate, toggleWorkerRateActive } from './actions'

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

type ProcessingType = { processing_type_id: string, name: string }
type CountRange = { count_range_id: string, label: string }

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

export default function WorkerRatesClient({
  initialRates,
  processingTypes,
  countRanges
}: {
  initialRates: WorkerRate[]
  processingTypes: ProcessingType[]
  countRanges: CountRange[]
}) {
  const rates = initialRates
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterActiveOnly, setFilterActiveOnly] = useState(true)
  const [selectedProcessingTypeId, setSelectedProcessingTypeId] = useState('')
  const [selectedCountRangeId, setSelectedCountRangeId] = useState('')

  // Filtering
  const [filterType, setFilterType] = useState('all')
  const [filterRange, setFilterRange] = useState('all')

  const handleOpenAdd = () => {
    setSelectedProcessingTypeId('')
    setSelectedCountRangeId('')
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.set('processing_type_id', selectedProcessingTypeId)
    formData.set('count_range_id', selectedCountRangeId)
    
    // Switch state handle
    formData.append('is_active', 'true') // default new to true

    try {
      const res = await addWorkerRate(formData)
      if (res?.error) throw new Error(res.error)
      toast.success('Rate added successfully. Any overlapping active rates were closed.')
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

  // get midnight local time for default
  const localIsoString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-md border shadow-sm">
          <div className="flex items-center gap-2">
            <Label className="text-sm border-r pr-2 py-1">Type:</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-8 text-xs border-0 shadow-none">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {processingTypes.map(pt => (
                  <SelectItem key={pt.processing_type_id} value={pt.processing_type_id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm border-r pr-2 py-1 border-l pl-2">Range:</Label>
            <Select value={filterRange} onValueChange={setFilterRange}>
              <SelectTrigger className="w-[120px] h-8 text-xs border-0 shadow-none">
                <SelectValue placeholder="All ranges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ranges</SelectItem>
                {countRanges.map(cr => (
                  <SelectItem key={cr.count_range_id} value={cr.count_range_id}>
                    {cr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 ml-2">
            <Switch 
              id="active-only" 
              checked={filterActiveOnly} 
              onCheckedChange={setFilterActiveOnly} 
            />
            <Label htmlFor="active-only" className="text-sm whitespace-nowrap">Active Only</Label>
          </div>
        </div>

        <Button onClick={handleOpenAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Rate
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processing Type</TableHead>
              <TableHead>Count Range</TableHead>
              <TableHead className="text-right text-emerald-700 font-semibold">Rate (₹/kg)</TableHead>
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
                  <TableCell className="text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                    {rate.rate_per_kg.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(rate.effective_from).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rate.effective_to ? new Date(rate.effective_to).toLocaleString() : '—'}
                  </TableCell>
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleToggleActive(rate)}
                      title={rate.is_active ? 'Deactivate Rate' : 'Reactivate Rate'}
                    >
                      {rate.is_active ? <Ban className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
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
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add Worker Rate</DialogTitle>
              <DialogDescription>
                Define new rate. Existing overlapping active rates for this combination will be automatically closed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="processing_type_id">Processing Type <span className="text-red-500">*</span></Label>
                  <input type="hidden" name="processing_type_id" value={selectedProcessingTypeId} />
                  <Select value={selectedProcessingTypeId} onValueChange={setSelectedProcessingTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {processingTypes.map(pt => (
                        <SelectItem key={pt.processing_type_id} value={pt.processing_type_id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="count_range_id">Count Range <span className="text-red-500">*</span></Label>
                  <input type="hidden" name="count_range_id" value={selectedCountRangeId} />
                  <Select value={selectedCountRangeId} onValueChange={setSelectedCountRangeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {countRanges.map(cr => (
                        <SelectItem key={cr.count_range_id} value={cr.count_range_id}>
                          {cr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate_per_kg">Rate per KG (₹) <span className="text-red-500">*</span></Label>
                <Input
                  id="rate_per_kg"
                  name="rate_per_kg"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5.50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="effective_from">Effective From <span className="text-red-500">*</span></Label>
                  <Input
                    id="effective_from"
                    name="effective_from"
                    type="datetime-local"
                    defaultValue={localIsoString}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="effective_to">Effective To</Label>
                  <Input
                    id="effective_to"
                    name="effective_to"
                    type="datetime-local"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                    Leave blank for open-ended rate. It will close automatically if a new rate overlaps later.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save & Close Overlaps'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
