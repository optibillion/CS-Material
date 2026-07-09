-- Stock additions log — tracks every batch received per book
-- Run this in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS stock_additions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id    uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  qty        integer     NOT NULL CHECK (qty > 0),
  added_by   uuid        REFERENCES users(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  note       text
);

ALTER TABLE stock_additions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_read_stock_additions" ON stock_additions;
CREATE POLICY "allow_authenticated_read_stock_additions"
  ON stock_additions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_authenticated_insert_stock_additions" ON stock_additions;
CREATE POLICY "allow_authenticated_insert_stock_additions"
  ON stock_additions FOR INSERT TO authenticated WITH CHECK (true);
