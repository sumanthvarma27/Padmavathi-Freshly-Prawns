'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const COMPANY_COUNT_RANGES = [
  { label: '13-15', min_count: 13, max_count: 15, sort_order: 1 },
  { label: '16-20', min_count: 16, max_count: 20, sort_order: 2 },
  { label: '21-25', min_count: 21, max_count: 25, sort_order: 3 },
  { label: '26-30', min_count: 26, max_count: 30, sort_order: 4 },
  { label: '31-40', min_count: 31, max_count: 40, sort_order: 5 },
  { label: '41-50', min_count: 41, max_count: 50, sort_order: 6 },
  { label: '51-60', min_count: 51, max_count: 60, sort_order: 7 },
  { label: '61-70', min_count: 61, max_count: 70, sort_order: 8 },
  { label: '71-90', min_count: 71, max_count: 90, sort_order: 9 },
  { label: '91-110', min_count: 91, max_count: 110, sort_order: 10 },
  { label: '111-200', min_count: 111, max_count: 200, sort_order: 11 },
] as const

const COMMON_COMPANY_RATES = {
  '13-15': 13,
  '16-20': 13,
  '21-25': 13,
  '26-30': 13,
  '31-40': 14,
  '41-50': 16,
  '51-60': 18,
  '61-70': 20,
  '71-90': 20,
  '91-110': 23,
  '111-200': 23,
} as const

function parseRateForm(formData: FormData) {
  return {
    company_id: String(formData.get('company_id') || ''),
    processing_type_id: String(formData.get('processing_type_id') || '') || null,
    count_range_id: String(formData.get('count_range_id') || '') || null,
    rate_per_kg: Number(formData.get('rate_per_kg') || 0),
    effective_from: String(formData.get('effective_from') || ''),
    effective_to: String(formData.get('effective_to') || '') || null,
    is_active: formData.get('is_active') === 'true',
  }
}

function revalidate() {
  revalidatePath('/admin/company-rates')
  revalidatePath('/admin/rates/company')
  revalidatePath('/admin/reports/profitability')
}

async function ensureCompanyCountRanges() {
  const supabase = await createClient()
  const { error } = await supabase.from('count_ranges').upsert(
    COMPANY_COUNT_RANGES.map((range) => ({ ...range, is_active: true })),
    { onConflict: 'label' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function addCompanyRate(formData: FormData) {
  const supabase = await createClient()
  const {
    company_id,
    processing_type_id,
    count_range_id,
    rate_per_kg,
    effective_from,
    effective_to,
    is_active,
  } = parseRateForm(formData)

  if (!company_id || !processing_type_id || !count_range_id || !rate_per_kg || !effective_from) {
    return { error: 'Company, processing type, count range, rate, and effective from are required.' }
  }

  if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
    return { error: 'Effective To must be later than Effective From.' }
  }

  if (is_active) {
    const { data: overlapping, error: overlapError } = await supabase
      .from('company_rates')
      .select('company_rate_id,effective_from,effective_to')
      .eq('company_id', company_id)
      .eq('processing_type_id', processing_type_id)
      .eq('count_range_id', count_range_id)
      .eq('is_active', true)
      .or(`effective_to.is.null,effective_to.gt.${effective_from}`)

    if (overlapError) return { error: overlapError.message }

    const idsToClose: string[] = []
    for (const row of overlapping || []) {
      if (new Date(row.effective_from) < new Date(effective_from)) {
        idsToClose.push(row.company_rate_id)
        continue
      }

      return {
        success: true,
        skipped: true,
        message:
          'Skipped: a same or newer active company rate already exists for this company, processing type, and count range.',
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
    processing_type_id,
    count_range_id,
    rate_per_kg,
    effective_from,
    effective_to,
    is_active,
  })

  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      return {
        success: true,
        skipped: true,
        message: 'Skipped: this company rate already exists.',
      }
    }
    return { error: error.message }
  }

  revalidate()
  return { success: true, skipped: false, message: 'Company rate saved successfully.' }
}

export async function seedReferenceCompanyRates() {
  await ensureCompanyCountRanges()
  const supabase = await createClient()

  const [{ data: companies, error: companyError }, { data: processingTypes, error: typeError }, { data: countRanges, error: rangeError }] = await Promise.all([
    supabase.from('companies').select('company_id').eq('is_active', true),
    supabase.from('processing_types').select('processing_type_id,name').eq('is_active', true),
    supabase.from('count_ranges').select('count_range_id,label').eq('is_active', true),
  ])

  if (companyError) return { error: companyError.message }
  if (typeError) return { error: typeError.message }
  if (rangeError) return { error: rangeError.message }

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const processingTypeMap = new Map((processingTypes || []).map((type) => [normalize(type.name), type.processing_type_id]))
  const countRangeMap = new Map((countRanges || []).map((range) => [range.label, range.count_range_id]))

  const aliases: Record<string, string[]> = {
    common: ['peeleddeveined', 'pd', 'easypeel', 'tailon', 'cookedtailon', 'tailonfullcut', 'tailfullcut', 'pdfullcut'],
    shaving: ['tailonshaving', 'tailshaving', 'shaving'],
  }

  let inserted = 0
  let skipped = 0

  for (const company of companies || []) {
    for (const alias of aliases.common) {
      const processingTypeId = processingTypeMap.get(alias)
      if (!processingTypeId) continue

      for (const [label, rate] of Object.entries(COMMON_COMPANY_RATES)) {
        const countRangeId = countRangeMap.get(label)
        if (!countRangeId) continue

        const formData = new FormData()
        formData.set('company_id', company.company_id)
        formData.set('processing_type_id', processingTypeId)
        formData.set('count_range_id', countRangeId)
        formData.set('rate_per_kg', String(rate))
        formData.set('effective_from', '2026-01-01T00:00:00Z')
        formData.set('is_active', 'true')

        const response = await addCompanyRate(formData)
        if (response?.error) return { error: response.error }
        if (response?.skipped) skipped += 1
        else inserted += 1
      }
    }

    const shavingTypeId = aliases.shaving.map((alias) => processingTypeMap.get(alias)).find(Boolean)
    const shavingRangeId = countRangeMap.get('31-40')
    if (shavingTypeId && shavingRangeId) {
      const formData = new FormData()
      formData.set('company_id', company.company_id)
      formData.set('processing_type_id', shavingTypeId)
      formData.set('count_range_id', shavingRangeId)
      formData.set('rate_per_kg', '15')
      formData.set('effective_from', '2026-01-01T00:00:00Z')
      formData.set('is_active', 'true')
      const response = await addCompanyRate(formData)
      if (response?.error) return { error: response.error }
      if (response?.skipped) skipped += 1
      else inserted += 1
    }
  }

  revalidate()
  return { success: true, inserted, skipped }
}

export async function updateCompanyRate(companyRateId: string, formData: FormData) {
  const supabase = await createClient()
  const { processing_type_id, count_range_id, rate_per_kg, effective_from, effective_to } = parseRateForm(formData)

  if (!rate_per_kg || !effective_from) {
    return { error: 'Rate and effective from are required.' }
  }

  if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
    return { error: 'Effective To must be later than Effective From.' }
  }

  const { error } = await supabase
    .from('company_rates')
    .update({ processing_type_id, count_range_id, rate_per_kg, effective_from, effective_to })
    .eq('company_rate_id', companyRateId)

  if (error) return { error: error.message }
  revalidate()
  return { success: true, message: 'Company rate updated successfully.' }
}

export async function toggleCompanyRateActive(companyRateId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('company_rates')
    .update({ is_active: !isActive })
    .eq('company_rate_id', companyRateId)

  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}
