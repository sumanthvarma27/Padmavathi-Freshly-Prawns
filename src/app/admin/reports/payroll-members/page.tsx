import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PrintButton from '@/components/reports/print-button'

export default async function PayrollMembersPage() {
  const supabase = await createClient()
  const { lotReports } = await getOperationalReports(supabase as never, { status: 'all' })

  const byMember = new Map<string, { member: string; batch: string; weight: number; payout: number }>()

  lotReports.forEach((lot) => {
    lot.memberPayouts.forEach((member) => {
      const current = byMember.get(member.memberId) || {
        member: member.memberName,
        batch: member.batchLabel,
        weight: 0,
        payout: 0,
      }
      current.weight += member.processedWeightKg
      current.payout += member.payoutAmount
      byMember.set(member.memberId, current)
    })
  })

  const data = Array.from(byMember.values()).sort((a, b) => b.payout - a.payout)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll by Member</h1>
          <p className="text-muted-foreground">Member-level payroll from persisted split weights and worker rate snapshots.</p>
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
              <TableHead className="text-right">Payout Amount</TableHead>
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
                  <TableCell className="text-right font-semibold">{row.payout.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
