import { createClient } from '@/lib/supabase/server'
import { getRoleForUser } from '@/lib/auth/role'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function SupervisorInfoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = await getRoleForUser(supabase, user.id)
  if (role === 'admin' || role === 'owner') redirect('/admin')
  if (role === 'accountant') redirect('/accounting')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Use Tablet App</CardTitle>
          <CardDescription>
            Supervisor role is restricted to the shed tablet workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please use the Expo tablet app for stock inward and processing entry operations. Web admin and accounting modules are disabled for supervisor accounts.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline">Sign Out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
