import { createClient } from '@/lib/supabase/server'
import CompaniesClient from './client'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return <div>Error loading companies: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground">Manage companies and sequence orders.</p>
      </div>
      <CompaniesClient initialCompanies={companies || []} />
    </div>
  )
}
