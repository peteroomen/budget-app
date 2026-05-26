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
  const now = new Date()
  const [yr, mo] = month.split('-').map(Number)
  const isCurrent = now.getFullYear() === yr && now.getMonth() + 1 === mo
  if (!isCurrent) {
    const isPast = new Date(yr!, mo!, 0) < new Date(now.getFullYear(), now.getMonth(), 1)
    return { dayLabel: isPast ? 'Past month' : 'Future month', isCurrent: false }
  }
  const daysInMonth = new Date(yr!, mo!, 0).getDate()
  const day = now.getDate()
  const pct = Math.round((day / daysInMonth) * 100)
  return { dayLabel: `Day ${day} of ${daysInMonth} (${pct}% through)`, isCurrent: true }
}

export function IncomeVsExpectedCard({
  received_cents,
  expected_cents,
  month,
}: IncomeVsExpectedCardProps) {
  const hasExpected = expected_cents !== null && expected_cents > 0
  const pct = hasExpected ? Math.min((received_cents / expected_cents!) * 100, 100) : 0
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
