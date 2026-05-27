import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { getCurrentUserContext } from '@/lib/queries/profile'
import { SidebarNav } from '@/components/nav/SidebarNav'
import { BottomTabBar } from '@/components/nav/BottomTabBar'
import { MobileDrawer, MobileNotificationBell } from '@/components/nav/MobileDrawer'
import { MobileNavProvider } from '@/components/nav/MobileNavContext'
import { ProfileChip } from '@/components/nav/ProfileChip'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { SidebarThemeRow } from '@/components/theme/ThemeToggle'
import { TideLogo } from '@/components/TideLogo'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUserContext()
  if (!ctx) {
    redirect('/login')
  }
  const { profile, activeHouseholdId, activeHouseholdName, memberships } = ctx

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

        {/* Theme toggle row + user chip */}
        <SidebarThemeRow />
        <Separator />
        <div className="px-2 py-2">
          <ProfileChip
            profile={profile}
            activeHouseholdId={activeHouseholdId}
            activeHouseholdName={activeHouseholdName}
            memberships={memberships}
            variant="sidebar"
          />
        </div>
      </aside>

      {/* ── Right column — wrapped in MobileNavProvider for drawer↔tab-bar state ── */}
      <MobileNavProvider>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
            {/* Mobile: hamburger + brand */}
            <div className="flex items-center gap-3 md:hidden">
              <MobileDrawer
                profile={profile}
                activeHouseholdId={activeHouseholdId}
                activeHouseholdName={activeHouseholdName}
                memberships={memberships}
              />
              <div className="flex items-center gap-2">
                <TideLogo size={24} />
                <span className="font-display text-display-wordmark font-semibold">Tide</span>
              </div>
            </div>

            {/* Desktop: spacer so Import sits on the right */}
            <div className="hidden md:block" />

            {/* Right cluster: Import (desktop) + Bell (mobile) */}
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="hidden md:flex">
                <a href="/import">
                  <Upload size={15} className="mr-1.5" />
                  Import
                </a>
              </Button>
              <MobileNotificationBell />
            </div>
          </header>

          {/* Page content */}
          <main id="page-scroll" className="flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-screen-xl px-8 py-7">{children}</div>
          </main>

          {/* Mobile bottom tab bar */}
          <BottomTabBar />
        </div>
      </MobileNavProvider>
    </div>
  )
}
