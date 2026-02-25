import { createClient } from '@/lib/supabase/server'
import ShedsClient from './client'

export default async function ShedsPage() {
  const supabase = await createClient()

  const { data: sheds, error } = await supabase
    .from('sheds')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return <div>Error loading sheds: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sheds</h1>
        <p className="text-muted-foreground">Manage peeling sheds.</p>
      </div>
      <ShedsClient initialSheds={sheds || []} />
    </div>
  )
}
