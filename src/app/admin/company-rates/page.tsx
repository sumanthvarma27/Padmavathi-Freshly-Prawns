import { createClient } from '@/lib/supabase/server'
import CompanyRatesClient from './client'

type CompanyRow = {
  company_id: string
  name: string
}

type CompanyRateJoined = {
  company_rate_id: string
  company_id: string
  rate_per_kg: number
  effective_from: string
  effective_to: string | null
  is_active: boolean
  companies?: { name?: string } | null
}

export default async function CompanyRatesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('company_id,name')
    .eq('is_active', true)
    .order('name')

  const { data: rates, error } = await supabase
    .from('company_rates')
    .select('*,companies(name)')
    .order('effective_from', { ascending: false })

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Company Rates</h1>
        <p className="text-red-600">
          Could not load company rates: {error.message}
        </p>
        <p className="text-sm text-muted-foreground">
          Create `company_rates` table (effective-dated) to enable this module.
        </p>
      </div>
    )
  }

  const formattedRates = ((rates as CompanyRateJoined[] | null) || []).map((r) => ({
    ...r,
    company_name: r.companies?.name || '-',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Rates</h1>
        <p className="text-muted-foreground">Manage effective-dated payout/revenue rates per kg for companies.</p>
      </div>
      <CompanyRatesClient
        initialRates={formattedRates}
        companies={((companies as CompanyRow[] | null) || [])}
      />
    </div>
  )
}
