import { createClient } from '@/lib/supabase/server'
import CompanyRatesClient from './client'

export default async function CompanyRatesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('company_id,name')
    .eq('is_active', true)
    .order('name')

  const { data: processingTypes } = await supabase
    .from('processing_types')
    .select('processing_type_id,name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: countRanges } = await supabase
    .from('count_ranges')
    .select('count_range_id,label,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: rates, error } = await supabase
    .from('company_rates')
    .select('*,companies(name),processing_types(name),count_ranges(label)')
    .order('effective_from', { ascending: false })

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Company Rates</h1>
        <p className="text-red-600">Could not load company rates: {error.message}</p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedRates = ((rates as any[] | null) || []).map((r) => ({
    ...r,
    company_name: r.companies?.name || '-',
    processing_type_name: r.processing_types?.name || '-',
    count_range_label: r.count_ranges?.label || '-',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Rates</h1>
        <p className="text-muted-foreground">Manage effective-dated payout/revenue rates per kg for companies.</p>
      </div>
      <CompanyRatesClient
        initialRates={formattedRates}
        companies={(companies as { company_id: string; name: string }[] | null) || []}
        processingTypes={(processingTypes as { processing_type_id: string; name: string }[] | null) || []}
        countRanges={(countRanges as { count_range_id: string; label: string }[] | null) || []}
      />
    </div>
  )
}
