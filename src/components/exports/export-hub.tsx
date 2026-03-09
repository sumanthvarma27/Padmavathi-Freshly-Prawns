'use client'

import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ExportDefinition = {
  key: string
  title: string
  description: string
  headers: string[]
  rows: string[][]
  filenamePrefix: string
}

function buildCsv(headers: string[], rows: string[][]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
  const tableRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { color: #475569; margin-top: 0; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
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

export default function ExportHub({ exportsList }: { exportsList: ExportDefinition[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {exportsList.map((item) => (
        <Card key={item.key}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={item.rows.length === 0}
                className="gap-2"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10)
                  const csv = buildCsv(item.headers, item.rows)
                  download(`${item.filenamePrefix}_${today}.csv`, csv)
                }}
              >
                <Download className="h-4 w-4" />
                Export CSV ({item.rows.length})
              </Button>
              <Button
                disabled={item.rows.length === 0}
                variant="outline"
                className="gap-2"
                onClick={() => openPrintWindow(item.title, item.headers, item.rows)}
              >
                <FileText className="h-4 w-4" />
                Save as PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
