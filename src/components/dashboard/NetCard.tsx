import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NetCardProps {
  income_cents: number
  spend_cents: number
  expected_income_cents: number | null
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function signed(cents: number): string {
  const positive = cents >= 0
  return `${positive ? '+' : '−'}${formatNZD(Math.abs(cents))}`
}

export function NetCard({ income_cents, spend_cents, expected_income_cents }: NetCardProps) {
  const actualNet = income_cents - spend_cents
  const hasExpected = expected_income_cents !== null
  const projectedNet = hasExpected ? expected_income_cents! - spend_cents : actualNet
  const headlineNet = hasExpected ? projectedNet : actualNet
  const headlinePositive = headlineNet >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
            {hasExpected ? 'Projected net' : 'Net'}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p
          className={`whitespace-nowrap font-display text-display-hero font-medium tabular-nums ${headlinePositive ? 'text-success' : ''}`}
        >
          {signed(headlineNet)}
        </p>
        {hasExpected && (
          <p className="text-label text-muted-foreground">{signed(actualNet)} actual so far</p>
        )}
      </CardContent>
    </Card>
  )
}
