-- Fix: Accountant RLS policies
-- Accountant purpose: send books to distributors only.
-- Run this in Supabase → SQL Editor.

-- 1. READ books
DROP POLICY IF EXISTS "allow_authenticated_read_books" ON books;
CREATE POLICY "allow_authenticated_read_books"
  ON books FOR SELECT TO authenticated USING (true);

-- 2. READ stock
DROP POLICY IF EXISTS "allow_authenticated_read_stock" ON stock;
CREATE POLICY "allow_authenticated_read_stock"
  ON stock FOR SELECT TO authenticated USING (true);

-- 3. READ institutions (distributors)
DROP POLICY IF EXISTS "allow_authenticated_read_institutions" ON institutions;
CREATE POLICY "allow_authenticated_read_institutions"
  ON institutions FOR SELECT TO authenticated USING (true);

-- 4. READ allotments
DROP POLICY IF EXISTS "allow_authenticated_read_allotments" ON allotments;
CREATE POLICY "allow_authenticated_read_allotments"
  ON allotments FOR SELECT TO authenticated USING (true);

-- 5. INSERT allotments (so accountant can issue books to a distributor)
DROP POLICY IF EXISTS "allow_authenticated_insert_allotments" ON allotments;
CREATE POLICY "allow_authenticated_insert_allotments"
  ON allotments FOR INSERT TO authenticated WITH CHECK (true);

-- 6. UPDATE stock (for "Deduct from Stock" during issue)
DROP POLICY IF EXISTS "allow_authenticated_update_stock" ON stock;
CREATE POLICY "allow_authenticated_update_stock"
  ON stock FOR UPDATE TO authenticated USING (true);

-- 7. READ sales (accountant can view sales history — read only, no insert/update)
DROP POLICY IF EXISTS "allow_authenticated_read_sales" ON sales;
CREATE POLICY "allow_authenticated_read_sales"
  ON sales FOR SELECT TO authenticated USING (true);
