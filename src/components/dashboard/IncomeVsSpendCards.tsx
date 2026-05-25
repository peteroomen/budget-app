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
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-green-600">{formatNZD(income_cents)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-red-600">{formatNZD(spend_cents)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-semibold ${netPositive ? 'text-green-600' : 'text-red-600'}`}
          >
            {netPositive ? '' : '−'}
            {formatNZD(Math.abs(net_cents))}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
