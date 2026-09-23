# ADR 004: Atomic imports and consistent financial reads

Date: 2026-09-07 · Status: accepted for the reliability PR

## Context

Client-supplied import confirmations could duplicate transactions, overwrite newer merchant rules and leave partial history. Supabase's default response limit could silently truncate financial queries. Household foreign keys did not establish ownership of referenced categories.

## Decision

Use authenticated PostgreSQL RPCs to stage validated, user-owned import drafts and commit them atomically. Confirmation accepts only a draft UUID. A draft lock makes retries return the original result; an account lock serialises overlapping imports. Transactions, new merchant memory and import history share a transaction. Current merchant rules take precedence over preview suggestions. Drafts expire after one day; abandoned draft payloads older than two days are removed when that user analyses another file. Successful drafts retain only metadata and the result to support durable retries.

Reconcile imports as multisets of account, date, signed cents and raw description. This preserves multiple identical purchases within one statement. Without bank transaction IDs, two separate partial files containing indistinguishable purchases cannot be disambiguated. Use complete, overlapping statements; the future bank-feed adapter must use provider transaction IDs.

Use an RLS-protected JSON snapshot for financial reporting. One SQL statement returns all activity, categories, expense budgets and the active household. A single JSON result bypasses the row-count truncation that applies to ordinary result sets. React caches repeated identical calls only within a render request. Operational lists use ordered 500-row pages and fail on any page error. These paginated lists are not a transactionally consistent snapshot under concurrent edits; import commit independently reconciles against the live database.

Expense credits reduce spending and income debits reduce income. Transfers are excluded. Uncategorised debits count as spending and credits count provisionally as income, explicitly labelled for review. Standing caps apply only to expense categories; uncategorised spending remains in overall spending. Zero and exact caps have explicit states.

Human category edits and merchant memory share a database transaction. Automatic categorisation does not delete existing memory and rechecks manual protection at write time. Recurring detection records provenance and respects manual choices. Existing recurring provenance is unknowable, so the migration conservatively preserves **all** existing true and false flags as manual. Detection continues to classify new imported activity; existing transactions can still be toggled individually.

## Consequences

Deploy the migration and matching application together. Existing previews must be analysed again after deployment. The bank-feed, catch-up and email stages remain separate. No database credentials, live AI calls or production migration are required to test this foundation.

PGlite regression tests execute the real migration chain and PostgreSQL RLS/functions with synthetic authentication. They cover sequential overlapping drafts and rollback, but do not simulate multiple independent database connections. A two-client concurrent import check remains a staging deployment gate.
