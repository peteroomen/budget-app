import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { getCurrentProfile } from '@/lib/queries/profile'
import { SidebarNav } from '@/components/nav/SidebarNav'
import { BottomTabBar } from '@/components/nav/BottomTabBar'
import { MobileDrawer } from '@/components/nav/MobileDrawer'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { TideLogo } from '@/components/TideLogo'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

function SidebarUserFooter({ profile }: { profile: Profile }) {
  const initials = getInitials(profile.display_name, profile.email)
  const displayName = profile.display_name ?? profile.email

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0 rounded-md">
          <AvatarFallback className="rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium leading-tight">{displayName}</p>
          <p className="truncate text-[11px] text-muted-foreground leading-tight">
            {profile.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden w-[232px] shrink-0 flex-col overflow-y-auto border-r bg-muted/40 md:flex">
        {/* Brand row */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <TideLogo size={28} />
          <div>
            <p className="font-display text-display-wordmark font-semibold leading-tight tracking-tight">
              Tide
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">Household</p>
          </div>
        </div>

        {/* Primary + secondary nav — client component owns icon imports */}
        <SidebarNav />

        {/* User footer */}
        <Separator />
        <SidebarUserFooter profile={profile} />
      </aside>

      {/* ── Right column ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
          {/* Mobile: hamburger + brand */}
          <div className="flex items-center gap-3 md:hidden">
            <MobileDrawer profile={profile} />
            <div className="flex items-center gap-2">
              <TideLogo size={24} />
              <span className="font-display text-display-wordmark font-semibold">Tide</span>
            </div>
          </div>

          {/* Desktop: spacer so Import sits on the right */}
          <div className="hidden md:block" />

          {/* Desktop: Import CTA */}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden md:flex">
              <a href="/import">
                <Upload size={15} className="mr-1.5" />
                Import
              </a>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-xl px-8 py-7">{children}</div>
        </main>

        {/* Mobile bottom tab bar */}
        <BottomTabBar />
      </div>
    </div>
  )
}
