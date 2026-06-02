'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavLinkProps {
  href: string
  icon: LucideIcon
  children: React.ReactNode
  className?: string
  onClick?: () => void
  showBar?: boolean
}

export function NavLink({
  href,
  icon: Icon,
  children,
  className,
  onClick,
  showBar = true,
}: NavLinkProps) {
  const pathname = usePathname()
  const basePath = href.split('?')[0]!
  const isActive = pathname === basePath || pathname.startsWith(basePath + '/')

  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className={cn(
        'relative flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        className
      )}
    >
      {/* 2px accent bar on left edge when active — sidebar only */}
      {isActive && showBar && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
        />
      )}
      <Icon size={17} strokeWidth={1.75} className={cn('shrink-0', isActive && 'text-primary')} />
      {children}
    </Link>
  )
}
