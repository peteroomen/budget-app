-- import_history: tracks every confirmed import with per-source breakdown stats.
-- Scoped directly by household_id for simple RLS (no join through accounts needed).
-- account_id is nullable ON DELETE SET NULL so records survive account deletion.

CREATE TABLE import_history (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       uuid         NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id         uuid         REFERENCES accounts(id) ON DELETE SET NULL,
  filename           text         NOT NULL,
  file_type          text         NOT NULL CHECK (file_type IN ('csv', 'pdf')),
  bank_format        text,
  imported_count     integer      NOT NULL DEFAULT 0,
  duplicates_count   integer      NOT NULL DEFAULT 0,
  from_map_count     integer      NOT NULL DEFAULT 0,
  from_claude_count  integer      NOT NULL DEFAULT 0,
  uncategorised_count integer     NOT NULL DEFAULT 0,
  imported_at        timestamptz  NOT NULL DEFAULT now(),
  created_at         timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their household import history"
  ON import_history FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "Users can insert their household import history"
  ON import_history FOR INSERT
  WITH CHECK (household_id = get_my_household_id());
