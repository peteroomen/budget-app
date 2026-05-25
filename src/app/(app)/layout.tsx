import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/queries/profile'
import { createClient } from '@/lib/supabase/server'
import { NavLink } from '@/components/nav/NavLink'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/import', label: 'Import' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/categories', label: 'Categories' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/chat', label: 'Chat' },
  { href: '/summary', label: 'Summary' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = await getCurrentProfile()
  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const isAdmin = user?.app_metadata?.role === 'admin'
  const navItems = isAdmin ? [...NAV_ITEMS, { href: '/admin', label: 'Admin' }] : NAV_ITEMS

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-60 flex-col overflow-y-auto border-r bg-muted/40 md:flex">
        <div className="px-6 py-5">
          <span className="text-lg font-semibold tracking-tight">Budget App</span>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label }) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <span className="text-sm text-muted-foreground">{profile.email}</span>
          <SignOutButton />
        </header>
        <main className="flex flex-1 flex-col overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
