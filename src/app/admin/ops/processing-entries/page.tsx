import { createClient } from '@/lib/supabase/server'
import ProcessingEntriesTable from '@/components/ops/processing-entries-table'

export default async function AdminProcessingEntriesPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('processing_entries')
    .select(`
      *,
      companies (name),
      sheds (name),
      batches (batch_code, batch_name),
      processing_types (name),
      count_ranges (label)
    `)
    .order('created_at', { ascending: false })

  const { data: companies } = await supabase.from('companies').select('company_id,name').order('name')
  const { data: sheds } = await supabase.from('sheds').select('shed_id,name').order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Processing Entries</h1>
        <p className="text-muted-foreground">Read-only list of processed records with rate snapshots and CSV export.</p>
      </div>
      <ProcessingEntriesTable
        rows={(rows || []) as any[]}
        companies={(companies || []).map((c: any) => ({ id: c.company_id, name: c.name }))}
        sheds={(sheds || []).map((s: any) => ({ id: s.shed_id, name: s.name }))}
      />
    </div>
  )
}
