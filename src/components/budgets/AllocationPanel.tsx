import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface AllocationPanelProps {
  expectedIncomeCents: number | null
  totalBudgetedCents: number
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function AllocationPanel({ expectedIncomeCents, totalBudgetedCents }: AllocationPanelProps) {
  if (expectedIncomeCents === null) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-body-sm text-muted-foreground">
            Set a projected monthly income in{' '}
            <Link
              href="/settings?tab=household"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Settings → Household
            </Link>{' '}
            to track allocation against expected income.
          </p>
        </CardContent>
      </Card>
    )
  }

  const unallocated = expectedIncomeCents - totalBudgetedCents
  const overAllocated = unallocated < 0
  const ratio = expectedIncomeCents > 0 ? totalBudgetedCents / expectedIncomeCents : 0
  const pct = Math.min(ratio * 100, 100)
  const indicatorClassName = overAllocated
    ? 'bg-destructive'
    : ratio >= 0.95
      ? 'bg-warning'
      : 'bg-primary'

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-label-caps uppercase tracking-[0.05em] font-medium text-muted-foreground">
              Expected
            </p>
            <p className="mt-1 font-display text-display-metric font-medium tabular-nums leading-none">
              {formatNZD(expectedIncomeCents)}
            </p>
          </div>
          <div>
            <p className="text-label-caps uppercase tracking-[0.05em] font-medium text-muted-foreground">
              Allocated
            </p>
            <p className="mt-1 font-display text-display-metric font-medium tabular-nums leading-none">
              {formatNZD(totalBudgetedCents)}
            </p>
          </div>
          <div>
            <p className="text-label-caps uppercase tracking-[0.05em] font-medium text-muted-foreground">
              {overAllocated ? 'Over-allocated' : 'Unallocated'}
            </p>
            <p
              className={`mt-1 font-display text-display-metric font-medium tabular-nums leading-none ${
                overAllocated ? 'text-destructive' : ''
              }`}
            >
              {formatNZD(Math.abs(unallocated))}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Progress value={pct} className="h-2" indicatorClassName={indicatorClassName} />
          <p className="text-label text-muted-foreground">
            {overAllocated
              ? `Budgets exceed expected income by ${Math.round((ratio - 1) * 100)}%`
              : `${Math.round(ratio * 100)}% of expected income allocated`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
