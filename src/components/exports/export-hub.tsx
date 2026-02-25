'use client'

import { Download } from 'lucide-react'
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
