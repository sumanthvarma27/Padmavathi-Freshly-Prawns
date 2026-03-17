'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#284954] px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#315966_0%,#294f5b_38%,#224550_100%)]" />

      <Card className="relative z-10 w-full max-w-md border-white/15 bg-black/30 text-white shadow-[0_28px_90px_-40px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Login</CardTitle>
          <CardDescription className="text-slate-200/78">
            Enter your email and password to access the admin portal.
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-300/20 bg-red-500/15 p-3 text-sm text-red-100">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-100">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="border-white/15 bg-white/10 text-white placeholder:text-slate-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-100">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="border-white/15 bg-white/10 text-white"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-500" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
