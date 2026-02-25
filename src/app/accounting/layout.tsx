import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { canAccessAccounting, getRoleForUser, isAdminRole } from '@/lib/auth/role'

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = await getRoleForUser(supabase, user.id)
  if (!canAccessAccounting(role)) {
    if (role === 'supervisor') redirect('/supervisor-info')
    redirect('/unauthorized')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-6 border-b bg-white px-4 md:px-6">
        <Link href="/accounting" className="font-semibold text-lg text-slate-900">Accounting</Link>
        <nav className="ml-auto flex items-center gap-5 text-sm">
          {isAdminRole(role) ? (
            <Link href="/accounting/data" className="text-muted-foreground hover:text-foreground">Data</Link>
          ) : null}
          <Link href="/accounting/reports" className="text-muted-foreground hover:text-foreground">Reports</Link>
          <Link href="/accounting/exports" className="text-muted-foreground hover:text-foreground">Exports</Link>
          {isAdminRole(role) ? (
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link>
          ) : null}
          <span className="hidden md:inline text-muted-foreground">{user.email}</span>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">Sign Out</Button>
          </form>
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}
