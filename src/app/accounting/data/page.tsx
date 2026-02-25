import { createClient } from '@/lib/supabase/server'
import StockInwardTable from '@/components/ops/stock-inward-table'
import ProcessingEntriesTable from '@/components/ops/processing-entries-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRoleForUser, isAdminRole } from '@/lib/auth/role'
import { redirect } from 'next/navigation'

type CompanyOption = { company_id: string; name: string }
type ShedOption = { shed_id: string; name: string }

export default async function AccountingDataPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getRoleForUser(supabase, user.id)
  if (!isAdminRole(role)) {
    redirect('/accounting/reports')
  }

  const [{ data: stock }, { data: processing }, { data: companies }, { data: sheds }] = await Promise.all([
    supabase.from('stock_inward').select('*,companies(name),sheds(name)').order('created_at', { ascending: false }),
    supabase
      .from('processing_entries')
      .select('*,companies(name),sheds(name),batches(batch_code,batch_name),processing_types(name),count_ranges(label)')
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('company_id,name').order('name'),
    supabase.from('sheds').select('shed_id,name').order('name'),
  ])

  const companyOptions = ((companies || []) as CompanyOption[]).map((c) => ({ id: c.company_id, name: c.name }))
  const shedOptions = ((sheds || []) as ShedOption[]).map((s) => ({ id: s.shed_id, name: s.name }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operational Data</h1>
        <p className="text-muted-foreground">Read-only operational data with filterable views.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Inward</CardTitle>
        </CardHeader>
        <CardContent>
          <StockInwardTable rows={(stock || []) as Record<string, unknown>[]} companies={companyOptions} sheds={shedOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processing Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcessingEntriesTable rows={(processing || []) as Record<string, unknown>[]} companies={companyOptions} sheds={shedOptions} />
        </CardContent>
      </Card>
    </div>
  )
}
