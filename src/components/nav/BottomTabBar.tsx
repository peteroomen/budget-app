'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV } from '@/components/nav/nav-items'

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="grid grid-cols-5 border-t bg-card/95 backdrop-blur-sm md:hidden"
      style={{
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
              'flex flex-col items-center gap-1 py-1 text-[10.5px] font-medium transition-colors',
              isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
