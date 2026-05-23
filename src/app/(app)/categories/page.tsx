import { getCategories } from '@/lib/queries/categories'
import { AddCategoryDialog } from '@/components/categories/AddCategoryDialog'
import { EditCategoryDialog } from '@/components/categories/EditCategoryDialog'
import { DeleteCategoryButton } from '@/components/categories/DeleteCategoryButton'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage how transactions are grouped.</p>
        </div>
        <AddCategoryDialog />
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: category.color ?? '#6b7280' }}
                      />
                      {category.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {category.is_system ? 'Default' : 'Custom'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <EditCategoryDialog category={category} />
                      <DeleteCategoryButton
                        id={category.id}
                        name={category.name}
                        isSystem={category.is_system}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
