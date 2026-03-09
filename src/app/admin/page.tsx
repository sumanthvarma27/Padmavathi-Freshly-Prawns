import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Factory,
  Building2,
  ListTodo,
  Hash,
  Users2,
  Banknote,
  LineChart,
  Briefcase,
  AlertTriangle,
} from 'lucide-react'

const CARDS = [
  {
    title: 'Companies',
    href: '/admin/setup/companies',
    icon: Building2,
    description: 'Manage companies and sequence orders.',
  },
  {
    title: 'Sheds',
    href: '/admin/setup/sheds',
    icon: Factory,
    description: 'Manage peeling sheds.',
  },
  {
    title: 'Processing Types',
    href: '/admin/setup/processing-types',
    icon: ListTodo,
    description: 'Setup types like Headless, PD, PUD, etc.',
  },
  {
    title: 'Count Ranges',
    href: '/admin/setup/count-ranges',
    icon: Hash,
    description: 'Manage count range labels (e.g. 51-60).',
  },
  {
    title: 'Batches & Members',
    href: '/admin/setup/batches',
    icon: Users2,
    description: 'Manage worker teams and QR codes.',
  },
  {
    title: 'Worker Rates',
    href: '/admin/rates/worker',
    icon: Banknote,
    description: 'Effective-dated rates per processing type and count range.',
  },
  {
    title: 'Company Rates',
    href: '/admin/rates/company',
    icon: Briefcase,
    description: 'Company-specific effective-dated rates for profitability.',
  },
  {
    title: 'Daily Summary',
    href: '/admin/reports/daily-summary',
    icon: LineChart,
    description: 'Raw vs processed monitoring from v_daily_summary.',
  },
  {
    title: 'Stock Inward Ops',
    href: '/admin/ops/stock-inward',
    icon: Factory,
    description: 'Filter and export stock inward entries.',
  },
  {
    title: 'Stock Lots',
    href: '/admin/ops/stock-lots',
    icon: Factory,
    description: 'Open/close/reopen stock lots with balance tracking.',
  },
  {
    title: 'Processing Ops',
    href: '/admin/ops/processing-entries',
    icon: ListTodo,
    description: 'Filter and export processing entries.',
  },
  {
    title: 'Payroll Report',
    href: '/admin/reports/payroll',
    icon: Banknote,
    description: 'Batch-level payroll totals from snapshots.',
  },
  {
    title: 'Payroll by Member',
    href: '/admin/reports/payroll-members',
    icon: Banknote,
    description: 'Member-level payroll from processing entry splits.',
  },
  {
    title: 'Reconciliation',
    href: '/admin/reports/reconciliation',
    icon: LineChart,
    description: 'Raw vs processed vs variance overview.',
  },
  {
    title: 'Profitability',
    href: '/admin/reports/profitability',
    icon: LineChart,
    description: 'Per stock inward profitability with day totals.',
  },
  {
    title: 'Unbalanced Alerts',
    href: '/admin/reports/unbalanced',
    icon: AlertTriangle,
    description: 'Detect invalid lot balance states quickly.',
  },
  {
    title: 'Corrections & Audit',
    href: '/admin/ops/corrections',
    icon: ListTodo,
    description: 'Void/edit entries with reason and audit trail.',
  },
  {
    title: 'Change History',
    href: '/admin/reports/change-history',
    icon: Briefcase,
    description: 'Master-data change tracking by table and time.',
  },
  {
    title: 'Exports',
    href: '/admin/exports',
    icon: Briefcase,
    description: 'Download stock, processing, payroll, and summary CSVs.',
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage Master Data and configuration for the tablet app.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href} className="flex">
              <Card className="flex-1 transition-all hover:border-primary cursor-pointer hover:shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-emerald-600" />
                    {card.title}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
