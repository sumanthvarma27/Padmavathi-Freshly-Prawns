import { createClient } from '@/lib/supabase/server'
import BatchesClient from './client'

export default async function BatchesPage() {
  const supabase = await createClient()

  // Fetch batches with their shed names
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      sheds (name)
    `)
    .order('batch_code', { ascending: true })

  // Fetch all sheds for the dropdown
  const { data: sheds } = await supabase
    .from('sheds')
    .select('*')
    .order('name', { ascending: true })

  // Fetch all members
  const { data: members } = await supabase
    .from('batch_members')
    .select('*')
    .order('member_name', { ascending: true })

  if (error) {
    return <div>Error loading batches: {error.message}</div>
  }

  // Format batches
  const formattedBatches = (batches || []).map((batch: any) => ({
    ...batch,
    shed_name: batch.sheds?.name || null,
    members: (members || []).filter((m: any) => m.batch_id === batch.batch_id)
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batches & Members</h1>
        <p className="text-muted-foreground">Manage worker teams, members, and generate QR codes.</p>
      </div>
      <BatchesClient 
        initialBatches={formattedBatches} 
        sheds={sheds || []} 
      />
    </div>
  )
}
