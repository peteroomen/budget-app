import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FixedCostsSummary } from '@/lib/queries/recurring'

interface Props {
  summary: FixedCostsSummary
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function FixedCostsCard({ summary }: Props) {
  const { total_cents, merchant_count } = summary

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
          Fixed Costs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-display-hero font-medium tabular-nums">
          {formatNZD(total_cents)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {merchant_count === 0
            ? 'No recurring transactions detected'
            : `${merchant_count} recurring merchant${merchant_count !== 1 ? 's' : ''}`}
        </p>
      </CardContent>
    </Card>
  )
}
