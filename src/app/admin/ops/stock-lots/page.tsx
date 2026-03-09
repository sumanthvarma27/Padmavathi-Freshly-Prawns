import { createClient } from '@/lib/supabase/server'
import { closeStockLot, reopenStockLot } from './actions'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function StockLotsOpsPage() {
  const supabase = await createClient()

  const { data: lots } = await supabase
    .from('processing_lots')
    .select('*,companies(name),sheds(name)')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Lots</h1>
        <p className="text-muted-foreground">DB-backed lot lifecycle with close/reopen controls.</p>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shed</TableHead>
              <TableHead className="text-right">Raw (kg)</TableHead>
              <TableHead className="text-right">Processed (kg)</TableHead>
              <TableHead className="text-right">Balance (kg)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(lots || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No lots available.</TableCell>
              </TableRow>
            ) : (
              (lots || []).map((lot: any) => {
                const raw = Number(lot.raw_weight_kg || 0)
                const processed = Number(lot.processed_weight_kg || 0)
                const balance = raw - processed

                return (
                  <TableRow key={lot.lot_id}>
                    <TableCell>{lot.entry_date}</TableCell>
                    <TableCell>{lot.companies?.name || '-'}</TableCell>
                    <TableCell>{lot.sheds?.name || '-'}</TableCell>
                    <TableCell className="text-right">{raw.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{processed.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{balance.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${lot.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {lot.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {lot.status === 'open' ? (
                        <form
                          action={async () => {
                            'use server'
                            await closeStockLot(lot.lot_id, 'Closed from admin stock lots page')
                          }}
                        >
                          <Button variant="outline" size="sm" type="submit">Close</Button>
                        </form>
                      ) : (
                        <form
                          action={async () => {
                            'use server'
                            await reopenStockLot(lot.lot_id, 'Reopened from admin stock lots page')
                          }}
                        >
                          <Button variant="outline" size="sm" type="submit">Reopen</Button>
                        </form>
                      )}
                    </TableCell>
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
