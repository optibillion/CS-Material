-- Lets the admin app record "take back books from a distributor" as its
-- own ledger entry instead of mutating or deleting the original issuance
-- row. A return is inserted as a NEGATIVE-qty allotment row tagged
-- is_reversal = true, linked back to the batch it's returning against via
-- reversed_batch_at. Because every existing total (dashboard RPCs,
-- distributor cards, Grand Bill, Books Summary) is a plain
-- SUM(qty) / SUM(qty * unit_mrp * (1 - discount_pct/100)) with no WHERE
-- filter on sign, a negative row nets out of all of them automatically —
-- using the SAME unit_mrp/discount_pct captured on the original batch, so
-- only the amount actually charged (after discount) is credited back, not
-- full MRP. History is preserved: the original batch keeps its original
-- qty forever, and the return shows up as its own dated entry.
-- Run this once in Supabase → SQL Editor.

ALTER TABLE allotments
  ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_batch_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_allotments_reversed_batch_at ON allotments (reversed_batch_at);
