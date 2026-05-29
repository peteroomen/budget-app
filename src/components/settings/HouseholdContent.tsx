'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateExpectedMonthlyIncome } from '@/lib/actions/household'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HouseholdsPanel } from '@/components/settings/HouseholdsPanel'
import type { HouseholdMembership } from '@/types'

interface HouseholdContentProps {
  expectedMonthlyIncomeCents: number | null
  memberships: HouseholdMembership[]
  activeHouseholdId: string | null
  openCreateByDefault?: boolean
}

function centsToDollars(cents: number | null): string {
  if (cents === null) return ''
  return (cents / 100).toFixed(2)
}

export function HouseholdContent({
  expectedMonthlyIncomeCents,
  memberships,
  activeHouseholdId,
  openCreateByDefault = false,
}: HouseholdContentProps) {
  const [value, setValue] = useState(centsToDollars(expectedMonthlyIncomeCents))
  const [state, action, pending] = useActionState(updateExpectedMonthlyIncome, { error: null })
  const submitted = useRef(false)

  useEffect(() => {
    if (!pending && submitted.current) {
      submitted.current = false
      if (state.error === null) {
        toast.success('Saved', { description: 'Projected monthly income updated.' })
      } else {
        toast.error('Could not save', { description: state.error })
      }
    }
  }, [pending, state])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Household</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Settings shared across everyone in your household.
        </p>
      </div>

      <HouseholdsPanel
        memberships={memberships}
        activeHouseholdId={activeHouseholdId}
        openCreateByDefault={openCreateByDefault}
      />

      <Card>
        <CardContent className="pt-6">
          <form
            action={(formData) => {
              const dollars = (formData.get('amount_dollars') ?? '').toString().trim()
              const cents = dollars === '' ? '' : String(Math.round(parseFloat(dollars) * 100))
              const fd = new FormData()
              fd.set('expected_monthly_income_cents', cents)
              submitted.current = true
              action(fd)
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="amount_dollars">Projected monthly income (NZD)</Label>
              <Input
                id="amount_dollars"
                name="amount_dollars"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="e.g. 9000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for tracking actual vs expected income on the dashboard, allocating budgets,
                and giving the AI context for mid-month conversations. Leave blank to disable.
              </p>
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
