'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const WORKER_COUNT_RANGES = [
  { label: '8-20', min_count: 8, max_count: 20, sort_order: 1 },
  { label: '8-30', min_count: 8, max_count: 30, sort_order: 2 },
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

const WORKER_RATE_SEED = {
  'Peeled & Deveined': {
    '8-30': 8,
    '31-40': 10.5,
    '41-50': 12,
    '51-60': 13,
    '61-70': 16,
    '71-90': 17,
    '91-110': 18,
    '111-200': 18,
  },
  'Easy Peel': {
    '8-20': 7,
    '21-25': 7.5,
    '26-30': 8,
    '31-40': 9,
    '41-50': 10,
  },
  'Tail On': {
    '31-40': 10,
    '41-50': 12,
    '51-60': 13,
    '61-70': 16,
    '71-90': 17,
    '91-110': 18,
    '111-200': 18,
  },
  'Cooked Tail On': {
    '8-30': 8,
    '31-40': 10.5,
    '41-50': 12,
    '51-60': 13,
    '61-70': 16,
    '71-90': 17,
    '91-110': 18,
    '111-200': 18,
  },
  'Tail-On Full Cut': {
    '8-30': 8,
    '31-40': 10.5,
    '41-50': 12,
    '51-60': 13,
    '61-70': 16,
    '71-90': 17,
    '91-110': 18,
    '111-200': 18,
  },
  'PD Full Cut': {
    '8-30': 8,
    '31-40': 10.5,
    '41-50': 12,
    '51-60': 13,
    '61-70': 16,
    '71-90': 17,
    '91-110': 18,
    '111-200': 18,
  },
  'Tail-On Shaving': {
    '31-40': 10,
  },
} as const

type SeedResult = { inserted: number; skipped: number; missingTypes: string[] }

function revalidate() {
  revalidatePath('/admin/worker-rates')
  revalidatePath('/admin/rates/worker')
}

async function ensureCountRanges() {
  const supabase = await createClient()
  const { error } = await supabase.from('count_ranges').upsert(
    WORKER_COUNT_RANGES.map((range) => ({ ...range, is_active: true })),
    { onConflict: 'label' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function addWorkerRate(formData: FormData) {
  const supabase = await createClient()

  const processing_type_id = formData.get('processing_type_id') as string
  const count_range_id = formData.get('count_range_id') as string
  const rate_per_kg = parseFloat(formData.get('rate_per_kg') as string)
  const effective_from = formData.get('effective_from') as string
  const effective_to = (formData.get('effective_to') as string) || null
  const is_active = formData.get('is_active') === 'true'

  if (!processing_type_id || !count_range_id || Number.isNaN(rate_per_kg) || !effective_from) {
    return { error: 'Missing required fields' }
  }

  if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
    return { error: 'Effective To must be later than Effective From' }
  }

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

    const idsToClose: string[] = []

    for (const row of overlapping || []) {
      if (new Date(row.effective_from) < new Date(effective_from)) {
        idsToClose.push(row.worker_rate_id)
        continue
      }

      return {
        success: true,
        skipped: true,
        message:
          'Skipped: a same or newer active worker rate already exists for this processing type and count range.',
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

  const { error } = await supabase.from('worker_rates').insert({
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
        message: 'Skipped: this worker rate already exists.',
      }
    }
    return { error: error.message }
  }

  revalidate()
  return { success: true, skipped: false, message: 'Worker rate saved successfully.' }
}

export async function seedReferenceWorkerRates() {
  await ensureCountRanges()
  const supabase = await createClient()

  const { data: processingTypes, error: typeError } = await supabase
    .from('processing_types')
    .select('processing_type_id,name')
    .eq('is_active', true)

  if (typeError) {
    return { error: typeError.message }
  }

  const { data: countRanges, error: rangeError } = await supabase
    .from('count_ranges')
    .select('count_range_id,label')
    .eq('is_active', true)

  if (rangeError) {
    return { error: rangeError.message }
  }

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const processingTypeMap = new Map(
    (processingTypes || []).map((type) => [normalize(type.name), type.processing_type_id])
  )
  const countRangeMap = new Map(
    (countRanges || []).map((range) => [range.label, range.count_range_id])
  )

  const aliases: Record<string, string[]> = {
    'Peeled & Deveined': ['peeleddeveined', 'pd'],
    'Easy Peel': ['easypeel'],
    'Tail On': ['tailon'],
    'Cooked Tail On': ['cookedtailon'],
    'Tail-On Full Cut': ['tailonfullcut', 'tailfullcut'],
    'PD Full Cut': ['pdfullcut'],
    'Tail-On Shaving': ['tailonshaving', 'tailshaving', 'shaving'],
  }

  const result: SeedResult = { inserted: 0, skipped: 0, missingTypes: [] }

  for (const [typeName, rates] of Object.entries(WORKER_RATE_SEED)) {
    const processingTypeId = aliases[typeName]
      .map((alias) => processingTypeMap.get(alias))
      .find(Boolean)

    if (!processingTypeId) {
      result.missingTypes.push(typeName)
      continue
    }

    for (const [label, rate] of Object.entries(rates)) {
      const countRangeId = countRangeMap.get(label)
      if (!countRangeId) continue

      const formData = new FormData()
      formData.set('processing_type_id', processingTypeId)
      formData.set('count_range_id', countRangeId)
      formData.set('rate_per_kg', String(rate))
      formData.set('effective_from', '2026-01-01T00:00:00Z')
      formData.set('is_active', 'true')

      const response = await addWorkerRate(formData)
      if (response?.error) {
        return { error: response.error }
      }
      if (response?.skipped) {
        result.skipped += 1
      } else {
        result.inserted += 1
      }
    }
  }

  revalidate()
  return {
    success: true,
    inserted: result.inserted,
    skipped: result.skipped,
    missingTypes: result.missingTypes,
  }
}

export async function updateWorkerRate(id: string, formData: FormData) {
  const supabase = await createClient()

  const rate_per_kg = parseFloat(formData.get('rate_per_kg') as string)
  const effective_from = formData.get('effective_from') as string
  const effective_to = (formData.get('effective_to') as string) || null

  if (Number.isNaN(rate_per_kg) || !effective_from) {
    return { error: 'Rate and effective from are required.' }
  }

  if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
    return { error: 'Effective To must be later than Effective From.' }
  }

  const { error } = await supabase
    .from('worker_rates')
    .update({ rate_per_kg, effective_from, effective_to })
    .eq('worker_rate_id', id)

  if (error) return { error: error.message }
  revalidate()
  return { success: true, message: 'Worker rate updated successfully.' }
}

export async function toggleWorkerRateActive(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('worker_rates')
    .update({ is_active: !isActive })
    .eq('worker_rate_id', id)

  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}
