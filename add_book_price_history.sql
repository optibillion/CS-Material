-- ============================================================
-- Scheduled / effective-dated book pricing.
--
-- Problem: changing a book's MRP in Book Prices used to overwrite
-- books.mrp in place. Allotments already froze unit_mrp at the
-- moment they were created, so distributor slips stayed correct —
-- but there was no way to say "this new price starts on <date>",
-- and the Sales dashboard MRP total recomputed every past sale at
-- today's live price instead of the price at sale time.
--
-- Fix: every price change is a new dated row in book_price_history
-- instead of an overwrite. "Current price" = the row with the
-- latest effective_from that is <= now(). A row with a future
-- effective_from is simply invisible to that lookup until its date
-- arrives, which is what gives us "schedule a price for later" for
-- free, with no cron job needed — every read already asks "as of
-- when", so transactions keep snapshotting the right price whether
-- that read happens today or next month.
--
-- Run this once in Supabase → SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS book_price_history (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id        UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  mrp            NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_price_history_book_effective
  ON book_price_history (book_id, effective_from DESC);

ALTER TABLE book_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_read_book_price_history" ON book_price_history;
CREATE POLICY "allow_authenticated_read_book_price_history"
  ON book_price_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_authenticated_insert_book_price_history" ON book_price_history;
CREATE POLICY "allow_authenticated_insert_book_price_history"
  ON book_price_history FOR INSERT TO authenticated WITH CHECK (true);

-- Delete is only ever used client-side to cancel a scheduled price
-- that hasn't taken effect yet (see BookPrices.jsx) — app logic
-- enforces the "not yet active" check, matching this app's existing
-- pattern of permissive RLS + client-side gating (see priceAccess).
DROP POLICY IF EXISTS "allow_authenticated_delete_book_price_history" ON book_price_history;
CREATE POLICY "allow_authenticated_delete_book_price_history"
  ON book_price_history FOR DELETE TO authenticated USING (true);

-- Backfill: give every book that already has an mrp a baseline
-- history row dated at the start of time, so the "latest row <= now"
-- lookup never comes up empty for existing books.
INSERT INTO book_price_history (book_id, mrp, effective_from)
SELECT id, mrp, '2000-01-01'::timestamptz
FROM books
WHERE mrp IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM book_price_history h WHERE h.book_id = books.id);

-- ------------------------------------------------------------
-- Sales: freeze the list price at sale time, same as allotments
-- already do with unit_mrp, so the dashboard's MRP total stops
-- recomputing old sales at today's price.
-- ------------------------------------------------------------
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_mrp NUMERIC(10,2);

UPDATE sales s
SET unit_mrp = b.mrp
FROM books b
WHERE b.id = s.book_id AND s.unit_mrp IS NULL;

CREATE OR REPLACE FUNCTION get_total_sales_mrp()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select coalesce(sum(s.qty * coalesce(s.unit_mrp, b.mrp, 0)), 0)::numeric
  from sales s
  left join books b on b.id = s.book_id
  where s.is_returned = false;
$$;

grant execute on function get_total_sales_mrp() to authenticated;
