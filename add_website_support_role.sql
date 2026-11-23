-- Adds a new 'website_support' user role: access to ONLY Website Orders
-- (view-only — no ship/deliver/delete) and Website Failed Orders (full
-- edit — mark leads as Contacted). Nothing else (no Students/Sales/
-- Distributors/Inventory/Dashboard).
--
-- users.role has an undocumented DB CHECK constraint (not defined anywhere
-- in this repo — added directly in Supabase at some point) restricting it
-- to a fixed list. Inserting 'website_support' without widening it first
-- fails with: ERROR 23514 violates check constraint "users_role_check".
-- Run this once in Supabase → SQL Editor before creating a website_support
-- user from Admin → Users.

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('admin', 'accountant', 'issuer', 'view_admin', 'website_support'));
