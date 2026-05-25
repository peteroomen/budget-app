import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-display-card-title font-medium">Top merchants</CardTitle>
            <CardDescription className="mt-0.5 text-body-xs">
              {merchants.length === 0
                ? 'No expenses this month'
                : `${merchants.length} merchant${merchants.length !== 1 ? 's' : ''} this month`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="-mt-1 -mr-2 shrink-0">
            <Link href="/transactions" className="flex items-center gap-1 text-[13px]">
              All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
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
