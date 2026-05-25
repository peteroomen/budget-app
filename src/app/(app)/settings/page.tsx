import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/queries/accounts'
import { getCategories } from '@/lib/queries/categories'
import { SettingsTabs } from '@/components/settings/SettingsTabs'
import { AccountsContent } from '@/components/settings/AccountsContent'
import { CategoriesContent } from '@/components/settings/CategoriesContent'
import { DangerZoneContent } from '@/components/settings/DangerZoneContent'

const VALID_TABS = ['accounts', 'categories', 'danger'] as const
type Tab = (typeof VALID_TABS)[number]

function parseTab(raw: string | undefined): Tab {
  return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : 'accounts'
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const sp = await searchParams
  const activeTab = parseTab(sp.tab)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.app_metadata?.role === 'admin'

  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-h1 font-medium">Settings</h1>
        <p className="mt-0.5 text-body-sm text-muted-foreground">
          Accounts, categories, and danger zone.
        </p>
      </div>

      <SettingsTabs
        defaultTab={activeTab}
        isAdmin={isAdmin}
        accountsContent={<AccountsContent accounts={accounts} />}
        categoriesContent={<CategoriesContent categories={categories} />}
        dangerContent={<DangerZoneContent />}
      />
    </div>
  )
}
