import { Home, List, Target, Sparkles, MessageSquare, Upload, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: List },
  { href: '/budgets', label: 'Budgets', icon: Target },
  { href: '/summary', label: 'Summary', icon: Sparkles },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
]

export const SECONDARY_NAV: NavItem[] = [
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]
