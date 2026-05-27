import type { Category, CategoryType } from '@/types'
import { AddCategoryDialog } from '@/components/categories/AddCategoryDialog'
import { EditCategoryDialog } from '@/components/categories/EditCategoryDialog'
import { DeleteCategoryButton } from '@/components/categories/DeleteCategoryButton'

interface CategoriesContentProps {
  categories: Category[]
}

const TYPE_LABEL: Record<CategoryType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
}

export function CategoriesContent({ categories }: CategoriesContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage how transactions are grouped.
          </p>
        </div>
        <AddCategoryDialog />
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origin</th>
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
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[category.type]}</td>
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
