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
import { addProcessingType, updateProcessingType, toggleProcessingTypeActive } from './actions'

type ProcessingType = {
  processing_type_id: string
  name: string
  is_active: boolean
  sort_order: number | null
}

export default function ProcessingTypesClient({
  initialTypes,
}: {
  initialTypes: ProcessingType[]
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<ProcessingType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenAdd = () => {
    setEditingType(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (ptype: ProcessingType) => {
    setEditingType(ptype)
    setIsModalOpen(true)
  }

  const handleToggleActive = async (ptype: ProcessingType) => {
    const action = ptype.is_active ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${ptype.name}?`)) {
      return
    }

    try {
      const res = await toggleProcessingTypeActive(ptype.processing_type_id, ptype.is_active)
      if (res?.error) {
        toast.error(`Failed to ${action} processing type: ${res.error}`)
      } else {
        toast.success(`Processing type ${action}d successfully.`)
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
      if (editingType) {
        const res = await updateProcessingType(editingType.processing_type_id, formData)
        if (res?.error) throw new Error(res.error)
        toast.success('Processing type updated successfully')
      } else {
        const res = await addProcessingType(formData)
        if (res?.error) throw new Error(res.error)
        toast.success('Processing type added successfully')
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
          Add Processing Type
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type Name</TableHead>
              <TableHead className="w-[100px]">Sort Order</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No processing types found.
                </TableCell>
              </TableRow>
            ) : (
              initialTypes.map((ptype) => (
                <TableRow key={ptype.processing_type_id}>
                  <TableCell className="font-medium">{ptype.name}</TableCell>
                  <TableCell>{ptype.sort_order}</TableCell>
                  <TableCell>
                    {ptype.is_active ? (
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
                        onClick={() => handleOpenEdit(ptype)}
                        title="Edit Processing Type"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(ptype)}
                        title={ptype.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {ptype.is_active ? (
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
              <DialogTitle>{editingType ? 'Edit' : 'Add'} Processing Type</DialogTitle>
              <DialogDescription>
                {editingType
                  ? 'Update the processing type details below.'
                  : 'Enter the details for the new processing type.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Type Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingType?.name || ''}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  defaultValue={editingType?.sort_order || 0}
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
