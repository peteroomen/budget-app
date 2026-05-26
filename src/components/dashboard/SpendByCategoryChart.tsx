'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { CategorySpend } from '@/lib/queries/dashboard'

interface SpendByCategoryChartProps {
  data: CategorySpend[]
}

// Matches --chart-1..5 tokens: sage, warm-gold, dusty-blue, terracotta, muted-plum
const FALLBACK_COLORS = [
  '#427561',
  '#c48d47',
  '#576a9c',
  '#b45c42',
  '#7d6595',
  '#427561',
  '#c48d47',
  '#576a9c',
  '#b45c42',
  '#7d6595',
  '#427561',
  '#c48d47',
  '#576a9c',
  '#b45c42',
  '#7d6595',
  '#427561',
  '#c48d47',
  '#64748b',
]

export function SpendByCategoryChart({ data }: SpendByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-display-card-title font-medium">
                Spend by category
              </CardTitle>
              <CardDescription className="mt-0.5 text-body-xs">
                Vertical lines mark budget caps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No expenses recorded this month.
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((item, i) => ({
    category: item.category_name,
    spend: item.spend_cents / 100,
    fill: item.category_color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  const chartConfig: ChartConfig = {
    spend: { label: 'Spend (NZD)' },
    ...Object.fromEntries(
      data.map((item, i) => [
        item.category_name,
        {
          label: item.category_name,
          color: item.category_color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        },
      ])
    ),
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-display-card-title font-medium">Spend by category</CardTitle>
            <CardDescription className="mt-0.5 text-body-xs">
              Vertical lines mark budget caps
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="-mt-1 -mr-2 shrink-0">
            <Link href="/budgets" className="flex items-center gap-1 text-[13px]">
              Manage budgets <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[360px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="category"
              type="category"
              width={110}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <XAxis
              type="number"
              tickFormatter={(v: number) =>
                new Intl.NumberFormat('en-NZ', {
                  style: 'currency',
                  currency: 'NZD',
                  notation: 'compact',
                  maximumFractionDigits: 0,
                }).format(v)
              }
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    new Intl.NumberFormat('en-NZ', {
                      style: 'currency',
                      currency: 'NZD',
                      minimumFractionDigits: 2,
                    }).format(value as number)
                  }
                />
              }
            />
            <Bar dataKey="spend" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
