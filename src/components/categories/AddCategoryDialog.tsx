'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createCategory } from '@/lib/actions/categories'
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
import { ColorPicker } from './ColorPicker'
import type { CategoryType } from '@/types'

const DEFAULT_COLOR = '#6b7280'
const DEFAULT_TYPE: CategoryType = 'expense'

export function AddCategoryDialog() {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [type, setType] = useState<CategoryType>(DEFAULT_TYPE)
  const [formKey, setFormKey] = useState(0)
  const [nameError, setNameError] = useState<string | null>(null)
  const [state, action, pending] = useActionState(createCategory, { error: null })
  const submitted = useRef(false)

  useEffect(() => {
    if (!pending && submitted.current) {
      if (state.error === null) {
        setOpen(false)
        setColor(DEFAULT_COLOR)
        setType(DEFAULT_TYPE)
        setFormKey((k) => k + 1)
        submitted.current = false
      }
    }
  }, [pending, state])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setColor(DEFAULT_COLOR)
      setType(DEFAULT_TYPE)
      setNameError(null)
      setFormKey((k) => k + 1)
      submitted.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add category</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
        </DialogHeader>
        <form
          key={formKey}
          action={(formData) => {
            const name = formData.get('name')
            if (typeof name !== 'string' || !name.trim()) {
              setNameError('Name is required')
              return
            }
            setNameError(null)
            submitted.current = true
            action(formData)
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="add-name">Name</Label>
            <Input id="add-name" name="name" placeholder="e.g. Petrol" />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-type">Type</Label>
            <input type="hidden" name="type" value={type} />
            <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
              <SelectTrigger id="add-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense — money out</SelectItem>
                <SelectItem value="income">Income — money in</SelectItem>
                <SelectItem value="transfer">
                  Transfer — moves between own accounts (excluded from spend)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <ColorPicker name="color" value={color} onChange={setColor} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding…' : 'Add category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
