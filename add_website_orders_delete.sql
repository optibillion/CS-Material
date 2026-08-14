-- Lets the admin app permanently remove a website order row — needed to
-- clean up duplicate orders that sometimes land twice from the website
-- checkout flow. Matches the narrow-grant pattern used for fulfillment
-- updates in add_website_orders_fulfillment.sql.
-- Run this once in Supabase → SQL Editor.

DROP POLICY IF EXISTS "allow_authenticated_delete_website_orders" ON website_orders;
CREATE POLICY "allow_authenticated_delete_website_orders"
  ON website_orders FOR DELETE TO authenticated
  USING (true);
