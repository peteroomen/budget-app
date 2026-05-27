-- Migration: Convert "Savings" expense category → "Savings Transfer" transfer category
--
-- Phase 5 — Item C. The existing "Savings" category was expense-typed, which
-- meant moves to a savings account inflated spend totals (and on households
-- that also imported the savings account, the incoming side inflated income
-- totals too). Renaming it and flipping the type to 'transfer' lets the
-- downstream aggregators (dashboard, summary, chat, recurring) exclude these
-- rows from spend analysis.
--
-- Existing transactions categorised as "Savings" are preserved — they now
-- carry the new name/type automatically because nothing references it by id.
-- Budget rows tied to the old category are deleted: with type='transfer' the
-- budgets table would silently hide them (filter is type='expense'), so
-- leaving them around just clutters the DB and pollutes the auto-seed-from-
-- previous-month flow.
--
-- Idempotent: only rows still named "Savings" with type='expense' are touched.

UPDATE public.categories
SET    name       = 'Savings Transfer',
       color      = '#7A8E84',
       type       = 'transfer',
       updated_at = now()
WHERE  name = 'Savings'
  AND  type = 'expense';

-- Clean up budgets for the renamed category. With type='transfer' the budgets
-- UI no longer surfaces them; this prevents the auto-seed-from-previous-month
-- helper from copying them forward indefinitely.
DELETE FROM public.budgets
WHERE  category_id IN (
         SELECT id FROM public.categories
         WHERE  name = 'Savings Transfer'
           AND  type = 'transfer'
       );
