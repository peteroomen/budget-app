import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function SignOutButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out">
              <LogOut size={15} strokeWidth={1.75} />
            </Button>
          </form>
        </TooltipTrigger>
        <TooltipContent side="top">Sign out</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
