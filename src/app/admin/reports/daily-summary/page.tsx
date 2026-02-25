import { createClient } from '@/lib/supabase/server'
import ReportsClient from '../../reports/client'

export default async function DailySummaryPage() {
  const supabase = await createClient()

  const { data: summaryData, error } = await supabase
    .from('v_daily_summary')
    .select('*')
    .order('summary_date', { ascending: false })

  if (error) {
    console.warn('View v_daily_summary might not exist yet:', error.message)
  }

  const { data: sheds } = await supabase.from('sheds').select('*').order('name')
  const { data: companies } = await supabase.from('companies').select('*').order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Summary</h1>
        <p className="text-muted-foreground">Raw vs processed totals from v_daily_summary.</p>
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
