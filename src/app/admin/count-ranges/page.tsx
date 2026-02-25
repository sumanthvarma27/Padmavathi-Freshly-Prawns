import { createClient } from '@/lib/supabase/server'
import CountRangesClient from './client'

export default async function CountRangesPage() {
  const supabase = await createClient()

  const { data: countRanges, error } = await supabase
    .from('count_ranges')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })

  if (error) {
    return <div>Error loading count ranges: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Count Ranges</h1>
        <p className="text-muted-foreground">Manage count range labels (e.g. 51-60).</p>
      </div>
      <CountRangesClient initialRanges={countRanges || []} />
    </div>
  )
}
