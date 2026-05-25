-- Seed default categories for all existing households.
-- is_system = true means these can be renamed/recoloured but not deleted via the UI.
-- ON DELETE SET NULL on transactions.category_id handles safe deletion if ever removed.

INSERT INTO public.categories (household_id, name, color, is_system)
SELECT
  h.id,
  c.name,
  c.color,
  true
FROM public.households h
CROSS JOIN (VALUES
  ('Groceries',           '#16a34a'),
  ('Dining & Takeaways',  '#ea580c'),
  ('Fuel',                '#dc2626'),
  ('Transport',           '#2563eb'),
  ('Utilities',           '#9333ea'),
  ('Housing',             '#64748b'),
  ('Insurance',           '#1d4ed8'),
  ('Childcare',           '#db2777'),
  ('Health',          '#0d9488'),
  ('Pharmacy',        '#0891b2'),
  ('Shopping',        '#4f46e5'),
  ('Kids',            '#ca8a04'),
  ('Entertainment',   '#7c3aed'),
  ('Subscriptions',   '#0e7490'),
  ('Savings',         '#059669'),
  ('Loan Repayments', '#475569'),
  ('Income',          '#15803d'),
  ('Other',           '#6b7280')
) AS c(name, color)
ON CONFLICT DO NOTHING;
