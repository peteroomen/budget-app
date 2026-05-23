# One-Time Household Setup

Run this once after both accounts exist in Supabase Auth. You only need to do this once — Peter creates the household, then Megan is linked to it.

---

## Step 1 — Invite Megan via Supabase Dashboard

1. Open your Supabase project → **Authentication** → **Users**
2. Click **Invite user**, enter Megan's email
3. Megan receives an email, clicks the link, sets a password
4. Her `auth.users` row is created, and the trigger auto-creates a `profiles` row

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
