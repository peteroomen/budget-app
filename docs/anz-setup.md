# Setting up ANZ imports

This is a private household integration using one Akahu Personal App. It supports ANZ NZD checking/savings accounts and settled transactions. Your ANZ login stays in Akahu's connection flow; Tide uses server-side app/user tokens.

## Before deployment

1. Review and merge the ANZ PR. Verify the existing Supabase migration history before applying the global-caps, reliability and ANZ migrations in order. Back up the database before production schema changes.
2. Create an Akahu profile, connect ANZ and create a Personal App in Developers. Enable its required MFA. Put tokens directly into Vercel, never source control, browser code or chat.
3. Configure these **Production-only** Vercel environment variables:

| Name                        | Value                                                      |
| --------------------------- | ---------------------------------------------------------- |
| `AKAHU_APP_TOKEN`           | Akahu App ID Token                                         |
| `AKAHU_USER_TOKEN`          | Akahu User Access Token                                    |
| `AKAHU_OWNER_USER_ID`       | The authorised Tide user's Supabase Auth UUID              |
| `AKAHU_HOUSEHOLD_ID`        | The Tide household UUID that will receive transactions     |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing server-only Supabase service credential           |
| `NEXT_PUBLIC_SUPABASE_URL`  | Existing project's Supabase URL                            |
| `CRON_SECRET`               | A newly generated random secret for the scheduled endpoint |
| `BANK_SYNC_ENABLED`         | Start with `false`; this controls scheduled imports        |

`VERCEL_ENV` is supplied by Vercel. Preview/development deployments cannot contact Akahu, even if credentials are accidentally present. The configured user must be a current member of the configured household and have it active in Tide. Setup/discovery and explicit manual sync are available in production with the schedule disabled. No credentials are sent to client components.

## Connect and check the first import

1. Redeploy after setting environment variables. Sign into Tide as the configured owner and switch to the configured household.
2. Open **Settings → Accounts → ANZ automatic imports**. Add the target Tide NZD account if necessary.
3. Select **Find my ANZ accounts**. Choose the external account and the Tide account it should import into. Inactive accounts require reconnection in Akahu.
4. Set the first import date. The suggestion is the day after the most recent file-imported transaction, capped at today; it does not prove that your statement covered every day. Check it against your last complete statement. Earlier history imports gradually.
5. Confirm **Link account**. The mapping is fixed after creation, so check the displayed destination and household sharing notice carefully.
6. Choose **Sync now**. Compare dates, amounts and counts with your statement. Unknown merchants remain uncategorised; sync does not spend AI credits.
7. Once the first import is checked, set `BANK_SYNC_ENABLED=true` and redeploy to enable the daily job. Keep the flag false until this activation step is approved.

## Normal operation and recovery

- The daily schedule is `0 17 * * *` UTC, roughly the NZ morning; execution time can vary. Akahu refreshes separately. Sync reads cached settled transactions, not a fresh bank refresh or pending purchases.
- Each account shows recent bank refresh time, last successful import, recent coverage and history progress. A recent history import does not imply that current-month data is fresh.
- Recent imports overlap the last 30 days. Older 30-day windows advance from cutover, then rotate. Large imports may need **Sync now** again to finish staged pages before the provider next refreshes.
- **Pause** stops further commits for that link, including an in-flight worker's final commit. **Resume**, then **Sync now**, continues. Revoking household membership also prevents commits.
- Failed pages do not alter totals. A changed provider refresh invalidates staged pages and starts the window again. Corrections with the same bank ID preserve categories, notes and recurring choices.
- Statement overlap is conservative. A single exact date/amount/description match can be adopted. Ambiguous matches stop the whole window; inspect the existing statement rows before resolving genuine duplicates. Do not delete legitimate transactions just to clear an error. Pause and retain file imports if uncertain.
- User deletion tombstones apply to the known provider ID. If Akahu replaces an ID after a substantial correction, Tide treats it as a new transaction and removes the missing old one when its window is checked. Categories/notes are not guessed across changed IDs; a replacement may need manual review, including a transaction previously deleted by the user.
- A date correction crossing two windows can take separate syncs to reconcile. Historical checks are gradual, not a guarantee that every older date matches the bank's latest refresh at once.
- If consent is revoked, reconnect ANZ at Akahu and retry. If the identity or accessible historical range changed, do not silently repoint an existing link; review the mapping with the operator.

## Verification boundary

Development uses synthetic provider responses and PostgreSQL fixtures, not live bank credentials. Live ANZ consent, production environment configuration, production migrations and the first real statement comparison remain activation checks.

References: [Personal Apps](https://developers.akahu.nz/docs/personal-apps), [transaction access and pagination](https://developers.akahu.nz/docs/accessing-transactional-data), [official SDK user type](https://github.com/akahu-io/akahu-sdk-js/blob/master/docs/type-aliases/User.md).
