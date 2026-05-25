-- Migration: Merge "Dining Out" + "Takeaways" → "Dining & Takeaways", add "Housing"
--
-- Handles all four household states safely:
--   1. Has both "Dining Out" and "Takeaways" → rename Dining Out, merge Takeaways into it, delete Takeaways
--   2. Has only "Dining Out"                  → rename to "Dining & Takeaways"
--   3. Has only "Takeaways"                   → rename to "Dining & Takeaways"
--   4. Has neither                            → no-op for merge steps; Housing still inserted

DO $$
DECLARE
  r RECORD;
  dining_id   uuid;
  takeaway_id uuid;
BEGIN

  -- -------------------------------------------------------------------------
  -- STEP 1: Rename "Dining Out" → "Dining & Takeaways" for all households
  -- -------------------------------------------------------------------------
  UPDATE public.categories
  SET    name       = 'Dining & Takeaways',
         updated_at = now()
  WHERE  name = 'Dining Out';

  -- -------------------------------------------------------------------------
  -- STEP 2: Merge "Takeaways" into "Dining & Takeaways" for households that
  --         had both categories (after step 1, "Dining & Takeaways" exists and
  --         "Takeaways" still exists in those households).
  -- -------------------------------------------------------------------------
  FOR r IN
    SELECT t.household_id,
           d.id AS dining_id,
           t.id AS takeaway_id
    FROM   public.categories t
    JOIN   public.categories d
           ON  d.household_id = t.household_id
           AND d.name         = 'Dining & Takeaways'
    WHERE  t.name = 'Takeaways'
  LOOP
    dining_id   := r.dining_id;
    takeaway_id := r.takeaway_id;

    -- 2a. Reassign transactions
    UPDATE public.transactions
    SET    category_id = dining_id,
           updated_at  = now()
    WHERE  category_id = takeaway_id;

    -- 2b. Reassign merchant_category_map rows.
    --     If a merchant already has a mapping to dining_id, delete the
    --     takeaway row (keeping the existing dining mapping).
    --     Otherwise update it to point at dining_id.
    DELETE FROM public.merchant_category_map
    WHERE  category_id = takeaway_id
      AND  EXISTS (
             SELECT 1
             FROM   public.merchant_category_map existing
             WHERE  existing.household_id  = r.household_id
               AND  existing.merchant_name = merchant_category_map.merchant_name
               AND  existing.category_id   = dining_id
           );

    UPDATE public.merchant_category_map
    SET    category_id = dining_id,
           updated_at  = now()
    WHERE  category_id = takeaway_id;

    -- 2c. Merge budgets.
    --     For months where both categories have a budget, sum them into the
    --     dining budget using ON CONFLICT DO UPDATE, then delete the takeaway rows.
    INSERT INTO public.budgets (household_id, category_id, month, amount_cents)
    SELECT household_id, dining_id, month, amount_cents
    FROM   public.budgets
    WHERE  category_id = takeaway_id
    ON CONFLICT (household_id, category_id, month)
    DO UPDATE SET
      amount_cents = public.budgets.amount_cents + EXCLUDED.amount_cents,
      updated_at   = now();

    DELETE FROM public.budgets
    WHERE  category_id = takeaway_id;

    -- 2d. Delete the now-orphaned "Takeaways" category row
    DELETE FROM public.categories
    WHERE  id = takeaway_id;

  END LOOP;

  -- -------------------------------------------------------------------------
  -- STEP 3: Rename any remaining "Takeaways" rows (households that had only
  --         "Takeaways" — step 1 was a no-op for them and step 2 skipped them).
  -- -------------------------------------------------------------------------
  UPDATE public.categories
  SET    name       = 'Dining & Takeaways',
         updated_at = now()
  WHERE  name = 'Takeaways';

  -- -------------------------------------------------------------------------
  -- STEP 4: Insert "Housing" as a system category for every household.
  --         ON CONFLICT DO NOTHING makes this idempotent.
  -- -------------------------------------------------------------------------
  INSERT INTO public.categories (household_id, name, color, is_system)
  SELECT h.id, 'Housing', '#64748b', true
  FROM   public.households h
  ON CONFLICT (household_id, name) DO NOTHING;

END $$;
