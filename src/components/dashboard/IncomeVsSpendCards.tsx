import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardSummary } from '@/lib/queries/dashboard'

interface IncomeVsSpendCardsProps {
  summary: DashboardSummary
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function IncomeVsSpendCards({ summary }: IncomeVsSpendCardsProps) {
  const { income_cents, spend_cents, net_cents } = summary
  const netPositive = net_cents >= 0

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
              Income
            </CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-display text-display-hero font-medium tabular-nums text-success">
            {formatNZD(income_cents)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
              Spend
            </CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-display text-display-hero font-medium tabular-nums">
            {formatNZD(spend_cents)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
              Net
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={`font-display text-display-hero font-medium tabular-nums ${netPositive ? 'text-success' : ''}`}
          >
            {netPositive ? '+' : '−'}
            {formatNZD(Math.abs(net_cents))}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
