'use client'

import { Separator } from '@/components/ui/separator'
import { NavLink } from '@/components/nav/NavLink'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/components/nav/nav-items'

export function SidebarNav() {
  return (
    <nav className="flex-1 space-y-0.5 px-3 py-2">
      {PRIMARY_NAV.map(({ href, label, icon }) => (
        <NavLink key={href} href={href} icon={icon}>
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
