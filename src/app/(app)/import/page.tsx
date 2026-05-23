import { getAccounts } from '@/lib/queries/accounts'
import { CsvImportForm } from '@/components/import/CsvImportForm'
import { PdfImportForm } from '@/components/import/PdfImportForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ImportPage() {
  const accounts = await getAccounts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Statement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a bank statement. Duplicates are detected and skipped automatically.
        </p>
      </div>

      <Tabs defaultValue="csv" className="max-w-md">
        <TabsList>
          <TabsTrigger value="csv">CSV</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-4">
          <CsvImportForm accounts={accounts} />
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          <PdfImportForm accounts={accounts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
