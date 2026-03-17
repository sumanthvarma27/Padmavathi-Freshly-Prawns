import { createClient } from '@/lib/supabase/server'
import { getOperationalReports } from '@/lib/reports/operational-reporting'
import { buildOperationalExportDefinitions } from '@/lib/reports/export-definitions'
import ExportHub from '@/components/exports/export-hub'

export default async function AdminExportsPage() {
  const supabase = await createClient()
  const { lotReports, closedLotReports, dayReports } = await getOperationalReports(supabase as never, {
    status: 'all',
  })

  const exportsList = buildOperationalExportDefinitions({ lotReports, closedLotReports, dayReports })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Reports</h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Download accountant-ready PDF and Excel versions of each operational report.
        </p>
      </div>
      <ExportHub exportsList={exportsList} />
    </div>
  )
}
