import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteAllTransactions } from '@/lib/actions/transactions'
import { deleteAllMerchantMappings } from '@/lib/actions/merchant-map'
import { DangerActionButton } from '@/components/admin/DangerActionButton'
import { Separator } from '@/components/ui/separator'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Household reset tools. These actions are permanent.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Danger zone
        </h2>

        <div className="rounded-lg border border-destructive/30 divide-y divide-destructive/20">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Delete all transactions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently removes every transaction across all accounts. Accounts, categories, and
                merchant memory are not affected.
              </p>
            </div>
            <DangerActionButton
              title="Delete all transactions"
              description="This permanently deletes every transaction across all accounts. Accounts, categories, and merchant memory are not affected. This cannot be undone."
              action={deleteAllTransactions}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Delete all merchant mappings</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clears the merchant → category memory. Transactions keep their current categories
                but re-importing will re-categorise from scratch.
              </p>
            </div>
            <DangerActionButton
              title="Delete all merchant mappings"
              description="This clears the merchant → category memory for your household. Existing transaction categories are not changed, but future imports will categorise from scratch. This cannot be undone."
              action={deleteAllMerchantMappings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
