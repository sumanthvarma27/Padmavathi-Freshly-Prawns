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

type UnbalancedLotRow = {
  lot_id: string
  entry_date: string
  status: string
  raw_weight_kg: number
  processed_weight_kg: number
  companies?: { name?: string | null } | null
  sheds?: { name?: string | null } | null
}

export default async function UnbalancedReportPage() {
  const supabase = await createClient()

  const { data: lots } = await supabase
    .from('processing_lots')
    .select('*,companies(name),sheds(name)')
    .order('entry_date', { ascending: false })

  const rows = ((lots as UnbalancedLotRow[] | null) || []).filter((row) => Number(row.processed_weight_kg || 0) > Number(row.raw_weight_kg || 0) || Number(row.raw_weight_kg || 0) < 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Unbalanced Records</h1>
        <p className="text-muted-foreground">Data quality alerts for invalid stock balance states.</p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead className="text-right">Raw</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No unbalanced records.</TableCell></TableRow>
            ) : (
              rows.map((row) => {
                const raw = Number(row.raw_weight_kg || 0)
                const processed = Number(row.processed_weight_kg || 0)
                const balance = raw - processed
                return (
                  <TableRow key={row.lot_id}>
                    <TableCell>{row.entry_date}</TableCell>
                    <TableCell>{row.companies?.name || '-'}</TableCell>
                    <TableCell>{row.sheds?.name || '-'}</TableCell>
                    <TableCell className="text-right">{raw.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{processed.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">{balance.toFixed(2)}</TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
