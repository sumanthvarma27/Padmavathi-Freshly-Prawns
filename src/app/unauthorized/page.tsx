import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default function UnauthorizedPage() {
  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">401</h1>
        <p className="mt-4 text-lg text-gray-500">
          You are not authorized to view this page with your current role.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <form action={handleSignOut}>
            <Button type="submit">Sign Out & Return to Login</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
