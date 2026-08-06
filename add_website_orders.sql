-- Website Orders — orders placed on championsquareias.com (Razorpay checkout
-- on the MPPSC Books page). Written directly by the Apps Script backend
-- (order-backend.gs → _verifyPayment) at the exact moment a payment is
-- verified, the same moment the row lands in the "Orders" Google Sheet.
-- Run this once in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS website_orders (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cs_order_id           TEXT UNIQUE NOT NULL,
  order_date            TIMESTAMPTZ,
  product_name          TEXT,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
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
  status                TEXT,
  books_ordered         TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_orders_order_date ON website_orders (order_date DESC);

ALTER TABLE website_orders ENABLE ROW LEVEL SECURITY;

-- Read-only for any logged-in admin/accountant/issuer — matches the pattern
-- used for sales/issuances/students elsewhere in this project.
DROP POLICY IF EXISTS "allow_authenticated_read_website_orders" ON website_orders;
CREATE POLICY "allow_authenticated_read_website_orders"
  ON website_orders FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policy for anon or authenticated on purpose.
-- Rows are written ONLY by order-backend.gs using the Supabase service_role
-- key (stored in Apps Script Script Properties, never in any HTML/JS the
-- browser can see), which bypasses RLS entirely. Nobody can fabricate a
-- fake order through the browser this way.
