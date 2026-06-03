'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV } from '@/components/nav/nav-items'
import { useMobileNav } from '@/components/nav/MobileNavContext'
import { rememberMonth, getRememberedMonth } from '@/lib/utils/persisted-month'

const MONTH_ROUTES = new Set(['/dashboard', '/budgets', '/summary', '/transactions'])

function BottomTabBarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { drawerOpen } = useMobileNav()
  const rawMonth = searchParams.get('month')
  rememberMonth(rawMonth)
  const month = rawMonth ?? getRememberedMonth()

  useEffect(() => {
    document.getElementById('page-scroll')?.scrollTo({ top: 0 })
  }, [pathname])

  function buildHref(base: string) {
    if (month && MONTH_ROUTES.has(base)) return `${base}?month=${month}`
    return base
  }

  return (
    <nav
      className={cn(
        'sticky bottom-0 grid shrink-0 border-t md:hidden',
        'grid-cols-5',
        drawerOpen && 'pointer-events-none'
      )}
      style={{
        background: 'hsl(var(--card) / 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingTop: '6px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        zIndex: 10,
      }}
    >
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={buildHref(href)}
            className={cn(
              'flex flex-col items-center gap-[3px] py-[6px] px-1 text-[10.5px] transition-colors',
              isActive ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function StaticBottomTabBar() {
  const pathname = usePathname()
  const { drawerOpen } = useMobileNav()

  return (
    <nav
      className={cn(
        'sticky bottom-0 grid shrink-0 border-t md:hidden',
        'grid-cols-5',
        drawerOpen && 'pointer-events-none'
      )}
      style={{
        background: 'hsl(var(--card) / 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingTop: '6px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        zIndex: 10,
      }}
    >
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-[3px] py-[6px] px-1 text-[10.5px] transition-colors',
              isActive ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomTabBar() {
  return (
    <Suspense fallback={<StaticBottomTabBar />}>
      <BottomTabBarInner />
    </Suspense>
  )
}
