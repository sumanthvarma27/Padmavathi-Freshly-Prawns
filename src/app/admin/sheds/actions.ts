'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addShed(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const { error } = await supabase.from('sheds').insert({
        name,
        sort_order,
        is_active: true
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/sheds')
    revalidatePath('/admin/setup/sheds')
    return { success: true }
}

export async function updateShed(id: string, formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const { error } = await supabase
        .from('sheds')
        .update({ name, sort_order })
        .eq('shed_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/sheds')
    revalidatePath('/admin/setup/sheds')
    return { success: true }
}

export async function toggleShedActive(id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('sheds')
        .update({ is_active: !isActive })
        .eq('shed_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/sheds')
    revalidatePath('/admin/setup/sheds')
    return { success: true }
}
