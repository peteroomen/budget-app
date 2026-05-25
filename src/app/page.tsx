import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-4xl font-semibold">Tide</h1>
      <p className="mt-4 text-muted-foreground">Household budgeting for two</p>
      <Link href="/login" className="mt-8 text-primary underline underline-offset-4">
        Sign in
      </Link>
    </div>
  )
}
