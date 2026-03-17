import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRoleForUser, isAdminRole } from '@/lib/auth/role'
import AdminAccountMenu from '@/components/admin-account-menu'

const APP_VERSION = 'v0.1.0'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getRoleForUser(supabase, user.id)
  if (!isAdminRole(role)) {
    if (role === 'accountant') redirect('/accounting')
    if (role === 'supervisor') redirect('/supervisor-info')
    redirect('/unauthorized')
  }

  const buildDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <header className="sticky top-0 z-20 border-b border-[#6aa7a9]/20 bg-[#16343d]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-end px-4 md:px-6 lg:px-8">
          <AdminAccountMenu email={user.email || 'No email'} signOutAction={signOut} />
        </div>
      </header>
      <div className="border-b border-[#6aa7a9]/20 bg-[#1b4650] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d8fff1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:px-6 lg:px-8">
        Admin Web {APP_VERSION} | {buildDate}
      </div>
      <main className="w-full px-0 py-0">{children}</main>
    </div>
  )
}
