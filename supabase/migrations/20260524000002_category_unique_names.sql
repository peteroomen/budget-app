-- Enforce unique category names per household.
-- Duplicate names would confuse the AI categorisation prompt and the user.
ALTER TABLE public.categories
  ADD CONSTRAINT categories_household_id_name_key UNIQUE (household_id, name);
