import { createClient } from '@/lib/supabase/server'
import ProcessingTypesClient from './client'

export default async function ProcessingTypesPage() {
  const supabase = await createClient()

  const { data: processingTypes, error } = await supabase
    .from('processing_types')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return <div>Error loading processing types: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Processing Types</h1>
        <p className="text-muted-foreground">Setup types like Headless, PD, PUD, etc.</p>
      </div>
      <ProcessingTypesClient initialTypes={processingTypes || []} />
    </div>
  )
}
