import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getRoleForUser, isAdminRole } from '@/lib/auth/role'

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

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold md:text-lg text-emerald-700"
        >
          <Image 
            src="/logo.png" 
            alt="Padmavathi Freshly Farms Logo" 
            width={40} 
            height={40} 
            className="rounded-full object-cover"
          />
          <span className="font-bold hidden sm:inline-block">Padmavathi Freshly Farms</span>
        </Link>
        <nav className="hidden md:flex flex-col gap-6 text-lg font-medium md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 ml-auto">
          <Link
            href="/admin"
            className="text-emerald-700 font-semibold transition-colors hover:text-emerald-800"
          >
            Dashboard
          </Link>
          <Link href="/admin/setup/companies" className="text-muted-foreground transition-colors hover:text-foreground">
            Setup
          </Link>
          <Link href="/admin/ops/stock-inward" className="text-muted-foreground transition-colors hover:text-foreground">
            Operations
          </Link>
          <Link href="/admin/reports/daily-summary" className="text-muted-foreground transition-colors hover:text-foreground">
            Reports
          </Link>
          <Link href="/admin/exports" className="text-muted-foreground transition-colors hover:text-foreground">
            Exports
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}
