import type { Account } from '@/types'
import type { BankAccount } from '@/lib/bank/akahu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function BankAccountSelectors({
  external,
  accounts,
  externalId,
  accountId,
  pending,
  onExternal,
  onAccount,
}: {
  external: BankAccount[]
  accounts: Account[]
  externalId: string
  accountId: string
  pending: boolean
  onExternal: (id: string) => void
  onAccount: (id: string) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="bank-external">ANZ account in Akahu</Label>
        <Select value={externalId} onValueChange={onExternal} disabled={pending}>
          <SelectTrigger id="bank-external">
            <SelectValue placeholder="Choose an ANZ account" />
          </SelectTrigger>
          <SelectContent>
            {external.map((a) => (
              <SelectItem key={a.id} value={a.id} disabled={!a.active}>
                {a.name} {a.suffix && `· ${a.suffix}`}
                {!a.active && ' (reconnect in Akahu)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bank-target">Import into Tide account</Label>
        <Select value={accountId} onValueChange={onAccount} disabled={pending}>
          <SelectTrigger id="bank-target">
            <SelectValue placeholder="Choose a Tide account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
