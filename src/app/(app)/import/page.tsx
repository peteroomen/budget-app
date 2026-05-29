import { getAccounts } from '@/lib/queries/accounts'
import { getRecentImportHistory } from '@/lib/queries/import-history'
import { ImportForm } from '@/components/import/ImportForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function ImportPage() {
  const [accounts, recentImports] = await Promise.all([getAccounts(), getRecentImportHistory(5)])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-h1 font-medium">Import</h1>
        <p className="mt-0.5 text-body-sm text-muted-foreground">
          Upload a CSV or PDF bank statement. Duplicates are detected and skipped automatically.
        </p>
      </div>
      <ImportForm accounts={accounts} />

      {recentImports.length > 0 && (
        <div className="max-w-lg">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-muted-foreground">
                Recent imports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {recentImports.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium">{row.filename}</p>
                      <p className="mt-0.5 text-label text-muted-foreground">
                        {row.account_name ?? 'Unknown account'}
                        {' · '}
                        {row.bank_format ?? row.file_type.toUpperCase()}
                        {' · '}
                        {formatDate(row.imported_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-body-sm font-medium tabular-nums">
                        {row.imported_count} imported
                      </p>
                      {row.duplicates_count > 0 && (
                        <p className="text-label text-muted-foreground tabular-nums">
                          {row.duplicates_count} skipped
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
