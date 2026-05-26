'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, LogOut, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/components/nav/nav-items'
import { useMobileNav } from '@/components/nav/MobileNavContext'
import { signOut } from '@/lib/actions/auth'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { Profile } from '@/types'

interface MobileDrawerProps {
  profile: Profile
}

function DrawerNavRow({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  onNavigate: (href: string) => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 py-3 text-[15px] font-medium transition-colors active:opacity-70',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <Icon size={18} strokeWidth={1.75} className={cn('shrink-0', isActive && 'text-primary')} />
      {label}
    </button>
  )
}

export function MobileDrawer({ profile }: MobileDrawerProps) {
  const { setDrawerOpen } = useMobileNav()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const initials = getInitials(profile.display_name, profile.email)
  const displayName = profile.display_name ?? profile.email

  // Sync open state into context so BottomTabBar can go inert
  useEffect(() => {
    setDrawerOpen(open)
  }, [open, setDrawerOpen])

  // Reset scroll position every time the drawer opens
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: 0 })
    }
  }, [open])

  // Close drawer, then navigate after the 220ms slide-down animation completes
  function closeAndNavigate(href: string) {
    setOpen(false)
    setTimeout(() => router.push(href), 220)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Menu"
        className="-ml-1"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          overlayClassName="bg-black/40 backdrop-blur-[2px]"
          hideDefaultClose
          className={cn(
            // Bottom-sheet shape: rounded top corners, no top border
            'rounded-t-[18px] border-t-0',
            // Height constraint
            'max-h-[85vh]',
            // Layout
            'flex flex-col p-0 gap-0'
          )}
        >
          {/* Accessible title (sr-only so we control the visible one below) */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          {/* Scrollable body */}
          <div ref={scrollRef} className="flex flex-col overflow-y-auto">
            {/* Header row */}
            <div className="flex items-center justify-between px-4 pt-5 pb-3">
              <span className="font-display text-[16px] font-semibold leading-none">Menu</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>

            {/* User chip row */}
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <Avatar className="h-9 w-9 shrink-0 rounded-full">
                <AvatarFallback className="rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium leading-tight">{displayName}</p>
                <p className="truncate text-[12px] text-muted-foreground leading-tight">
                  {profile.email}
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Full-bleed divider — negative margin escapes the px-4 panel padding */}
            <div className="mx-0 h-px bg-border" />

            {/* Nav items */}
            <nav className="flex flex-col px-3 py-3">
              {PRIMARY_NAV.map(({ href, label, icon }) => (
                <DrawerNavRow
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  onNavigate={closeAndNavigate}
                />
              ))}

              {/* Divider between primary and secondary */}
              <div className="-mx-3 my-1.5 h-px bg-border/60" />

              {SECONDARY_NAV.map(({ href, label, icon }) => (
                <DrawerNavRow
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  onNavigate={closeAndNavigate}
                />
              ))}
            </nav>

            {/* Full-bleed divider above sign-out */}
            <div className="mx-0 h-px bg-border" />

            {/* Sign-out row */}
            <div className="px-3 py-3">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-[15px] font-medium text-destructive transition-colors hover:bg-destructive/8 active:opacity-70"
                >
                  <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
                  Sign out
                </button>
              </form>
            </div>

            {/* Bottom safe-area spacer */}
            <div style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Named export of the notification bell so layout can co-locate it with the drawer button
export function MobileNotificationBell() {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="md:hidden">
      <Bell size={16} />
    </Button>
  )
}
