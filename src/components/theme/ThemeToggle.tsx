'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

/**
 * Compact icon button — used in the mobile drawer header.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun size={15} className="block dark:hidden" />
      <Moon size={15} className="hidden dark:block" />
    </Button>
  )
}

/**
 * Full row: Moon icon + "Dark mode" label + Switch.
 * Sits above the user chip in the desktop sidebar footer.
 *
 * Defers rendering the Switch until after mount to avoid a next-themes
 * hydration mismatch (server renders theme-agnostic, client knows the
 * real preference).
 */
export function SidebarThemeRow() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <Label
        htmlFor="theme-switch"
        className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none"
      >
        <Moon size={14} />
        Dark mode
      </Label>
      {/* Render placeholder until mounted to avoid SSR/client hydration mismatch */}
      {mounted ? (
        <Switch
          id="theme-switch"
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          aria-label="Toggle dark mode"
        />
      ) : (
        <div className="h-6 w-11 rounded-full bg-input" />
      )}
    </div>
  )
}
