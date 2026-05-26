-- Update category colours to the Tide editorial palette.
-- Colours are tuned to OKLCH L≈0.55 / C≈0.085-0.10 — muted, botanical, equal
-- visual weight at 9px dot size. Works in both light and dark modes.
-- Matches by name, so user-renamed categories are unaffected.

UPDATE public.categories SET color = '#6E8B4F' WHERE name = 'Groceries';      -- olive
UPDATE public.categories SET color = '#B25A6A' WHERE name = 'Dining & Takeaways'; -- dusty crimson
UPDATE public.categories SET color = '#A35044' WHERE name = 'Fuel';           -- rust
UPDATE public.categories SET color = '#B27144' WHERE name = 'Transport';      -- burnt sienna
UPDATE public.categories SET color = '#856F9F' WHERE name = 'Utilities';      -- muted violet
UPDATE public.categories SET color = '#5A8DA8' WHERE name = 'Insurance';      -- dusty teal-blue (steady, recurring)
UPDATE public.categories SET color = '#B86E89' WHERE name = 'Childcare';      -- dusty rose
UPDATE public.categories SET color = '#5BA395' WHERE name = 'Health';         -- sea-foam
UPDATE public.categories SET color = '#6BA8A0' WHERE name = 'Pharmacy';       -- lighter sea-foam (distinct from Health)
UPDATE public.categories SET color = '#9B6B9C' WHERE name = 'Shopping';       -- dusty plum
UPDATE public.categories SET color = '#A38663' WHERE name = 'Kids';           -- clay tan
UPDATE public.categories SET color = '#C49A3F' WHERE name = 'Entertainment';  -- antique gold
UPDATE public.categories SET color = '#7A85B5' WHERE name = 'Subscriptions';  -- periwinkle
UPDATE public.categories SET color = '#4F8E6E' WHERE name = 'Savings';        -- fern
UPDATE public.categories SET color = '#475C7A' WHERE name = 'Housing';         -- navy slate (fixed cost)
UPDATE public.categories SET color = '#475C7A' WHERE name = 'Loan Repayments'; -- navy slate (heavy/fixed like Rent)
UPDATE public.categories SET color = '#5C9479' WHERE name = 'Income';         -- tide-sage
UPDATE public.categories SET color = '#8E8780' WHERE name = 'Other';          -- warm neutral (signals "unset")
