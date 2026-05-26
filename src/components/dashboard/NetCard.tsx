import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NetCardProps {
  net_cents: number
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function NetCard({ net_cents }: NetCardProps) {
  const netPositive = net_cents >= 0
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-xs font-sans font-medium text-muted-foreground">
            Net
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent>
        <p
          className={`whitespace-nowrap font-display text-display-hero font-medium tabular-nums ${netPositive ? 'text-success' : ''}`}
        >
          {`${netPositive ? '+' : '−'}${formatNZD(Math.abs(net_cents))}`}
        </p>
      </CardContent>
    </Card>
  )
}
