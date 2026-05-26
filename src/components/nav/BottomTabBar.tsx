'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV } from '@/components/nav/nav-items'
import { useMobileNav } from '@/components/nav/MobileNavContext'

export function BottomTabBar() {
  const pathname = usePathname()
  const { drawerOpen } = useMobileNav()

  return (
    <nav
      className={cn(
        'sticky bottom-0 grid shrink-0 border-t md:hidden',
        // grid-cols-5 keeps all 5 cells pixel-equal regardless of label width
        'grid-cols-5',
        drawerOpen && 'pointer-events-none'
      )}
      style={{
        background: 'hsl(var(--card) / 0.96)',
        // Both prefixes — Safari requires the -webkit- one
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
