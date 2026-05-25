'use client'

import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SettingsTabsProps {
  defaultTab: string
  isAdmin: boolean
  accountsContent: React.ReactNode
  categoriesContent: React.ReactNode
  dangerContent: React.ReactNode
}

export function SettingsTabs({
  defaultTab,
  isAdmin,
  accountsContent,
  categoriesContent,
  dangerContent,
}: SettingsTabsProps) {
  const router = useRouter()

  return (
    <Tabs
      defaultValue={defaultTab}
      onValueChange={(value) => router.push(`/settings?tab=${value}`)}
      className="space-y-6"
    >
      <TabsList>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        {isAdmin && <TabsTrigger value="danger">Danger zone</TabsTrigger>}
      </TabsList>

      <TabsContent value="accounts">{accountsContent}</TabsContent>
      <TabsContent value="categories">{categoriesContent}</TabsContent>
      {isAdmin && <TabsContent value="danger">{dangerContent}</TabsContent>}
    </Tabs>
  )
}
