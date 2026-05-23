# One-Time Household Setup

Run this once after both accounts exist in Supabase Auth. You only need to do this once — Peter creates the household, then Megan is linked to it.

---

## Prerequisites — Set your Supabase site URL

Before sending the invite, confirm the **Site URL** in Supabase matches where the app is running:

- Supabase dashboard → **Authentication** → **URL Configuration**
- **Site URL:** `http://localhost:3000` (dev) or your Vercel URL (prod)
- Add `http://localhost:3000/auth/confirm` to **Redirect URLs** (allows the invite link to work locally)

---

## Step 1 — Create Peter's account via Supabase Dashboard

1. Open your Supabase project → **Authentication** → **Users**
2. Click **Add user** → **Create new user**, enter Peter's email and a password
3. His `auth.users` row is created, and the trigger auto-creates a `profiles` row

---

## Step 2 — Invite Megan via Supabase Dashboard

1. In **Authentication** → **Users**, click **Invite user**, enter Megan's email
2. Megan receives an email with a link — she clicks it and lands on `/auth/set-password`
3. She sets a password and is redirected to the dashboard
4. Her `auth.users` row is created, and the trigger auto-creates a `profiles` row

> **Note:** The invite link goes to `/auth/confirm` in your app and exchanges a token before redirecting to `/auth/set-password`. Both of these routes must be reachable from the browser — make sure the app is running when Megan clicks the link.

---

## Step 2 — Run this SQL in the Supabase SQL editor

Replace the email addresses with the real ones.

```sql
-- 1. Create the household
insert into households (name)
values ('Oomen')
returning id;

-- 2. Copy the id from step 1, then link both profiles
-- Replace <household_id> with the uuid returned above
-- Replace the emails with the actual addresses

update profiles
set household_id = '<household_id>'
where email in ('peter@example.com', 'megan@example.com');
```

After this runs, both users will have `household_id` set and all RLS policies will correctly scope their data to the shared household.

---

## Verify

```sql
select id, email, household_id from profiles;
```

Both rows should show the same `household_id`.
