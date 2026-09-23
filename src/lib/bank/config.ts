/** No credentials reach client components or previews. One personal app, one explicit owner/household. */
export function bankConfig(requireScheduled = true) {
  const {
    BANK_SYNC_ENABLED,
    CRON_SECRET,
    VERCEL_ENV,
    AKAHU_APP_TOKEN,
    AKAHU_USER_TOKEN,
    AKAHU_OWNER_USER_ID,
    AKAHU_HOUSEHOLD_ID,
    SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL,
  } = process.env
  if (
    (requireScheduled && (BANK_SYNC_ENABLED !== 'true' || !CRON_SECRET)) ||
    VERCEL_ENV !== 'production' ||
    !AKAHU_APP_TOKEN ||
    !AKAHU_USER_TOKEN ||
    !AKAHU_OWNER_USER_ID ||
    !AKAHU_HOUSEHOLD_ID ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !NEXT_PUBLIC_SUPABASE_URL
  )
    return null
  return {
    appToken: AKAHU_APP_TOKEN,
    userToken: AKAHU_USER_TOKEN,
    ownerId: AKAHU_OWNER_USER_ID,
    householdId: AKAHU_HOUSEHOLD_ID,
    serviceKey: SUPABASE_SERVICE_ROLE_KEY,
    url: NEXT_PUBLIC_SUPABASE_URL,
  }
}
