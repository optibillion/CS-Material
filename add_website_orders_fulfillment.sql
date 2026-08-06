-- Adds shipment/delivery tracking to website_orders, plus a narrow UPDATE
-- policy so the admin app can tick "Shipped"/"Delivered" without touching
-- payment/customer data (which stays write-only-by-Apps-Script, per the
-- original RLS design in add_website_orders.sql).
-- Run this once in Supabase → SQL Editor.

ALTER TABLE website_orders
  ADD COLUMN IF NOT EXISTS shipped      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shipped_awb  TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Column-level grant: even though the policy below allows UPDATE rows,
-- Postgres still blocks writing to any column not explicitly granted here —
-- so the admin app can only ever move an order through shipped/delivered,
-- never edit amount, buyer info, or anything the Apps Script backend owns.
GRANT UPDATE (shipped, shipped_awb, shipped_at, delivered, delivered_at)
  ON website_orders TO authenticated;

DROP POLICY IF EXISTS "allow_authenticated_update_fulfillment" ON website_orders;
CREATE POLICY "allow_authenticated_update_fulfillment"
  ON website_orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
