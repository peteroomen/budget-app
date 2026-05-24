-- Preserve manual merchant overrides when "Re-categorise all" is run
ALTER TABLE merchant_category_map
  ADD COLUMN is_manual boolean NOT NULL DEFAULT false;
