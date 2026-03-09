import { createClient } from '@/lib/supabase/server'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PrintButton from '@/components/reports/print-button'

export default async function ChangeHistoryPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('master_data_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Master Data Change History</h1>
        <p className="text-muted-foreground">Who changed what and when across setup tables.</p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows || []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No change records.</TableCell></TableRow>
            ) : (
              (rows || []).map((row: { audit_id: string; created_at: string; table_name: string; action: string; record_id: string | null }) => (
                <TableRow key={row.audit_id}>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell>{row.table_name}</TableCell>
                  <TableCell className="uppercase font-medium">{row.action}</TableCell>
                  <TableCell className="font-mono text-xs">{row.record_id || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
