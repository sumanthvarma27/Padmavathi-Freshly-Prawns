import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const REPORT_LINKS = [
  { href: '/admin/reports/daily-summary', title: 'Daily Summary', description: 'Raw vs processed view from report view.' },
  { href: '/admin/reports/payroll', title: 'Payroll by Batch', description: 'Batch-level payout totals.' },
  { href: '/admin/reports/payroll-members', title: 'Payroll by Member', description: 'Member-level payout based on split entries.' },
  { href: '/admin/reports/reconciliation', title: 'Reconciliation', description: 'Variance checks across raw and processed.' },
  { href: '/admin/reports/profitability', title: 'Profitability', description: 'Per stock inward payroll vs company value and profit/loss.' },
  { href: '/admin/reports/unbalanced', title: 'Unbalanced Alerts', description: 'Flag lots with invalid balances.' },
  { href: '/admin/reports/change-history', title: 'Change History', description: 'Master data modification audit trail.' },
]

export default function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Reporting, reconciliation, and audit visibility.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
