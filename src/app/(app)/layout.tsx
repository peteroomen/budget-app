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
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col border-r bg-muted/40 md:flex">
        <div className="px-6 py-5">
          <span className="text-lg font-semibold tracking-tight">Budget App</span>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label }) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm text-muted-foreground">{profile.email}</span>
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
