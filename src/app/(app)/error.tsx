'use client'

import { Button } from '@/components/ui/button'

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="space-y-3 rounded-lg border p-6">
      <h1 className="text-lg font-medium">Unable to load this page</h1>
      <p className="text-sm text-muted-foreground">
        Your financial data could not be loaded. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
