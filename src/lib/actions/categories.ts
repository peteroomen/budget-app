'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CategoryType } from '@/types'

type ActionResult = { error: string | null }

const VALID_TYPES: CategoryType[] = ['income', 'expense', 'transfer']

function parseType(value: FormDataEntryValue | null): CategoryType | null {
  if (typeof value !== 'string') return null
  return (VALID_TYPES as string[]).includes(value) ? (value as CategoryType) : null
}

async function getHouseholdId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  return data?.household_id ?? null
}

export async function createCategory(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get('name')
  const color = formData.get('color')
  const type = parseType(formData.get('type')) ?? 'expense'

  if (typeof name !== 'string' || !name.trim()) return { error: 'Category name is required' }

  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const { error } = await supabase.from('categories').insert({
    household_id: householdId,
    name: name.trim(),
    color: typeof color === 'string' && color ? color : null,
    type,
    is_system: false,
  })

  if (error) {
    if (error.code === '23505') return { error: 'A category with that name already exists' }
    return { error: error.message }
  }

  revalidatePath('/categories')
  return { error: null }
}

export async function updateCategory(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get('id')
  const name = formData.get('name')
  const color = formData.get('color')
  const type = parseType(formData.get('type'))

  if (typeof id !== 'string' || !id) return { error: 'Category ID is required' }
  if (typeof name !== 'string' || !name.trim()) return { error: 'Category name is required' }

  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const update: { name: string; color: string | null; type?: CategoryType } = {
    name: name.trim(),
    color: typeof color === 'string' && color ? color : null,
  }
  if (type) update.type = type

  const { error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) {
    if (error.code === '23505') return { error: 'A category with that name already exists' }
    return { error: error.message }
  }

  revalidatePath('/categories')
  return { error: null }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const { data: category } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .eq('household_id', householdId)
    .maybeSingle()

  if (!category) return { error: 'Category not found' }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) return { error: error.message }

  revalidatePath('/categories')
  return { error: null }
}
