import { supabase } from './supabase'
import type { MasterData } from '../types/db'

export async function fetchMasterData(): Promise<MasterData> {
  const [companiesRes, shedsRes, batchesRes, membersRes, typesRes, rangesRes] = await Promise.all([
    supabase.from('companies').select('company_id,name,is_active').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('sheds').select('shed_id,name,is_active').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('batches').select('batch_id,batch_code,batch_name,is_active').eq('is_active', true).order('batch_code'),
    supabase.from('batch_members').select('member_id,batch_id,member_name,is_active').eq('is_active', true).order('member_name'),
    supabase.from('processing_types').select('processing_type_id,name,is_active').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('count_ranges').select('count_range_id,label,is_active').eq('is_active', true).order('sort_order').order('label'),
  ])

  if (companiesRes.error) throw companiesRes.error
  if (shedsRes.error) throw shedsRes.error
  if (batchesRes.error) throw batchesRes.error
  if (membersRes.error) throw membersRes.error
  if (typesRes.error) throw typesRes.error
  if (rangesRes.error) throw rangesRes.error

  return {
    companies: (companiesRes.data || []).map((c) => ({ id: c.company_id, label: c.name })),
    sheds: (shedsRes.data || []).map((s) => ({ id: s.shed_id, label: s.name })),
    batches: (batchesRes.data || []).map((b) => ({
      id: b.batch_id,
      label: `${b.batch_code} - ${b.batch_name}`,
      batchCode: b.batch_code,
    })),
    batchMembers: (membersRes.data || []).map((m) => ({
      id: m.member_id,
      label: m.member_name,
      batchId: m.batch_id,
    })),
    processingTypes: (typesRes.data || []).map((t) => ({ id: t.processing_type_id, label: t.name })),
    countRanges: (rangesRes.data || []).map((r) => ({ id: r.count_range_id, label: r.label })),
  }
}
