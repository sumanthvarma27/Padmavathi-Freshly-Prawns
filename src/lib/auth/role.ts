import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'owner' | 'accountant' | 'supervisor' | null

export async function getRoleForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<AppRole> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data || data.is_active === false) {
    return null
  }

  const role = data.role as AppRole
  return role
}

export function getHomePathForRole(role: AppRole): string {
  if (role === 'admin' || role === 'owner') return '/admin'
  if (role === 'accountant') return '/accounting'
  if (role === 'supervisor') return '/supervisor-info'
  return '/unauthorized'
}

export function isAdminRole(role: AppRole): boolean {
  return role === 'admin' || role === 'owner'
}

export function canAccessAccounting(role: AppRole): boolean {
  return role === 'accountant' || role === 'admin' || role === 'owner'
}

export async function getCurrentUserAndRole(
  supabase: SupabaseClient
): Promise<{ user: User | null; role: AppRole }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, role: null }
  }

  const role = await getRoleForUser(supabase, user.id)
  return { user, role }
}
