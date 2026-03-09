import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { editProcessingWeight, voidProcessingEntry } from './actions'

export default async function CorrectionsPage() {
  const supabase = await createClient()

  const [{ data: rows }, { data: audit }] = await Promise.all([
    supabase
      .from('processing_entries')
      .select('*,companies(name),sheds(name),batches(batch_code,batch_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('processing_entry_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Corrections & Audit</h1>
        <p className="text-muted-foreground">Void/edit with mandatory reason and immutable audit trail.</p>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Edit Weight</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows || []).length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No entries.</TableCell></TableRow>
            ) : (
              (rows || []).map((row: any) => {
                const entryId = row.processing_entry_id || row.entry_id
                if (!entryId) return null
                return (
                <TableRow key={entryId}>
                  <TableCell>{row.entry_date}</TableCell>
                  <TableCell>{row.companies?.name || '-'}</TableCell>
                  <TableCell>{row.sheds?.name || '-'}</TableCell>
                  <TableCell>{row.batches?.batch_code || row.batches?.batch_name || '-'}</TableCell>
                  <TableCell className="text-right">{Number(row.processed_weight_kg || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(row.amount_snapshot || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <form
                      action={async (formData) => {
                        'use server'
                        const w = Number(formData.get('processed_weight_kg') || 0)
                        const reason = String(formData.get('reason') || '')
                        await editProcessingWeight(entryId, w, reason)
                      }}
                      className="flex gap-2"
                    >
                      <Input name="processed_weight_kg" type="number" step="0.01" defaultValue={Number(row.processed_weight_kg || 0)} className="w-28" />
                      <Input name="reason" placeholder="Reason" className="w-44" required />
                      <Button size="sm" type="submit">Save</Button>
                    </form>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">Required</TableCell>
                  <TableCell className="text-right">
                    <form
                      action={async (formData) => {
                        'use server'
                        const reason = String(formData.get('void_reason') || '')
                        await voidProcessingEntry(entryId, reason)
                      }}
                      className="inline-flex gap-2 items-center"
                    >
                      <Input name="void_reason" placeholder="Void reason" className="w-44" required />
                      <Button size="sm" variant="destructive" type="submit">Void</Button>
                    </form>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(audit || []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No audit records.</TableCell></TableRow>
            ) : (
              (audit || []).map((a: any) => (
                <TableRow key={a.audit_id}>
                  <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium uppercase">{a.action}</TableCell>
                  <TableCell className="font-mono text-xs">{a.processing_entry_id || a.entry_id || '-'}</TableCell>
                  <TableCell>{a.reason || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
