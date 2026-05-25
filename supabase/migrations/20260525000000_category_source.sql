-- Track how each transaction got its category assigned
ALTER TABLE transactions
  ADD COLUMN category_source text
  CHECK (category_source IN ('claude', 'manual', 'map'));
