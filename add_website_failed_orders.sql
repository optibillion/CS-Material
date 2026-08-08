-- Website Failed Orders — failed/timed-out Razorpay payment attempts on
-- championsquareias.com (MPPSC Books page). Written directly by the Apps
-- Script backend (order-backend.gs → _logFailedAttempt /
-- _reconcileFailedPaymentFromRazorpay), completely SEPARATE from
-- website_orders — never mixed, never counted as a real order, purely a
-- call list for the team to follow up on and try to recover the sale.
-- Run this once in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS website_failed_orders (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id            TEXT UNIQUE NOT NULL,
  attempt_date          TIMESTAMPTZ,
  product_name          TEXT,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT UNIQUE,   -- nullable; multiple NULLs are allowed
                                        -- to coexist (Postgres doesn't treat
                                        -- NULL = NULL for uniqueness), only
                                        -- real duplicate payment ids collapse
  buyer_name            TEXT,
  phone                 TEXT,
  email                 TEXT,
  house                 TEXT,
  locality              TEXT,
  city                  TEXT,
  state                 TEXT,
  district              TEXT,
  pincode               TEXT,
  amount                NUMERIC,
  error_reason          TEXT,
  error_description     TEXT,
  status                TEXT NOT NULL DEFAULT 'New',   -- 'New' | 'Contacted'
  contacted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_failed_orders_attempt_date ON website_failed_orders (attempt_date DESC);

ALTER TABLE website_failed_orders ENABLE ROW LEVEL SECURITY;

-- Read-only for any logged-in admin/accountant/issuer — same pattern as
-- website_orders.
DROP POLICY IF EXISTS "allow_authenticated_read_website_failed_orders" ON website_failed_orders;
CREATE POLICY "allow_authenticated_read_website_failed_orders"
  ON website_failed_orders FOR SELECT TO authenticated USING (true);

-- Column-level grant: staff can only ever flip the tick mark (status +
-- contacted_at) — never edit the customer's info or the failure reason.
GRANT UPDATE (status, contacted_at) ON website_failed_orders TO authenticated;

DROP POLICY IF EXISTS "allow_authenticated_update_contacted" ON website_failed_orders;
CREATE POLICY "allow_authenticated_update_contacted"
  ON website_failed_orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- No INSERT/DELETE policy for anon or authenticated on purpose. Rows are
-- written ONLY by order-backend.gs using the Supabase service_role key,
-- which bypasses RLS entirely — nobody can fabricate or remove a lead
-- through the browser this way.

-- Per-user visibility toggle, same pattern as can_view_website_orders —
-- off by default for everyone until an admin explicitly turns it on for a
-- given issuer in Users.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_view_failed_orders BOOLEAN NOT NULL DEFAULT FALSE;
