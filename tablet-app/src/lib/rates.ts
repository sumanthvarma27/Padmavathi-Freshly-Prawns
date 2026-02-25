import { supabase } from './supabase'

export async function getWorkerRate(params: {
  processingTypeId: string
  countRangeId: string
  effectiveAt: string
}): Promise<number> {
  const rpcAttempts: Array<Record<string, string>> = [
    {
      p_processing_type_id: params.processingTypeId,
      p_count_range_id: params.countRangeId,
      p_effective_at: params.effectiveAt,
    },
    {
      processing_type_id: params.processingTypeId,
      count_range_id: params.countRangeId,
      effective_at: params.effectiveAt,
    },
    {
      p_processing_type_id: params.processingTypeId,
      p_count_range_id: params.countRangeId,
    },
  ]

  for (const rpcParams of rpcAttempts) {
    const { data, error } = await supabase.rpc('get_worker_rate', rpcParams)
    if (error) continue
    if (typeof data === 'number') return data
    if (typeof data === 'string' && !Number.isNaN(Number(data))) return Number(data)
    if (data && typeof data === 'object' && 'rate_per_kg' in (data as Record<string, unknown>)) {
      const value = Number((data as { rate_per_kg: unknown }).rate_per_kg)
      if (!Number.isNaN(value)) return value
    }
  }

  const { data, error } = await supabase
    .from('worker_rates')
    .select('rate_per_kg,effective_from,effective_to,is_active')
    .eq('processing_type_id', params.processingTypeId)
    .eq('count_range_id', params.countRangeId)
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Rate not found for selected type and count range')
  }

  return Number(data[0].rate_per_kg)
}
