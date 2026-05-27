import { ArrowUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface SpendVsBudgetedCardProps {
  spend_cents: number
  budgeted_cents: number
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function SpendVsBudgetedCard({ spend_cents, budgeted_cents }: SpendVsBudgetedCardProps) {
  const hasBudget = budgeted_cents > 0
  const ratio = hasBudget ? spend_cents / budgeted_cents : 0
  const pct = Math.min(ratio * 100, 100)
  const indicatorClassName =
    ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-success'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
            Spend
          </CardTitle>
          <ArrowUp className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-display text-display-hero font-medium tabular-nums">
          {formatNZD(spend_cents)}
        </p>
        {hasBudget ? (
          <>
            <p className="text-label text-muted-foreground">
              of {formatNZD(budgeted_cents)} budgeted
            </p>
            <Progress value={pct} className="h-1.5" indicatorClassName={indicatorClassName} />
            <p className="text-label text-muted-foreground">
              {ratio >= 1
                ? `${Math.round((ratio - 1) * 100)}% over budget`
                : `${Math.round(ratio * 100)}% of budget`}
            </p>
          </>
        ) : (
          <p className="text-label text-muted-foreground">No budgets set</p>
        )}
      </CardContent>
    </Card>
  )
}
