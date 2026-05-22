export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar placeholder — will become nav in Phase 1 */}
      <aside className="hidden w-64 border-r bg-muted/40 md:block">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Budget App</h2>
          <nav className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>Dashboard</p>
            <p>Transactions</p>
            <p>Budgets</p>
            <p>Accounts</p>
            <p>Categories</p>
            <p>Chat</p>
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
