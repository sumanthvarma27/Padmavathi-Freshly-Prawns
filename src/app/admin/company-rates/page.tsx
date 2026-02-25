import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default function CompanyRatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Rates</h1>
        <p className="text-muted-foreground">Manage effective-dated rates per kg for companies.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 border-dashed">
        <CardHeader className="items-center pb-2">
          <div className="rounded-full bg-emerald-100 p-3 mb-4">
            <Construction className="h-6 w-6 text-emerald-700" />
          </div>
          <CardTitle className="text-2xl">Phase 2</CardTitle>
          <CardDescription className="max-w-md mt-2 text-base">
            This module is scheduled for Phase 2 development. It will function similarly to Worker Rates, including company selection and overlap-safe insertion.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
