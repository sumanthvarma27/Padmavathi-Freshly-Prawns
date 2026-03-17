'use client'

import { CircleUserRound, LogOut, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function AdminAccountMenu({
  email,
  signOutAction,
}: {
  email: string
  signOutAction: () => Promise<void>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          <CircleUserRound className="size-5" />
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2">
        <DropdownMenuLabel className="space-y-1 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Account</div>
          <div className="flex items-start gap-2 text-sm font-medium text-foreground">
            <Mail className="mt-0.5 size-4 text-emerald-700" />
            <span className="break-all">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-3" variant="destructive">
          <form action={signOutAction} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2 text-left">
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
