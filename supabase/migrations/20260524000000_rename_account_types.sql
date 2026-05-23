-- Rename account_type enum: checking→spending, savings→saving, drop credit.
-- Drop the column default first — it depends on the enum and blocks DROP TYPE.
-- No account rows exist yet so the USING cast is safe.

alter table accounts alter column type drop default;
alter table accounts alter column type type text;
drop type account_type;
create type account_type as enum ('spending', 'saving');
alter table accounts alter column type type account_type using type::account_type;
