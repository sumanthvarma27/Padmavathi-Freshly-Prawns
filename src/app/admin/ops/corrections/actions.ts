'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getProcessingEntryIdColumn(supabase: Awaited<ReturnType<typeof createClient>>) {
  const probe = await supabase.from('processing_entries').select('entry_id').limit(1)
  if (!probe.error) return 'entry_id'
  return 'processing_entry_id'
}

async function insertAuditSafe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Record<string, unknown>
) {
  const primary = await supabase.from('processing_entry_audit').insert({
    processing_entry_id: payload.processing_entry_id,
    action: payload.action,
    reason: payload.reason,
    changed_by: payload.changed_by,
    before_data: payload.before_data,
    after_data: payload.after_data,
  })

  if (!primary.error) return

  // Compatibility path for schema variants that use entry_id instead of processing_entry_id.
  await supabase.from('processing_entry_audit').insert({
    entry_id: payload.processing_entry_id,
    action: payload.action,
    reason: payload.reason,
    changed_by: payload.changed_by,
    before_data: payload.before_data,
    after_data: payload.after_data,
  } as any)
}

export async function voidProcessingEntry(entryId: string, reason: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!reason.trim()) {
    return { error: 'Reason is required' }
  }

  const rpcPrimary = await supabase.rpc('void_processing_entry', {
    p_processing_entry_id: entryId,
    p_reason: reason,
    p_actor: user?.id || null,
  })
  if (!rpcPrimary.error) {
    revalidatePath('/admin/ops/corrections')
    revalidatePath('/admin/ops/processing-entries')
    return { success: true }
  }

  const rpcSecondary = await supabase.rpc('void_processing_entry', {
    p_entry_id: entryId,
    p_reason: reason,
    p_actor: user?.id || null,
  } as any)

  if (!rpcSecondary.error) {
    revalidatePath('/admin/ops/corrections')
    revalidatePath('/admin/ops/processing-entries')
    return { success: true }
  }

  // Fallback for environments where RPC is not available yet.
  const idColumn = await getProcessingEntryIdColumn(supabase)
  const { data: row, error: fetchError } = await supabase
    .from('processing_entries')
    .select('*')
    .eq(idColumn, entryId)
    .single()

  if (fetchError || !row) return { error: fetchError?.message || rpcPrimary.error?.message || 'Entry not found' }

  if (row.lot_id) {
    const { data: lot } = await supabase
      .from('processing_lots')
      .select('processed_weight_kg')
      .eq('lot_id', row.lot_id)
      .maybeSingle()

    const nextProcessed = Math.max(
      0,
      Number(lot?.processed_weight_kg || 0) - Number(row.processed_weight_kg || 0)
    )

    await supabase
      .from('processing_lots')
      .update({ processed_weight_kg: Number(nextProcessed.toFixed(3)) })
      .eq('lot_id', row.lot_id)
  }

  await insertAuditSafe(supabase, {
    processing_entry_id: entryId,
    action: 'void',
    reason,
    changed_by: user?.id || null,
    before_data: row,
    after_data: null,
  })

  const memberDelete = await supabase
    .from('processing_entry_members')
    .delete()
    .eq('processing_entry_id', entryId)

  if (memberDelete.error) {
    await supabase
      .from('processing_entry_members')
      .delete()
      .eq('entry_id', entryId as any)
  }

  const deleteRes = await supabase
    .from('processing_entries')
    .delete()
    .eq(idColumn, entryId)

  if (deleteRes.error) return { error: deleteRes.error.message }

  revalidatePath('/admin/ops/corrections')
  revalidatePath('/admin/ops/processing-entries')
  return { success: true }
}

export async function editProcessingWeight(entryId: string, processedWeightKg: number, reason: string) {
  const supabase = await createClient()
  if (!reason.trim()) {
    return { error: 'Reason is required' }
  }

  if (!(processedWeightKg > 0)) {
    return { error: 'Weight must be > 0' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle()
    : { data: null as { role?: string } | null }

  const idColumn = await getProcessingEntryIdColumn(supabase)
  const { data: row, error: fetchError } = await supabase
    .from('processing_entries')
    .select('*')
    .eq(idColumn, entryId)
    .single()

  if (fetchError || !row) return { error: fetchError?.message || 'Entry not found' }

  const entryDate = new Date(row.entry_date)
  const now = new Date()
  const isSameDay =
    entryDate.getUTCFullYear() === now.getUTCFullYear() &&
    entryDate.getUTCMonth() === now.getUTCMonth() &&
    entryDate.getUTCDate() === now.getUTCDate()

  // Default restriction: same day edits only; owner can override.
  if (!isSameDay && profile?.role !== 'owner') {
    return { error: 'Edit allowed only on same day entries' }
  }

  const rate = Number(row.rate_per_kg_snapshot || 0)
  const newAmount = Number((processedWeightKg * rate).toFixed(2))

  const { error: updateError } = await supabase
    .from('processing_entries')
    .update({
      processed_weight_kg: processedWeightKg,
      amount_snapshot: newAmount,
    })
    .eq(idColumn, entryId)

  if (updateError) return { error: updateError.message }

  await insertAuditSafe(supabase, {
    processing_entry_id: entryId,
    action: 'update',
    reason,
    changed_by: user?.id || null,
    before_data: row,
    after_data: {
      ...row,
      processed_weight_kg: processedWeightKg,
      amount_snapshot: newAmount,
    },
  })

  revalidatePath('/admin/ops/corrections')
  revalidatePath('/admin/ops/processing-entries')
  return { success: true }
}
