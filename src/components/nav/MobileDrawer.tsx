'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { NavLink } from '@/components/nav/NavLink'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/components/nav/nav-items'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface MobileDrawerProps {
  profile: Profile
}

export function MobileDrawer({ profile }: MobileDrawerProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const initials = getInitials(profile.display_name, profile.email)
  const displayName = profile.display_name ?? profile.email

  function closeAndNavigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="px-4 pt-5 pb-3">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {/* User chip */}
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0 rounded-md">
                <AvatarFallback className="rounded-md bg-muted text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground leading-tight">
                  {profile.email}
                </p>
              </div>
            </div>
          </SheetHeader>

          <Separator />

          {/* All nav items */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
            {PRIMARY_NAV.map(({ href, label, icon }) => (
              <NavLink
                key={href}
                href={href}
                icon={icon}
                onClick={() => closeAndNavigate(href)}
                className="h-10 text-[15px]"
              >
                {label}
              </NavLink>
            ))}

            <Separator className="my-2" />

            {SECONDARY_NAV.map(({ href, label, icon }) => (
              <NavLink
                key={href}
                href={href}
                icon={icon}
                onClick={() => closeAndNavigate(href)}
                className="h-10 text-[15px]"
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
