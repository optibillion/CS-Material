-- Adds a per-user toggle controlling which issuer accounts can see the
-- "Website Orders" page (admin already sees it unconditionally, same as
-- Distributors/Inventory/Book Prices access). Off by default for everyone
-- until an admin explicitly turns it on for a given issuer in Users.
-- Run this once in Supabase → SQL Editor.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_view_website_orders BOOLEAN NOT NULL DEFAULT FALSE;
