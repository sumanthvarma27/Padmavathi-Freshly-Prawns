'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCompany(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const { error } = await supabase.from('companies').insert({
        name,
        sort_order,
        is_active: true
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/companies')
    revalidatePath('/admin/setup/companies')
    return { success: true }
}

export async function updateCompany(id: string, formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

    const { error } = await supabase
        .from('companies')
        .update({ name, sort_order })
        .eq('company_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/companies')
    revalidatePath('/admin/setup/companies')
    return { success: true }
}

export async function toggleCompanyActive(id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('companies')
        .update({ is_active: !isActive })
        .eq('company_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/companies')
    revalidatePath('/admin/setup/companies')
    return { success: true }
}
