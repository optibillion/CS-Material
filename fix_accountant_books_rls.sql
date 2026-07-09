-- Fix: Accountant RLS policies
-- Accountant purpose: send books to distributors (institutions) only.
-- Run this in Supabase → SQL Editor.

-- 1. READ books (needed to see the book list in the Issue Books panel)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_books"
  ON books FOR SELECT TO authenticated USING (true);

-- 2. READ stock (needed to show stock levels in the Issue Books panel)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_stock"
  ON stock FOR SELECT TO authenticated USING (true);

-- 3. READ institutions/distributors (needed to load the distributor list and detail)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_institutions"
  ON institutions FOR SELECT TO authenticated USING (true);

-- 4. READ allotments (needed to show distributor history)
CREATE POLICY IF NOT EXISTS "allow_authenticated_read_allotments"
  ON allotments FOR SELECT TO authenticated USING (true);

-- 5. INSERT allotments (needed so accountant can actually issue books to a distributor)
CREATE POLICY IF NOT EXISTS "allow_authenticated_insert_allotments"
  ON allotments FOR INSERT TO authenticated WITH CHECK (true);

-- 6. UPDATE stock (needed only if "Deduct from Stock" is checked during issue)
CREATE POLICY IF NOT EXISTS "allow_authenticated_update_stock"
  ON stock FOR UPDATE TO authenticated USING (true);
