import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const OPS_LINKS = [
  {
    title: 'Stock Lots',
    href: '/admin/ops/stock-lots',
    description: 'Manage lot lifecycle: open, close, reopen with reasons.',
  },
  {
    title: 'Stock Inward',
    href: '/admin/ops/stock-inward',
    description: 'Read and export inward entries.',
  },
  {
    title: 'Processing Entries',
    href: '/admin/ops/processing-entries',
    description: 'Read and export processing rows.',
  },
  {
    title: 'Corrections & Audit',
    href: '/admin/ops/corrections',
    description: 'Edit/void with mandatory reason and audit records.',
  },
]

export default function AdminOpsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
        <p className="text-muted-foreground">Operational controls and correction workflows.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {OPS_LINKS.map((item) => (
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
