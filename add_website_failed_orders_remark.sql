-- Website Failed Orders: adds a "Purchased" status (lead already bought —
-- no need to call them) alongside the existing New/Contacted, plus an
-- optional free-text remark that can be added whenever a lead is marked
-- Contacted or Purchased (leaving it blank is fine, it's optional).
--
-- website_failed_orders isn't defined anywhere in this repo (created
-- directly in Supabase, like users.role — see add_website_support_role.sql)
-- so this just adds the new column defensively. status itself is plain
-- text with no CHECK constraint in the existing code path (toggle just
-- writes 'Contacted' or 'New'), so no constraint to widen for 'Purchased'.
-- If your table DOES have a status CHECK constraint, widen it with:
--   alter table website_failed_orders drop constraint <its name>;
--   alter table website_failed_orders add constraint <its name>
--     check (status in ('New', 'Contacted', 'Purchased'));
--
-- Run this once in Supabase → SQL Editor.

alter table website_failed_orders add column if not exists remark text;
