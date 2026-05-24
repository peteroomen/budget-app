import { Progress } from '@/components/ui/progress'

interface BudgetProgressBarProps {
  actual_cents: number
  budget_cents: number
}

export function BudgetProgressBar({ actual_cents, budget_cents }: BudgetProgressBarProps) {
  if (budget_cents <= 0) return null

  const ratio = actual_cents / budget_cents
  const pct = Math.min(ratio * 100, 100)

  const indicatorClassName =
    ratio >= 1 ? 'bg-destructive' : ratio >= 0.75 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-1">
      <Progress value={pct} className="h-2" indicatorClassName={indicatorClassName} />
      <p className="text-xs text-muted-foreground">
        {ratio >= 1
          ? `${Math.round((ratio - 1) * 100)}% over budget`
          : `${Math.round(ratio * 100)}% of budget`}
      </p>
    </div>
  )
}
