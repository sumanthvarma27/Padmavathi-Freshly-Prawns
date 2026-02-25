import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin - Padmavathi Freshly Farms',
  description: 'Admin Portal for Padmavathi Freshly Farms',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
