import { monthStatus } from '@/lib/utils/month'
import { ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface IncomeVsExpectedCardProps {
  received_cents: number
  expected_cents: number | null
  month: string
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function paceForMonth(month: string): { dayLabel: string; isCurrent: boolean } {
  const status = monthStatus(month)
  if (status.status !== 'in_progress')
    return {
      dayLabel: status.status === 'closed' ? 'Past month' : 'Future month',
      isCurrent: false,
    }
  const day = status.dayOfMonth!
  const pct = Math.round((day / status.daysInMonth) * 100)
  return { dayLabel: `Day ${day} of ${status.daysInMonth} (${pct}% through)`, isCurrent: true }
}

export function IncomeVsExpectedCard({
  received_cents,
  expected_cents,
  month,
}: IncomeVsExpectedCardProps) {
  const hasExpected = expected_cents !== null && expected_cents > 0
  const pct = hasExpected ? Math.max(0, Math.min((received_cents / expected_cents!) * 100, 100)) : 0
  const pace = paceForMonth(month)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
            Income
          </CardTitle>
          <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-display text-display-hero font-medium tabular-nums text-success">
          {formatNZD(received_cents)}
        </p>
        {hasExpected ? (
          <>
            <p className="text-label text-muted-foreground">
              of {formatNZD(expected_cents!)} expected
            </p>
            <Progress value={pct} className="h-1.5" indicatorClassName="bg-success" />
            {pace.isCurrent && <p className="text-label text-muted-foreground">{pace.dayLabel}</p>}
          </>
        ) : (
          <p className="text-label text-muted-foreground">No projected income set</p>
        )}
      </CardContent>
    </Card>
  )
}
