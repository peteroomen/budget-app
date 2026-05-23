'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string | null }

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

  if (typeof name !== 'string' || !name.trim()) return { error: 'Category name is required' }

  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const { error } = await supabase.from('categories').insert({
    household_id: householdId,
    name: name.trim(),
    color: typeof color === 'string' && color ? color : null,
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

  if (typeof id !== 'string' || !id) return { error: 'Category ID is required' }
  if (typeof name !== 'string' || !name.trim()) return { error: 'Category name is required' }

  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const { error } = await supabase
    .from('categories')
    .update({
      name: name.trim(),
      color: typeof color === 'string' && color ? color : null,
    })
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
  if (category.is_system) return { error: 'Default categories cannot be deleted' }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) return { error: error.message }

  revalidatePath('/categories')
  return { error: null }
}
