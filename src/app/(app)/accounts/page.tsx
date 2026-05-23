import { getAccounts } from '@/lib/queries/accounts'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'

export default async function AccountsPage() {
  const accounts = await getAccounts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your linked bank accounts.</p>
        </div>
        <AddAccountDialog />
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet. Add one to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}
