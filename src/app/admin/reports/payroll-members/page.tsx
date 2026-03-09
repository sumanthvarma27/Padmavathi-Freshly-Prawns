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

type MemberSplitRow = {
  member_id: string | null
  processed_weight_kg: number | null
  rate_per_kg_snapshot?: number | null
  processing_entries?: { rate_per_kg_snapshot?: number | null } | null
  batch_members?: {
    member_name?: string | null
    batches?: { batch_code?: string | null; batch_name?: string | null } | null
  } | null
}

export default async function PayrollMembersPage() {
  const supabase = await createClient()

  const { data: splitRows } = await supabase
    .from('processing_entry_members')
    .select('processed_weight_kg,member_id,batch_members(member_name,batch_id,batches(batch_code,batch_name)),processing_entries(rate_per_kg_snapshot,amount_snapshot)')

  const rows = splitRows && splitRows.length > 0
    ? splitRows
    : (
      await supabase
        .from('processing_entries')
        .select('member_id,processed_weight_kg,rate_per_kg_snapshot,batch_members(member_name,batch_id,batches(batch_code,batch_name))')
        .not('member_id', 'is', null)
    ).data

  const byMember = new Map<string, { member: string; batch: string; weight: number; estimatedAmount: number }>()

  ;((rows as MemberSplitRow[] | null) || []).forEach((row) => {
    const memberId = row.member_id || 'unknown'
    const rate = Number(row.processing_entries?.rate_per_kg_snapshot || row.rate_per_kg_snapshot || 0)
    const weight = Number(row.processed_weight_kg || 0)
    const entry = byMember.get(memberId) || {
      member: row.batch_members?.member_name || 'Unknown Member',
      batch: row.batch_members?.batches?.batch_code || row.batch_members?.batches?.batch_name || '-',
      weight: 0,
      estimatedAmount: 0,
    }

    entry.weight += weight
    entry.estimatedAmount += weight * rate
    byMember.set(memberId, entry)
  })

  const data = Array.from(byMember.values()).sort((a, b) => b.estimatedAmount - a.estimatedAmount)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll by Member</h1>
        <p className="text-muted-foreground">Member-level payroll from persisted member splits.</p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Processed (kg)</TableHead>
              <TableHead className="text-right">Estimated Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No member payroll rows.</TableCell></TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={`${row.batch}-${row.member}`}>
                  <TableCell>{row.member}</TableCell>
                  <TableCell>{row.batch}</TableCell>
                  <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{row.estimatedAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
