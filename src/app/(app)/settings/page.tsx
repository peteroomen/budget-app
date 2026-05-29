import { createClient } from '@/lib/supabase/server'
import { getAccounts } from '@/lib/queries/accounts'
import { getCategories } from '@/lib/queries/categories'
import { getHouseholdSettings } from '@/lib/queries/household'
import { getCurrentUserContext } from '@/lib/queries/profile'
import { SettingsTabs } from '@/components/settings/SettingsTabs'
import { HouseholdContent } from '@/components/settings/HouseholdContent'
import { AccountsContent } from '@/components/settings/AccountsContent'
import { CategoriesContent } from '@/components/settings/CategoriesContent'
import { DangerZoneContent } from '@/components/settings/DangerZoneContent'

const VALID_TABS = ['household', 'accounts', 'categories', 'danger'] as const
type Tab = (typeof VALID_TABS)[number]

function parseTab(raw: string | undefined): Tab {
  return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : 'household'
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; new?: string }>
}) {
  const sp = await searchParams
  const activeTab = parseTab(sp.tab)
  const openCreate = sp.new === '1'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.app_metadata?.role === 'admin'

  const [accounts, categories, household, ctx] = await Promise.all([
    getAccounts(),
    getCategories(),
    getHouseholdSettings(),
    getCurrentUserContext(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-h1 font-medium">Settings</h1>
        <p className="mt-0.5 text-body-sm text-muted-foreground">
          Household, accounts, categories, and danger zone.
        </p>
      </div>

      <SettingsTabs
        defaultTab={activeTab}
        isAdmin={isAdmin}
        householdContent={
          <HouseholdContent
            expectedMonthlyIncomeCents={household?.expected_monthly_income_cents ?? null}
            memberships={ctx?.memberships ?? []}
            activeHouseholdId={ctx?.activeHouseholdId ?? null}
            openCreateByDefault={openCreate}
          />
        }
        accountsContent={<AccountsContent accounts={accounts} />}
        categoriesContent={<CategoriesContent categories={categories} />}
        dangerContent={<DangerZoneContent />}
      />
    </div>
  )
}
