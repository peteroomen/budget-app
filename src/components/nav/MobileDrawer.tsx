'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ProfileChip } from '@/components/nav/ProfileChip'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/components/nav/nav-items'
import { useMobileNav } from '@/components/nav/MobileNavContext'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { HouseholdMembership, Profile } from '@/types'

interface MobileDrawerProps {
  profile: Profile
  activeHouseholdId: string | null
  activeHouseholdName: string | null
  memberships: HouseholdMembership[]
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

export function MobileDrawer({
  profile,
  activeHouseholdId,
  activeHouseholdName,
  memberships,
}: MobileDrawerProps) {
  const { setDrawerOpen } = useMobileNav()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDrawerOpen(open)
  }, [open, setDrawerOpen])

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: 0 })
    }
  }, [open])

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
          className={cn('rounded-t-[18px] border-t-0', 'max-h-[85vh]', 'flex flex-col p-0 gap-0')}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <div ref={scrollRef} className="flex flex-col overflow-y-auto">
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

            {/* Profile chip (avatar + name + household subtitle, popover with switcher + sign-out) */}
            <div className="flex items-center gap-2 pl-1 pr-3">
              <div className="min-w-0 flex-1">
                <ProfileChip
                  profile={profile}
                  activeHouseholdId={activeHouseholdId}
                  activeHouseholdName={activeHouseholdName}
                  memberships={memberships}
                  variant="mobile"
                />
              </div>
              <ThemeToggle />
            </div>

            <div className="mx-0 h-px bg-border" />

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

            <div style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function MobileNotificationBell() {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="md:hidden">
      <Bell size={16} />
    </Button>
  )
}
