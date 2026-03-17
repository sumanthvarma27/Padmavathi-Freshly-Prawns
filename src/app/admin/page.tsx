import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Factory,
  Hash,
  ListTodo,
  Package2,
  ReceiptText,
  Users2,
  Wallet,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
import { buildOperationalExportDefinitions } from '@/lib/reports/export-definitions'
import ExportHub from '@/components/exports/export-hub'

const DASHBOARD_ITEMS = [
  {
    title: 'Companies',
    href: '/admin/companies',
    description: 'Manage companies and display order for the tablet workflow.',
    icon: Building2,
  },
  {
    title: 'Sheds',
    href: '/admin/sheds',
    description: 'Maintain peeling shed masters and their availability.',
    icon: Factory,
  },
  {
    title: 'Processing Types',
    href: '/admin/processing-types',
    description: 'Keep the processing variation catalog ready for operations.',
    icon: ListTodo,
  },
  {
    title: 'Count Ranges',
    href: '/admin/count-ranges',
    description: 'Update count labels and ordering used in rates and lots.',
    icon: Hash,
  },
  {
    title: 'Batches & Members',
    href: '/admin/batches',
    description: 'Manage worker groups, QR batches, and member details.',
    icon: Users2,
  },
  {
    title: 'Worker Rates',
    href: '/admin/worker-rates',
    description: 'Maintain fixed worker payout rates by type and count.',
    icon: Wallet,
  },
  {
    title: 'Company Rates',
    href: '/admin/company-rates',
    description: 'Maintain company payout rates used for profitability.',
    icon: ReceiptText,
  },
  {
    title: 'Operations',
    href: '/admin/ops',
    description: 'Review stock inwards, lots, processing entries, and corrections.',
    icon: Package2,
  },
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { lotReports, closedLotReports, dayReports } = await getOperationalReports(supabase as never, {
    status: 'all',
  })
  const exportsList = buildOperationalExportDefinitions({ lotReports, closedLotReports, dayReports })

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-[#284954] px-4 pb-10 pt-3 sm:px-6 lg:px-8">
      <div className="fixed inset-0 -z-30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#315966_0%,#294f5b_38%,#224550_100%)]" />

      <div className="mx-auto max-w-7xl space-y-6 pt-20 md:pt-24 lg:pt-28">
        <section className="space-y-4 rounded-[30px] border border-white/14 bg-black/18 p-6 text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.48)] backdrop-blur-2xl backdrop-saturate-150 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/70">Operations Hub</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Dashboard functions</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200/78 md:text-base">
                Quick access to master data, rate setup, and day-to-day operational controls.
              </p>
            </div>
            <Link
              href="/admin/ops"
              className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/18 hover:text-white"
            >
              Open operations
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DASHBOARD_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-[28px] border border-white/12 bg-black/16 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 transition duration-200 hover:-translate-y-1 hover:border-emerald-300/45 hover:bg-emerald-400/12"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-black/22 text-emerald-100 shadow-inner shadow-white/5">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-200/76">{item.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 size-4 text-white/35 transition group-hover:text-emerald-200" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-[30px] border border-white/14 bg-black/18 p-6 text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.48)] backdrop-blur-2xl backdrop-saturate-150 md:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/70">Reports</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Exports and cross-checks</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200/78 md:text-base">
              Filter the last one month or any custom range, then export each report as PDF or Excel.
            </p>
          </div>
          <ExportHub exportsList={exportsList} />
        </section>
      </div>
    </div>
  )
}
