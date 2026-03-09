'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCompanyRate(formData: FormData) {
  const supabase = await createClient()

  const company_id = String(formData.get('company_id') || '')
  const rate_per_kg = Number(formData.get('rate_per_kg') || 0)
  const effective_from = String(formData.get('effective_from') || '')
  const effective_to = String(formData.get('effective_to') || '') || null
  const is_active = formData.get('is_active') === 'true'

  if (!company_id || !rate_per_kg || !effective_from) {
    return { error: 'Company, rate, and effective from are required.' }
  }

  if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
    return { error: 'Effective To must be later than Effective From.' }
  }

  if (is_active) {
    const { data: overlapping, error: overlapError } = await supabase
      .from('company_rates')
      .select('company_rate_id,effective_from,effective_to')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .or(`effective_to.is.null,effective_to.gt.${effective_from}`)

    if (overlapError) return { error: overlapError.message }

    const idsToClose: string[] = []
    for (const row of overlapping || []) {
      if (new Date(row.effective_from) < new Date(effective_from)) {
        idsToClose.push(row.company_rate_id)
      } else {
        return { error: 'A same/forward-dated active company rate already exists. Adjust that first.' }
      }
    }

    if (idsToClose.length > 0) {
      const { error: closeError } = await supabase
        .from('company_rates')
        .update({ effective_to: effective_from })
        .in('company_rate_id', idsToClose)

      if (closeError) return { error: closeError.message }
    }
  }

  const { error } = await supabase.from('company_rates').insert({
    company_id,
    rate_per_kg,
    effective_from,
    effective_to,
    is_active,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/company-rates')
  revalidatePath('/admin/rates/company')
  revalidatePath('/admin/reports/profitability')
  return { success: true }
}

export async function toggleCompanyRateActive(companyRateId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('company_rates')
    .update({ is_active: !isActive })
    .eq('company_rate_id', companyRateId)

  if (error) return { error: error.message }

  revalidatePath('/admin/company-rates')
  revalidatePath('/admin/rates/company')
  revalidatePath('/admin/reports/profitability')
  return { success: true }
}
