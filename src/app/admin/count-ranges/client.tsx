'use client'

import { useState } from 'react'
import { Plus, Edit2, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { addCountRange, updateCountRange, toggleCountRangeActive } from './actions'

type CountRange = {
  count_range_id: string
  label: string
  min_count: number | null
  max_count: number | null
  is_active: boolean
  sort_order: number | null
}

export default function CountRangesClient({
  initialRanges,
}: {
  initialRanges: CountRange[]
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRange, setEditingRange] = useState<CountRange | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenAdd = () => {
    setEditingRange(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (range: CountRange) => {
    setEditingRange(range)
    setIsModalOpen(true)
  }

  const handleToggleActive = async (range: CountRange) => {
    const action = range.is_active ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${range.label}?`)) {
      return
    }

    try {
      const res = await toggleCountRangeActive(range.count_range_id, range.is_active)
      if (res?.error) {
        toast.error(`Failed to ${action} count range: ${res.error}`)
      } else {
        toast.success(`Count range ${action}d successfully.`)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      if (editingRange) {
        const res = await updateCountRange(editingRange.count_range_id, formData)
        if (res?.error) throw new Error(res.error)
        toast.success('Count range updated successfully')
      } else {
        const res = await addCountRange(formData)
        if (res?.error) throw new Error(res.error)
        toast.success('Count range added successfully')
      }
      setIsModalOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Count Range
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Min Count</TableHead>
              <TableHead>Max Count</TableHead>
              <TableHead className="w-[100px]">Sort Order</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRanges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No count ranges found.
                </TableCell>
              </TableRow>
            ) : (
              initialRanges.map((range) => (
                <TableRow key={range.count_range_id}>
                  <TableCell className="font-medium">{range.label}</TableCell>
                  <TableCell>{range.min_count ?? '-'}</TableCell>
                  <TableCell>{range.max_count ?? '-'}</TableCell>
                  <TableCell>{range.sort_order}</TableCell>
                  <TableCell>
                    {range.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        <Ban className="h-3.5 w-3.5" />
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenEdit(range)}
                        title="Edit Count Range"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(range)}
                        title={range.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {range.is_active ? (
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
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingRange ? 'Edit' : 'Add'} Count Range</DialogTitle>
              <DialogDescription>
                {editingRange
                  ? 'Update the count range details below.'
                  : 'Enter the details for the new count range.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  defaultValue={editingRange?.label || ''}
                  placeholder="e.g. 51-60"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="min_count">Min Count</Label>
                  <Input
                    id="min_count"
                    name="min_count"
                    type="number"
                    defaultValue={editingRange?.min_count ?? ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_count">Max Count</Label>
                  <Input
                    id="max_count"
                    name="max_count"
                    type="number"
                    defaultValue={editingRange?.max_count ?? ''}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  defaultValue={editingRange?.sort_order || 0}
                />
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
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
