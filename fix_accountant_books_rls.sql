-- Fix: Accountant cannot see books in the Issue Books panel
-- Root cause: RLS policy on the books table did not include the 'accountant' role.
-- Run this in Supabase → SQL Editor.

-- Allow ALL authenticated users (admin, issuer, accountant) to read books
-- Books are a read-only catalog for non-admin roles — no harm in allowing full read.
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_books"
  ON books FOR SELECT TO authenticated USING (true);

-- Also ensure accountants can read stock (needed for stock levels in issue panel)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_stock"
  ON stock FOR SELECT TO authenticated USING (true);

-- Also ensure accountants can read allotments (for distributor history)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_allotments"
  ON allotments FOR SELECT TO authenticated USING (true);

-- Also ensure accountants can read institutions (for distributor list)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_institutions"
  ON institutions FOR SELECT TO authenticated USING (true);
