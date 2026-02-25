'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCountRange(formData: FormData) {
    const supabase = await createClient()
    const label = formData.get('label') as string
    const min_count_str = formData.get('min_count') as string
    const max_count_str = formData.get('max_count') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const min_count = min_count_str ? parseInt(min_count_str, 10) : null
    const max_count = max_count_str ? parseInt(max_count_str, 10) : null

    if (min_count !== null && max_count !== null && min_count > max_count) {
        return { error: 'Minimum count cannot be greater than maximum count' }
    }

    const { error } = await supabase.from('count_ranges').insert({
        label,
        min_count,
        max_count,
        sort_order,
        is_active: true
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/count-ranges')
    revalidatePath('/admin/setup/count-ranges')
    return { success: true }
}

export async function updateCountRange(id: string, formData: FormData) {
    const supabase = await createClient()
    const label = formData.get('label') as string
    const min_count_str = formData.get('min_count') as string
    const max_count_str = formData.get('max_count') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const min_count = min_count_str ? parseInt(min_count_str, 10) : null
    const max_count = max_count_str ? parseInt(max_count_str, 10) : null

    if (min_count !== null && max_count !== null && min_count > max_count) {
        return { error: 'Minimum count cannot be greater than maximum count' }
    }

    const { error } = await supabase
        .from('count_ranges')
        .update({ label, min_count, max_count, sort_order })
        .eq('count_range_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/count-ranges')
    revalidatePath('/admin/setup/count-ranges')
    return { success: true }
}

export async function toggleCountRangeActive(id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('count_ranges')
        .update({ is_active: !isActive })
        .eq('count_range_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/count-ranges')
    revalidatePath('/admin/setup/count-ranges')
    return { success: true }
}
