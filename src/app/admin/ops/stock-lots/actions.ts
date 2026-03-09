'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function closeStockLot(lotId: string, reason: string) {
  const supabase = await createClient()

  if (!reason.trim()) {
    return { error: 'Reason is required' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('processing_lots')
    .update({
      status: 'closed',
      closed_reason: reason,
      closed_at: new Date().toISOString(),
      closed_by: user?.id || null,
    })
    .eq('lot_id', lotId)
    .eq('status', 'open')

  if (error) return { error: error.message }

  await supabase.from('processing_lot_actions').insert({
    lot_id: lotId,
    action: 'close',
    reason,
    changed_by: user?.id || null,
  })

  revalidatePath('/admin/ops/stock-lots')
  return { success: true }
}

export async function reopenStockLot(lotId: string, reason: string) {
  const supabase = await createClient()

  if (!reason.trim()) {
    return { error: 'Reason is required' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('processing_lots')
    .update({
      status: 'open',
      closed_reason: null,
      closed_at: null,
      closed_by: null,
    })
    .eq('lot_id', lotId)
    .eq('status', 'closed')

  if (error) return { error: error.message }

  await supabase.from('processing_lot_actions').insert({
    lot_id: lotId,
    action: 'reopen',
    reason,
    changed_by: user?.id || null,
  })

  revalidatePath('/admin/ops/stock-lots')
  return { success: true }
}
