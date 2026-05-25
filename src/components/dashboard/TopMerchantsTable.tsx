import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MerchantSpend } from '@/lib/queries/dashboard'

interface TopMerchantsTableProps {
  merchants: MerchantSpend[]
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function TopMerchantsTable({ merchants }: TopMerchantsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        {merchants.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No expenses recorded this month.
          </p>
        ) : (
          <ol className="space-y-3">
            {merchants.map((m, i) => (
              <li key={m.merchant} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium">{m.merchant}</span>
                </div>
                <span className="shrink-0 font-mono text-body-sm tabular-nums text-foreground">
                  {formatNZD(m.spend_cents)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
