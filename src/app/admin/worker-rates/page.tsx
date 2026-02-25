import { createClient } from '@/lib/supabase/server'
import WorkerRatesClient from './client'

export default async function WorkerRatesPage() {
  const supabase = await createClient()

  // Fetch all rates with joined names
  const { data: rates, error } = await supabase
    .from('worker_rates')
    .select(`
      *,
      processing_types (name),
      count_ranges (label)
    `)
    .order('effective_from', { ascending: false })

  // Lookups for the form
  const { data: processingTypes } = await supabase
    .from('processing_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: countRanges } = await supabase
    .from('count_ranges')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return <div>Error loading worker rates: {error.message}</div>
  }

  const formattedRates = (rates || []).map((r: any) => ({
    ...r,
    processing_type_name: r.processing_types?.name,
    count_range_label: r.count_ranges?.label,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Worker Rates</h1>
        <p className="text-muted-foreground">Manage effective-dated rates per kg for workers.</p>
      </div>
      <WorkerRatesClient 
        initialRates={formattedRates}
        processingTypes={processingTypes || []}
        countRanges={countRanges || []}
      />
    </div>
  )
}
