'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ExportDefinition } from '@/lib/reports/export-definitions'

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10)
}

function getDefaultStartDate() {
  const today = new Date()
  const priorMonth = new Date(today)
  priorMonth.setMonth(today.getMonth() - 1)
  return formatDateInput(priorMonth)
}

function getDefaultEndDate() {
  return formatDateInput(new Date())
}

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildExcelXml(sheetName: string, headers: string[], rows: string[][]) {
  const safeSheet = xmlEscape(sheetName.slice(0, 31))
  const makeCell = (value: string) => `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`
  const headerRow = `<Row>${headers.map(makeCell).join('')}</Row>`
  const bodyRows = rows.map((row) => `<Row>${row.map(makeCell).join('')}</Row>`).join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="${safeSheet}">
    <Table>
      ${headerRow}
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`
}

function download(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function openPrintWindow(title: string, headers: string[], rows: string[][]) {
  const tableHead = headers.map((h) => `<th>${h}</th>`).join('')
  const tableRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; margin: 28px; color: #0f172a; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #475569; margin-top: 0; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated at ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</p>
  <table>
    <thead><tr>${tableHead}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}

function findDateColumnIndex(headers: string[]) {
  const candidates = ['report date', 'entry date', 'date', 'closed date']
  return headers.findIndex((header) => candidates.includes(header.toLowerCase()))
}

function isDateWithinRange(value: string, startDate: string, endDate: string) {
  const normalized = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return true
  if (startDate && normalized < startDate) return false
  if (endDate && normalized > endDate) return false
  return true
}

export default function ExportHub({ exportsList }: { exportsList: ExportDefinition[] }) {
  const [startDate, setStartDate] = useState(getDefaultStartDate)
  const [endDate, setEndDate] = useState(getDefaultEndDate)

  const filteredExports = useMemo(() => {
    return exportsList.map((item) => {
      const dateColumnIndex = findDateColumnIndex(item.headers)
      if (dateColumnIndex === -1) {
        return { ...item, filteredRows: item.rows }
      }

      const filteredRows = item.rows.filter((row) => {
        const value = row[dateColumnIndex] || ''
        return isDateWithinRange(value, startDate, endDate)
      })

      return { ...item, filteredRows }
    })
  }, [exportsList, startDate, endDate])

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100/85">
              <CalendarDays className="size-4" />
              Report Date Range
            </div>
            <p className="mt-1 text-sm text-slate-200/68">
              Default selection covers the previous one month up to today.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-100/82">
              <span>Start Date</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-white/15 bg-black/20 text-white [color-scheme:dark]"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-100/82">
              <span>End Date</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-white/15 bg-black/20 text-white [color-scheme:dark]"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(5,18,24,0.48),rgba(4,16,22,0.38))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200/62 md:px-6">
          <div>Report</div>
          <div>Actions</div>
        </div>
        <div className="divide-y divide-white/10">
          {filteredExports.map((item) => (
            <div key={item.key} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6">
              <div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-200/74">{item.description}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-100/48">
                  {item.filteredRows.length} rows in selected range
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Button
                  disabled={item.filteredRows.length === 0}
                  className="gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/18 px-5 text-emerald-50 hover:bg-emerald-500/28"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10)
                    const workbook = buildExcelXml(item.title, item.headers, item.filteredRows)
                    download(`${item.filenamePrefix}_${today}.xls`, workbook, 'application/vnd.ms-excel')
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
                <Button
                  disabled={item.filteredRows.length === 0}
                  variant="outline"
                  className="gap-2 rounded-full border-white/20 bg-white/8 px-5 text-white hover:bg-white/14 hover:text-white"
                  onClick={() => openPrintWindow(item.title, item.headers, item.filteredRows)}
                >
                  <FileText className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
