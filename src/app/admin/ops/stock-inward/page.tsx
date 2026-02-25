import { createClient } from '@/lib/supabase/server'
import StockInwardTable from '@/components/ops/stock-inward-table'

export default async function AdminStockInwardPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('stock_inward')
    .select(`
      *,
      companies (name),
      sheds (name)
    `)
    .order('created_at', { ascending: false })

  const { data: companies } = await supabase.from('companies').select('company_id,name').order('name')
  const { data: sheds } = await supabase.from('sheds').select('shed_id,name').order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Inward</h1>
        <p className="text-muted-foreground">Read-only list of inward entries with filters and CSV export.</p>
      </div>
      <StockInwardTable
        rows={(rows || []) as any[]}
        companies={(companies || []).map((c: any) => ({ id: c.company_id, name: c.name }))}
        sheds={(sheds || []).map((s: any) => ({ id: s.shed_id, name: s.name }))}
      />
    </div>
  )
}
