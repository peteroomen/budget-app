'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateCategory } from '@/lib/actions/categories'
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
import { ColorPicker } from './ColorPicker'
import type { Category } from '@/types'

interface EditCategoryDialogProps {
  category: Category
}

export function EditCategoryDialog({ category }: EditCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(category.color ?? '#6b7280')
  const [formKey, setFormKey] = useState(0)
  const [nameError, setNameError] = useState<string | null>(null)
  const [state, action, pending] = useActionState(updateCategory, { error: null })
  const submitted = useRef(false)

  useEffect(() => {
    if (!pending && submitted.current) {
      if (state.error === null) {
        setOpen(false)
        submitted.current = false
      }
    }
  }, [pending, state])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setColor(category.color ?? '#6b7280')
      setNameError(null)
      setFormKey((k) => k + 1)
      submitted.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
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
          <input type="hidden" name="id" value={category.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${category.id}`}>Name</Label>
            <Input id={`edit-name-${category.id}`} name="name" defaultValue={category.name} />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
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
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
