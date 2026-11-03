-- Stock corrections log — records every manual "Correct" override
-- of available_qty with a structured delta, so a deliberate
-- correction (e.g. physical recount finds damage/loss not captured
-- by any sale/issuance/allotment) is distinguishable from a real
-- bug-driven mismatch when auditing stock later, and shows up in
-- the book's movement history instead of only a free-text admin log.
-- Run this in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS stock_corrections (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id         uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  old_available   integer     NOT NULL,
  new_available   integer     NOT NULL,
  delta           integer     NOT NULL,
  reason          text,
  corrected_by    uuid        REFERENCES users(id),
  corrected_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_read_stock_corrections" ON stock_corrections;
CREATE POLICY "allow_authenticated_read_stock_corrections"
  ON stock_corrections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_authenticated_insert_stock_corrections" ON stock_corrections;
CREATE POLICY "allow_authenticated_insert_stock_corrections"
  ON stock_corrections FOR INSERT TO authenticated WITH CHECK (true);
