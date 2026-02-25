'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addWorkerRate(formData: FormData) {
    const supabase = await createClient()

    const processing_type_id = formData.get('processing_type_id') as string
    const count_range_id = formData.get('count_range_id') as string
    const rate_per_kg = parseFloat(formData.get('rate_per_kg') as string)
    const effective_from = formData.get('effective_from') as string
    const effective_to = formData.get('effective_to') as string || null
    const is_active = formData.get('is_active') === 'true'

    if (!processing_type_id || !count_range_id || isNaN(rate_per_kg) || !effective_from) {
        return { error: 'Missing required fields' }
    }

    if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
        return { error: 'Effective To must be later than Effective From' }
    }

    // Overlap handling logic:
    // Close only older overlapping active rates. If a same/forward-dated active rate exists,
    // reject insert to avoid creating invalid timelines.
    if (is_active) {
        const { data: overlapping, error: overlapError } = await supabase
            .from('worker_rates')
            .select('worker_rate_id,effective_from,effective_to')
            .eq('processing_type_id', processing_type_id)
            .eq('count_range_id', count_range_id)
            .eq('is_active', true)
            .or(`effective_to.is.null,effective_to.gt.${effective_from}`)

        if (overlapError) {
            return { error: `Checking overlaps failed: ${overlapError.message}` }
        }

        if (overlapping && overlapping.length > 0) {
            const idsToClose: string[] = []

            for (const row of overlapping) {
                if (new Date(row.effective_from) < new Date(effective_from)) {
                    idsToClose.push(row.worker_rate_id)
                    continue
                }

                return {
                    error:
                        'A same/forward-dated active rate already exists for this type and count range. Deactivate or adjust it first.',
                }
            }

            if (idsToClose.length > 0) {
                const { error: closeError } = await supabase
                    .from('worker_rates')
                    .update({ effective_to: effective_from })
                    .in('worker_rate_id', idsToClose)

                if (closeError) {
                    return { error: `Failed to close overlapping rates: ${closeError.message}` }
                }
            }
        }
    }

    // 2. Insert new rate
    const { error } = await supabase.from('worker_rates').insert({
        processing_type_id,
        count_range_id,
        rate_per_kg,
        effective_from,
        effective_to,
        is_active
    })

    if (error) return { error: error.message }

    revalidatePath('/admin/worker-rates')
    revalidatePath('/admin/rates/worker')
    return { success: true }
}

export async function toggleWorkerRateActive(id: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('worker_rates')
        .update({ is_active: !isActive })
        .eq('worker_rate_id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/worker-rates')
    revalidatePath('/admin/rates/worker')
    return { success: true }
}
