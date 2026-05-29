'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, ChevronsUpDown, LogOut, Plus, Settings as SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { signOut } from '@/lib/actions/auth'
import { switchHousehold } from '@/lib/actions/households'
import { getInitials, cn } from '@/lib/utils'
import type { HouseholdMembership, Profile } from '@/types'

type Variant = 'sidebar' | 'mobile'

interface ProfileChipProps {
  profile: Profile
  activeHouseholdName: string | null
  activeHouseholdId: string | null
  memberships: HouseholdMembership[]
  variant?: Variant
}

export function ProfileChip({
  profile,
  activeHouseholdName,
  activeHouseholdId,
  memberships,
  variant = 'sidebar',
}: ProfileChipProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const initials = getInitials(profile.display_name, profile.email)
  const displayName = profile.display_name ?? profile.email
  const subtitle = activeHouseholdName ?? 'No household'

  const handleSwitch = (id: string) => {
    if (id === activeHouseholdId) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      const { error } = await switchHousehold(id)
      if (error) {
        toast.error('Could not switch household', { description: error })
      } else {
        toast.success('Switched household')
        setOpen(false)
      }
    })
  }

  const isMobile = variant === 'mobile'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md text-left transition-colors',
            isMobile ? 'px-4 py-2.5 hover:bg-muted/50' : 'px-3 py-3 hover:bg-muted/60'
          )}
          aria-label="Open profile menu"
        >
          <Avatar
            className={cn('shrink-0 rounded-md', isMobile ? 'h-9 w-9 rounded-full' : 'h-8 w-8')}
          >
            <AvatarFallback
              className={cn(
                'bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold',
                isMobile ? 'rounded-full text-sm' : 'rounded-md text-xs'
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'truncate font-medium leading-tight',
                isMobile ? 'text-[14px]' : 'text-xs'
              )}
            >
              {displayName}
            </p>
            <p
              className={cn(
                'truncate text-muted-foreground leading-tight',
                isMobile ? 'text-[12px]' : 'text-[11px]'
              )}
            >
              {subtitle}
            </p>
          </div>
          <ChevronsUpDown
            size={isMobile ? 16 : 14}
            strokeWidth={1.75}
            className="shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align={isMobile ? 'center' : 'start'} side="top" className="w-64 p-1">
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Switch household
          </p>
        </div>

        <div className="flex flex-col">
          {memberships.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No households yet.</p>
          )}
          {memberships.map((m) => {
            const isActive = m.id === activeHouseholdId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSwitch(m.id)}
                disabled={pending}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                  'hover:bg-muted disabled:opacity-60'
                )}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isActive && <Check size={14} strokeWidth={2} className="text-primary" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
              </button>
            )
          })}

          <Link
            href="/settings?tab=household&new=1"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus size={14} strokeWidth={1.75} className="shrink-0" />
            Create new household
          </Link>
        </div>

        <Separator className="my-1" />

        <div className="flex flex-col">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <SettingsIcon size={14} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
            Settings
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut size={14} strokeWidth={1.75} className="shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  )
}
