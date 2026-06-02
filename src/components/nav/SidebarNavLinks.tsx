'use client'

import { useSearchParams } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { NavLink } from '@/components/nav/NavLink'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/components/nav/nav-items'

const MONTH_ROUTES = new Set(['/dashboard', '/budgets', '/summary', '/transactions'])

export function SidebarNavLinks() {
  const searchParams = useSearchParams()
  const month = searchParams.get('month')

  function buildHref(base: string) {
    if (month && MONTH_ROUTES.has(base)) return `${base}?month=${month}`
    return base
  }

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-2">
      {PRIMARY_NAV.map(({ href, label, icon }) => (
        <NavLink key={href} href={buildHref(href)} icon={icon}>
          {label}
        </NavLink>
      ))}

      <Separator className="my-2" />

      {SECONDARY_NAV.map(({ href, label, icon }) => (
        <NavLink key={href} href={href} icon={icon}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
