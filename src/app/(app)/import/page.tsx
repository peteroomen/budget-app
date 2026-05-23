import { getAccounts } from '@/lib/queries/accounts'
import { ImportForm } from '@/components/import/ImportForm'

export default async function ImportPage() {
  const accounts = await getAccounts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Statement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV or PDF bank statement. Duplicates are detected and skipped automatically.
        </p>
      </div>
      <ImportForm accounts={accounts} />
    </div>
  )
}
