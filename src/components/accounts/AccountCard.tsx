import { deleteAccount } from '@/lib/actions/accounts'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Account, AccountType } from '@/types'

const TYPE_LABELS: Record<AccountType, string> = {
  spending: 'Spending',
  saving: 'Saving',
}

export function AccountCard({ account }: { account: Account }) {
  async function handleDelete() {
    'use server'
    await deleteAccount(account.id)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{account.name}</CardTitle>
          <CardDescription>
            {account.institution ? `${account.institution} · ` : ''}
            {TYPE_LABELS[account.type]} · {account.currency}
          </CardDescription>
        </div>
        <form action={handleDelete}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        </form>
      </CardHeader>
    </Card>
  )
}
