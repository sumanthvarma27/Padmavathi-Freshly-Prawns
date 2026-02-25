'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addProcessingType(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const { error } = await supabase.from('processing_types').insert({
        name,
        sort_order,
        is_active: true
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/processing-types')
    revalidatePath('/admin/setup/processing-types')
    return { success: true }
}

export async function updateProcessingType(id: string, formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const { error } = await supabase
        .from('processing_types')
        .update({ name, sort_order })
        .eq('processing_type_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/processing-types')
    revalidatePath('/admin/setup/processing-types')
    return { success: true }
}

export async function toggleProcessingTypeActive(id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('processing_types')
        .update({ is_active: !isActive })
        .eq('processing_type_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/processing-types')
    revalidatePath('/admin/setup/processing-types')
    return { success: true }
}
