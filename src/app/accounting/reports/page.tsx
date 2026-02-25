import { createClient } from '@/lib/supabase/server'
import ReportsClient from '@/app/admin/reports/client'

export default async function AccountingReportsPage() {
  const supabase = await createClient()

  const { data: summaryData, error } = await supabase
    .from('v_daily_summary')
    .select('*')
    .order('summary_date', { ascending: false })

  const { data: sheds } = await supabase.from('sheds').select('*').order('name')
  const { data: companies } = await supabase.from('companies').select('*').order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Daily summary reporting and CSV exports.</p>
      </div>

      <ReportsClient
        data={summaryData || []}
        sheds={sheds || []}
        companies={companies || []}
        hasError={!!error}
      />
    </div>
  )
}
