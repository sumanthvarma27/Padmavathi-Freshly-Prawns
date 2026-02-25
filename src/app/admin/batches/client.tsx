'use client'

import { useState, useRef } from 'react'
import { Plus, Edit2, Ban, CheckCircle2, Users, QrCode, Clipboard, Download } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from "react-qr-code"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { 
  addBatch, 
  updateBatch, 
  toggleBatchActive,
  addBatchMember,
  bulkAddBatchMembers,
  toggleBatchMemberActive
} from './actions'

type BatchMember = {
  member_id: string
  batch_id: string
  member_name: string
  is_active: boolean
}

type Batch = {
  batch_id: string
  batch_code: string
  batch_name: string
  leader_name: string | null
  shed_id: string | null
  is_active: boolean
  shed_name: string | null
  members: BatchMember[]
}

type Shed = {
  shed_id: string
  name: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

export default function BatchesClient({
  initialBatches,
  sheds
}: {
  initialBatches: Batch[]
  sheds: Shed[]
}) {
  const batches = initialBatches
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  
  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Members Add
  const [newMemberName, setNewMemberName] = useState('')
  const [bulkNames, setBulkNames] = useState('')
  const [selectedShedId, setSelectedShedId] = useState('none')

  const qrRef = useRef<HTMLDivElement>(null)

  // --- Batch Handlers ---
  const handleOpenAddBatch = () => {
    setEditingBatch(null)
    setSelectedShedId('none')
    setIsBatchModalOpen(true)
  }

  const handleOpenEditBatch = (batch: Batch) => {
    setEditingBatch(batch)
    setSelectedShedId(batch.shed_id || 'none')
    setIsBatchModalOpen(true)
  }

  const handleOpenQr = (batch: Batch) => {
    setSelectedBatch(batch)
    setIsQrModalOpen(true)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Batch code copied to clipboard!')
  }

  const handleDownloadQr = () => {
    if (!qrRef.current || !selectedBatch) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.download = `QR_${selectedBatch.batch_code}.png`
      downloadLink.href = `${pngFile}`
      downloadLink.click()
    }
    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  const handleToggleBatchActive = async (batch: Batch) => {
    const action = batch.is_active ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} batch ${batch.batch_code}?`)) {
      return
    }

    try {
      const res = await toggleBatchActive(batch.batch_id, batch.is_active)
      if (res?.error) {
        toast.error(`Failed to ${action} batch: ${res.error}`)
      } else {
        toast.success(`Batch ${action}d successfully.`)
        // Update local state is optional if relying on route refresh, but we might need
        // a page refresh or to just let server actions refresh
        window.location.reload()
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    }
  }

  const handleBatchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.set('shed_id', selectedShedId)

    try {
      if (editingBatch) {
        const res = await updateBatch(editingBatch.batch_id, formData)
        if (res?.error) throw new Error(res.error)
        toast.success('Batch updated successfully')
      } else {
        const res = await addBatch(formData)
        if (res?.error) throw new Error(res.error)
        toast.success('Batch added successfully')
      }
      setIsBatchModalOpen(false)
      window.location.reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Member Handlers ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatch || !newMemberName.trim()) return
    try {
      const res = await addBatchMember(selectedBatch.batch_id, newMemberName.trim())
      if (res?.error) throw new Error(res.error)
      setNewMemberName('')
      toast.success('Member added')
      window.location.reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    }
  }

  const handleBulkAdd = async () => {
    if (!selectedBatch || !bulkNames.trim()) return
    setIsSubmitting(true)
    try {
      const res = await bulkAddBatchMembers(selectedBatch.batch_id, bulkNames)
      if (res?.error) throw new Error(res.error)
      setBulkNames('')
      toast.success('Members added successfully')
      window.location.reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleMember = async (member: BatchMember) => {
    try {
      const res = await toggleBatchMemberActive(member.member_id, member.is_active)
      if (res?.error) throw new Error(res.error)
      toast.success(member.is_active ? 'Member deactivated' : 'Member reactivated')
      window.location.reload()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    }
  }

  // Local derived state for members view
  const activeMembersSelected = batches.find(b => b.batch_id === selectedBatch?.batch_id)?.members || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Batch List */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Batches</h2>
          <Button onClick={handleOpenAddBatch} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Batch
          </Button>
        </div>

        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Shed</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No batches found.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow 
                    key={batch.batch_id}
                    className={selectedBatch?.batch_id === batch.batch_id ? 'bg-muted/50' : ''}
                  >
                    <TableCell className="font-mono font-medium">{batch.batch_code}</TableCell>
                    <TableCell>{batch.batch_name}</TableCell>
                    <TableCell>{batch.leader_name || '-'}</TableCell>
                    <TableCell>{batch.shed_name || '-'}</TableCell>
                    <TableCell>{batch.members.length}</TableCell>
                    <TableCell>
                      {batch.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedBatch(batch)}
                          title="View Members"
                          className={selectedBatch?.batch_id === batch.batch_id ? 'bg-muted' : ''}
                        >
                          <Users className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenQr(batch)}
                          title="View QR"
                        >
                          <QrCode className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditBatch(batch)}
                          title="Edit Batch"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleBatchActive(batch)}
                          title={batch.is_active ? 'Deactivate' : 'Reactivate'}
                        >
                          {batch.is_active ? (
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
      </div>

      {/* Right Column: Member Management (Visible only if batch selected) */}
      <div className="md:col-span-1">
        {selectedBatch ? (
          <Card className="sticky top-20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Team: {selectedBatch.batch_name}</span>
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {selectedBatch.batch_code}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              
              {/* Add Single Member */}
              <form onSubmit={handleAddMember} className="flex gap-2">
                <Input 
                  placeholder="New member name..." 
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!newMemberName.trim()}>Add</Button>
              </form>

              {/* Members List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-white pb-2">
                  Members ({activeMembersSelected.length})
                </h3>
                {activeMembersSelected.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">No members yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {activeMembersSelected.map(member => (
                      <li key={member.member_id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 border">
                        <span className={!member.is_active ? 'line-through text-muted-foreground' : ''}>
                          {member.member_name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleToggleMember(member)}
                          title={member.is_active ? 'Deactivate' : 'Reactivate'}
                        >
                          {member.is_active ? (
                            <Ban className="h-3 w-3 text-red-600" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Bulk Add */}
              <div className="pt-4 border-t space-y-2">
                <Label className="text-xs text-muted-foreground">Bulk Add Members (Line by Line)</Label>
                <Textarea 
                  placeholder="John Doe&#10;Jane Smith&#10;..."
                  value={bulkNames}
                  onChange={e => setBulkNames(e.target.value)}
                  className="text-sm min-h-[100px]"
                />
                <Button 
                  onClick={handleBulkAdd} 
                  variant="secondary" 
                  className="w-full"
                  disabled={!bulkNames.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Bulk Add'}
                </Button>
              </div>

            </CardContent>
          </Card>
        ) : (
          <Card className="flex h-full min-h-[300px] items-center justify-center bg-muted/30 border-dashed">
            <p className="text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Users className="h-8 w-8 opacity-20" />
              Select a batch to view members
            </p>
          </Card>
        )}
      </div>

      {/* Batch Setup Modal */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent>
          <form onSubmit={handleBatchSubmit}>
            <DialogHeader>
              <DialogTitle>{editingBatch ? 'Edit' : 'Add'} Batch</DialogTitle>
              <DialogDescription>
                Ensure batch code is unique. It will be used for QR codes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="batch_code">Batch Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="batch_code"
                    name="batch_code"
                    defaultValue={editingBatch?.batch_code || ''}
                    placeholder="e.g. B001"
                    required
                    readOnly={!!editingBatch} // Often codes shouldn't change once made
                    className={editingBatch ? 'bg-muted' : ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shed_id">Assigned Shed</Label>
                  <input type="hidden" name="shed_id" value={selectedShedId} />
                  <Select value={selectedShedId} onValueChange={setSelectedShedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Shed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Shed (Floating)</SelectItem>
                      {sheds.map(shed => (
                        <SelectItem key={shed.shed_id} value={shed.shed_id}>
                          {shed.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="batch_name">Batch Name <span className="text-red-500">*</span></Label>
                <Input
                  id="batch_name"
                  name="batch_name"
                  defaultValue={editingBatch?.batch_name || ''}
                  placeholder="e.g. Morning Team A"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leader_name">Leader Name</Label>
                <Input
                  id="leader_name"
                  name="leader_name"
                  defaultValue={editingBatch?.leader_name || ''}
                  placeholder="Optional team lead"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBatchModalOpen(false)}
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

      {/* QR Code Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batch QR Code</DialogTitle>
            <DialogDescription>
              Scan this from the tablet app to assign workers.
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm" ref={qrRef}>
                <QRCode
                  value={selectedBatch.batch_code}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xl">{selectedBatch.batch_name}</p>
                <p className="text-muted-foreground font-mono mt-1 tracking-widest bg-muted/50 px-3 py-1 rounded inline-block">
                  {selectedBatch.batch_code}
                </p>
              </div>
              
              <div className="flex gap-4 w-full justify-center">
                <Button variant="outline" onClick={() => handleCopyCode(selectedBatch.batch_code)} className="gap-2">
                  <Clipboard className="h-4 w-4" /> Copy Code
                </Button>
                <Button onClick={handleDownloadQr} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Download className="h-4 w-4" /> Download PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
