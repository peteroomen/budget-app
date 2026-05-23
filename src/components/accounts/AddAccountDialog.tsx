'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createAccount } from '@/lib/actions/accounts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AddAccountDialog() {
  const [open, setOpen] = useState(false)
  const [accountType, setAccountType] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [state, action, pending] = useActionState(createAccount, { error: null })
  const submitted = useRef(false)

  useEffect(() => {
    if (!pending && submitted.current) {
      if (state.error === null) {
        setOpen(false)
        setAccountType('')
        setFormKey((k) => k + 1)
        submitted.current = false
      }
    }
  }, [pending, state])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setAccountType('')
      setFormKey((k) => k + 1)
      submitted.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
        </DialogHeader>
        <form
          key={formKey}
          action={(formData) => {
            submitted.current = true
            action(formData)
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Account name</Label>
            <Input id="name" name="name" placeholder="e.g. ANZ Everyday" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="institution">Bank / institution</Label>
            <Input id="institution" name="institution" placeholder="e.g. ANZ (optional)" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Account type</Label>
            <input type="hidden" name="type" value={accountType} />
            <Select value={accountType} onValueChange={setAccountType} required>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spending">Spending</SelectItem>
                <SelectItem value="saving">Saving</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !accountType}>
              {pending ? 'Adding…' : 'Add account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
