'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBatch(formData: FormData) {
    const supabase = await createClient()
    const batch_code = formData.get('batch_code') as string
    const batch_name = formData.get('batch_name') as string
    const leader_name = formData.get('leader_name') as string
    const shed_id_raw = formData.get('shed_id') as string
    const shed_id = shed_id_raw && shed_id_raw !== 'none' ? shed_id_raw : null

    const { error } = await supabase.from('batches').insert({
        batch_code,
        batch_name,
        leader_name,
        shed_id,
        is_active: true
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/batches')
    revalidatePath('/admin/setup/batches')
    return { success: true }
}

export async function updateBatch(id: string, formData: FormData) {
    const supabase = await createClient()
    const batch_code = formData.get('batch_code') as string
    const batch_name = formData.get('batch_name') as string
    const leader_name = formData.get('leader_name') as string
    const shed_id_raw = formData.get('shed_id') as string
    const shed_id = shed_id_raw && shed_id_raw !== 'none' ? shed_id_raw : null

    const { error } = await supabase
        .from('batches')
        .update({
            batch_code,
            batch_name,
            leader_name,
            shed_id
        })
        .eq('batch_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/batches')
    revalidatePath('/admin/setup/batches')
    return { success: true }
}

export async function toggleBatchActive(id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('batches')
        .update({ is_active: !isActive })
        .eq('batch_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/batches')
    revalidatePath('/admin/setup/batches')
    return { success: true }
}

export async function addBatchMember(batch_id: string, member_name: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('batch_members').insert({
        batch_id,
        member_name,
        is_active: true
    })
    if (error) return { error: error.message }
    revalidatePath('/admin/batches')
    revalidatePath('/admin/setup/batches')
    return { success: true }
}

export async function bulkAddBatchMembers(batch_id: string, namesText: string) {
    const supabase = await createClient()
    const names = namesText.split('\n').map(n => n.trim()).filter(n => n.length > 0)

    if (names.length === 0) return { error: 'No valid names provided' }

    const inserts = names.map(name => ({
        batch_id,
        member_name: name,
        is_active: true
    }))

    const { error } = await supabase.from('batch_members').insert(inserts)

    if (error) return { error: error.message }
    revalidatePath('/admin/batches')
    revalidatePath('/admin/setup/batches')
    return { success: true }
}

export async function toggleBatchMemberActive(member_id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('batch_members')
        .update({ is_active: !isActive })
        .eq('member_id', member_id)

    if (error) return { error: error.message }
    revalidatePath('/admin/batches')
    revalidatePath('/admin/setup/batches')
    return { success: true }
}
