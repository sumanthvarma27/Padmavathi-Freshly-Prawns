'use client'

import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrintButton({ label = 'Print / Save PDF' }: { label?: string }) {
  return (
    <Button variant="outline" className="gap-2" onClick={() => window.print()}>
      <FileText className="h-4 w-4" />
      {label}
    </Button>
  )
}
