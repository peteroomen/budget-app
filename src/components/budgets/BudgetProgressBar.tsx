interface BudgetProgressBarProps {
  actual_cents: number
  budget_cents: number
}

export function BudgetProgressBar({ actual_cents, budget_cents }: BudgetProgressBarProps) {
  if (budget_cents <= 0) return null

  const ratio = actual_cents / budget_cents
  const pct = Math.min(ratio * 100, 100)

  const barColor = ratio >= 1 ? 'bg-destructive' : ratio >= 0.75 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {ratio >= 1
          ? `${Math.round((ratio - 1) * 100)}% over budget`
          : `${Math.round(ratio * 100)}% of budget`}
      </p>
    </div>
  )
}
