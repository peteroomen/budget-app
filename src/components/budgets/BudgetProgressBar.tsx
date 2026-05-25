import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'

interface BudgetProgressBarProps {
  actual_cents: number
  budget_cents: number
}

export type PacingVariant = 'accent' | 'warn' | 'danger'

export function getPacingVariant(ratio: number): PacingVariant {
  if (ratio >= 1) return 'danger'
  if (ratio >= 0.8) return 'warn'
  return 'accent'
}

export function getPacingLabel(ratio: number): string {
  if (ratio >= 1) return 'Over budget'
  if (ratio >= 0.8) return 'Approaching'
  return 'On track'
}

export function PacingBadge({ ratio }: { ratio: number }) {
  const variant = getPacingVariant(ratio) as BadgeProps['variant']
  return <Badge variant={variant}>{getPacingLabel(ratio)}</Badge>
}

export function BudgetProgressBar({ actual_cents, budget_cents }: BudgetProgressBarProps) {
  if (budget_cents <= 0) return null

  const ratio = actual_cents / budget_cents
  const pct = Math.min(ratio * 100, 100)

  const indicatorClassName =
    ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary'

  return (
    <div className="space-y-1">
      <Progress value={pct} className="h-2" indicatorClassName={indicatorClassName} />
      <p className="text-[11px] text-muted-foreground">
        {ratio >= 1
          ? `${Math.round((ratio - 1) * 100)}% over budget`
          : `${Math.round(ratio * 100)}% of budget`}
      </p>
    </div>
  )
}
