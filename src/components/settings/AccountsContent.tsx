import type { Account } from '@/types'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'

interface AccountsContentProps {
  accounts: Account[]
}

export function AccountsContent({ accounts }: AccountsContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Linked accounts</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Your linked bank accounts.</p>
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
