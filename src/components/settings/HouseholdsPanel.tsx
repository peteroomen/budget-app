'use client'

import { useState, useTransition, useEffect } from 'react'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createHousehold, switchHousehold } from '@/lib/actions/households'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { HouseholdMembership } from '@/types'

interface HouseholdsPanelProps {
  memberships: HouseholdMembership[]
  activeHouseholdId: string | null
  openCreateByDefault?: boolean
}

export function HouseholdsPanel({
  memberships,
  activeHouseholdId,
  openCreateByDefault = false,
}: HouseholdsPanelProps) {
  const [showCreate, setShowCreate] = useState(openCreateByDefault)
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (openCreateByDefault) setShowCreate(true)
  }, [openCreateByDefault])

  const handleSwitch = (id: string) => {
    if (id === activeHouseholdId) return
    startTransition(async () => {
      const { error } = await switchHousehold(id)
      if (error) toast.error('Could not switch household', { description: error })
      else toast.success('Switched household')
    })
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      toast.error('Name is required')
      return
    }
    startTransition(async () => {
      const { error } = await createHousehold(trimmed)
      if (error) {
        toast.error('Could not create household', { description: error })
      } else {
        toast.success('Household created', { description: `Switched to "${trimmed}"` })
        setName('')
        setShowCreate(false)
      }
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <h3 className="text-sm font-semibold">Households</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each household has its own accounts, transactions, budgets, and categories. Switch
            between them at any time.
          </p>
        </div>

        <ul className="divide-y rounded-md border">
          {memberships.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted-foreground">No households yet.</li>
          )}
          {memberships.map((m) => {
            const isActive = m.id === activeHouseholdId
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isActive && <Check size={14} strokeWidth={2} className="text-primary" />}
                  </span>
                  <span className="truncate text-sm font-medium">{m.name}</span>
                  {isActive && (
                    <Badge variant="accent" className="ml-1">
                      Active
                    </Badge>
                  )}
                </div>
                {!isActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSwitch(m.id)}
                    disabled={pending}
                  >
                    Switch
                  </Button>
                )}
              </li>
            )
          })}
        </ul>

        {!showCreate && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
              disabled={pending}
            >
              <Plus size={14} className="mr-1.5" strokeWidth={1.75} />
              Create new household
            </Button>
          </div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="new_household_name">New household name</Label>
              <Input
                id="new_household_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Test"
                maxLength={64}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A fresh household with the default category set. You&apos;ll be switched to it
                immediately.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreate(false)
                  setName('')
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
