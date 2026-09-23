import type { Account } from '@/types'
import { getBankSettings } from '@/lib/queries/bank'
import { BankConnectionsView } from './BankConnectionsView'
import { nzDate } from '@/lib/utils/month'

export async function BankConnections({ accounts }: { accounts: Account[] }) {
  const settings = await getBankSettings()
  return <BankConnectionsView accounts={accounts} {...settings} today={nzDate()} />
}
