-- ============================================================
-- STOCK FRESH-START FIX — from Books.numbers (2026-07-14)
-- 38 Mains books: 24 Hindi + 14 English
--
-- WHAT THIS DOES:
--   1. Removes duplicate stock rows (keeps one per book)
--   2. Sets total_qty from your Excel file
--   3. Calculates available_qty = total_qty - issuances - sales - allotments
--   4. Fixes stock_additions to match
--   5. Adds unique constraint to prevent future duplicates
--
-- NOTES:
--   • English P2-A U2&3 (Indian Polity): skipped for now — fix later
--   • 9 other English books not in Excel are also untouched
--
-- HOW TO RUN:
--   Run STEP 0 first (preview only, no changes).
--   If it looks right, run STEP 1 through STEP 4.
-- ============================================================


-- ============================================================
-- STEP 0: PREVIEW — run this first, no changes made
-- Shows each book, current stock sum, and what it will become
-- ============================================================
WITH excel_data (medium, unit_col, part_col, excel_qty) AS (
  VALUES
  -- Hindi (24 books)
  ('hindi','Paper 1 Part-A','Unit-1',             504),
  ('hindi','Paper 1 Part-A','Unit-2 & Unit-5',    525),
  ('hindi','Paper 1 Part-A','Unit-3',             527),
  ('hindi','Paper 1 Part-A','Unit-4',             517),
  ('hindi','Paper 1 Part-B','Unit-1',             524),
  ('hindi','Paper 1 Part-B','Unit-2 & Unit-3',    523),
  ('hindi','Paper 1 Part-B','Unit-4',             529),
  ('hindi','Paper 1 Part-B','Unit-5',             532),
  ('hindi','Paper 2 Part-A','Unit-1',             526),
  ('hindi','Paper 2 Part-A','Unit-2 & Unit-3',    599),
  ('hindi','Paper 2 Part-A','Unit-4 & Unit-5',    527),
  ('hindi','Paper 3 Part-A','Unit-1 & Unit-2',    972),
  ('hindi','Paper 3 Part-A','Unit-3 & Unit-4',   1020),
  ('hindi','Paper 3 Part-A','Unit-5 & Unit-2',   1020),
  ('hindi','Paper 3 Part-B','Unit-1',            1004),
  ('hindi','Paper 3 Part-B','Unit-2',            1024),
  ('hindi','Paper 3 Part-B','Unit-3 & Unit-4',   1012),
  ('hindi','Paper 3 Part-B','Unit-5',            1031),
  ('hindi','Paper 4 Part-A','Unit-1',            1025),
  ('hindi','Paper 4 Part-A','Unit-2',            1023),
  ('hindi','Paper 4 Part-A','Unit-3 & Unit-4',   1024),
  ('hindi','Paper 4 Part-B','Unit-1 & Unit-2',   1014),
  ('hindi','Paper 4 Part-B','Unit-3 & Unit-4',   1025),
  ('hindi','Paper 4 Part-B','Unit-5',            1032),
  -- English (15 books)
  ('english','Paper 1 Part-A','Unit-1',           500),
  ('english','Paper 1 Part-A','Unit-3',           527),
  ('english','Paper 1 Part-A','Unit-4',           518),
  ('english','Paper 1 Part-B','Unit-1',           522),
  ('english','Paper 1 Part-B','Unit-2 & Unit-3',  527),
  ('english','Paper 3 Part-A','Unit-1 & Unit-2',  518),
  ('english','Paper 3 Part-A','Unit-3 & Unit-4',  510),
  ('english','Paper 3 Part-B','Unit-1',           522),
  ('english','Paper 3 Part-B','Unit-2',           512),
  ('english','Paper 3 Part-B','Unit-3 & Unit-4',  514),
  ('english','Paper 3 Part-B','Unit-5',           516),
  ('english','Paper 4 Part-A','Unit-2',           520),
  ('english','Paper 4 Part-B','Unit-1 & Unit-2',  521),
  ('english','Paper 4 Part-B','Unit-3 & Unit-4',  524)
),
book_targets AS (
  SELECT b.id AS book_id, b.title, b.medium, b.unit, b.part, e.excel_qty
  FROM excel_data e
  JOIN books b ON b.medium = e.medium
               AND b.unit = e.unit_col
               AND b.part = e.part_col
               AND b.exam_level = 'Mains'
)
SELECT
  bt.medium,
  bt.unit,
  bt.part,
  bt.excel_qty AS excel_total,
  (SELECT COUNT(*) FROM stock WHERE book_id = bt.book_id) AS stock_rows,
  (SELECT COALESCE(SUM(available_qty),0) FROM stock WHERE book_id = bt.book_id) AS current_avail_sum,
  GREATEST(0, bt.excel_qty
    - COALESCE((SELECT COUNT(*) FROM issuances
                WHERE book_id = bt.book_id
                  AND is_previous_issuance = false
                  AND is_reversed = false), 0)
    - COALESCE((SELECT SUM(qty) FROM sales
                WHERE book_id = bt.book_id AND is_returned = false), 0)
    - COALESCE((SELECT SUM(qty) FROM allotments
                WHERE book_id = bt.book_id), 0)
  ) AS correct_avail,
  COALESCE((SELECT COUNT(*) FROM issuances
            WHERE book_id = bt.book_id
              AND is_previous_issuance = false
              AND is_reversed = false), 0) AS deduct_issuances,
  COALESCE((SELECT SUM(qty) FROM sales
            WHERE book_id = bt.book_id AND is_returned = false), 0) AS deduct_sales,
  COALESCE((SELECT SUM(qty) FROM allotments
            WHERE book_id = bt.book_id), 0) AS deduct_allotments,
  substring(bt.book_id::text, 1, 8) AS book_id_prefix
FROM book_targets bt
ORDER BY bt.medium DESC, bt.unit, bt.part;


-- ============================================================
-- STEP 1: Remove duplicate stock entries
-- Keeps the oldest row (lowest id::text) per book
-- Safe to run multiple times (idempotent)
-- ============================================================
DELETE FROM stock
WHERE id IN (
  SELECT s.id
  FROM stock s
  JOIN books b ON b.id = s.book_id AND b.exam_level = 'Mains'
  JOIN (
    SELECT 'hindi' AS medium UNION ALL SELECT 'english'
  ) mediums ON b.medium = mediums.medium
  WHERE s.id::text != (
    SELECT MIN(s2.id::text)
    FROM stock s2
    WHERE s2.book_id = s.book_id
  )
);

-- ============================================================
-- STEP 2: Update stock with correct total_qty and available_qty
-- ============================================================
WITH excel_data (medium, unit_col, part_col, excel_qty) AS (
  VALUES
  ('hindi','Paper 1 Part-A','Unit-1',             504),
  ('hindi','Paper 1 Part-A','Unit-2 & Unit-5',    525),
  ('hindi','Paper 1 Part-A','Unit-3',             527),
  ('hindi','Paper 1 Part-A','Unit-4',             517),
  ('hindi','Paper 1 Part-B','Unit-1',             524),
  ('hindi','Paper 1 Part-B','Unit-2 & Unit-3',    523),
  ('hindi','Paper 1 Part-B','Unit-4',             529),
  ('hindi','Paper 1 Part-B','Unit-5',             532),
  ('hindi','Paper 2 Part-A','Unit-1',             526),
  ('hindi','Paper 2 Part-A','Unit-2 & Unit-3',    599),
  ('hindi','Paper 2 Part-A','Unit-4 & Unit-5',    527),
  ('hindi','Paper 3 Part-A','Unit-1 & Unit-2',    972),
  ('hindi','Paper 3 Part-A','Unit-3 & Unit-4',   1020),
  ('hindi','Paper 3 Part-A','Unit-5 & Unit-2',   1020),
  ('hindi','Paper 3 Part-B','Unit-1',            1004),
  ('hindi','Paper 3 Part-B','Unit-2',            1024),
  ('hindi','Paper 3 Part-B','Unit-3 & Unit-4',   1012),
  ('hindi','Paper 3 Part-B','Unit-5',            1031),
  ('hindi','Paper 4 Part-A','Unit-1',            1025),
  ('hindi','Paper 4 Part-A','Unit-2',            1023),
  ('hindi','Paper 4 Part-A','Unit-3 & Unit-4',   1024),
  ('hindi','Paper 4 Part-B','Unit-1 & Unit-2',   1014),
  ('hindi','Paper 4 Part-B','Unit-3 & Unit-4',   1025),
  ('hindi','Paper 4 Part-B','Unit-5',            1032),
  ('english','Paper 1 Part-A','Unit-1',           500),
  ('english','Paper 1 Part-A','Unit-3',           527),
  ('english','Paper 1 Part-A','Unit-4',           518),
  ('english','Paper 1 Part-B','Unit-1',           522),
  ('english','Paper 1 Part-B','Unit-2 & Unit-3',  527),
  ('english','Paper 3 Part-A','Unit-1 & Unit-2',  518),
  ('english','Paper 3 Part-A','Unit-3 & Unit-4',  510),
  ('english','Paper 3 Part-B','Unit-1',           522),
  ('english','Paper 3 Part-B','Unit-2',           512),
  ('english','Paper 3 Part-B','Unit-3 & Unit-4',  514),
  ('english','Paper 3 Part-B','Unit-5',           516),
  ('english','Paper 4 Part-A','Unit-2',           520),
  ('english','Paper 4 Part-B','Unit-1 & Unit-2',  521),
  ('english','Paper 4 Part-B','Unit-3 & Unit-4',  524)
),
book_targets AS (
  SELECT b.id AS book_id, e.excel_qty
  FROM excel_data e
  JOIN books b ON b.medium = e.medium
               AND b.unit = e.unit_col
               AND b.part = e.part_col
               AND b.exam_level = 'Mains'
)
UPDATE stock s
SET
  total_qty    = bt.excel_qty,
  available_qty = GREATEST(0, bt.excel_qty
    - COALESCE((SELECT COUNT(*) FROM issuances
                WHERE book_id = bt.book_id
                  AND is_previous_issuance = false
                  AND is_reversed = false), 0)
    - COALESCE((SELECT SUM(qty) FROM sales
                WHERE book_id = bt.book_id AND is_returned = false), 0)
    - COALESCE((SELECT SUM(qty) FROM allotments
                WHERE book_id = bt.book_id), 0)
  )
FROM book_targets bt
WHERE s.book_id = bt.book_id;


-- ============================================================
-- STEP 3: Fix stock_additions — delete all for these books,
--         insert one clean entry per book matching total_qty
-- ============================================================
DELETE FROM stock_additions
WHERE book_id IN (
  SELECT b.id FROM books b
  WHERE b.exam_level = 'Mains' AND b.medium IN ('hindi','english')
    AND EXISTS (SELECT 1 FROM stock WHERE book_id = b.id)
);

WITH excel_data (medium, unit_col, part_col, excel_qty) AS (
  VALUES
  ('hindi','Paper 1 Part-A','Unit-1',             504),
  ('hindi','Paper 1 Part-A','Unit-2 & Unit-5',    525),
  ('hindi','Paper 1 Part-A','Unit-3',             527),
  ('hindi','Paper 1 Part-A','Unit-4',             517),
  ('hindi','Paper 1 Part-B','Unit-1',             524),
  ('hindi','Paper 1 Part-B','Unit-2 & Unit-3',    523),
  ('hindi','Paper 1 Part-B','Unit-4',             529),
  ('hindi','Paper 1 Part-B','Unit-5',             532),
  ('hindi','Paper 2 Part-A','Unit-1',             526),
  ('hindi','Paper 2 Part-A','Unit-2 & Unit-3',    599),
  ('hindi','Paper 2 Part-A','Unit-4 & Unit-5',    527),
  ('hindi','Paper 3 Part-A','Unit-1 & Unit-2',    972),
  ('hindi','Paper 3 Part-A','Unit-3 & Unit-4',   1020),
  ('hindi','Paper 3 Part-A','Unit-5 & Unit-2',   1020),
  ('hindi','Paper 3 Part-B','Unit-1',            1004),
  ('hindi','Paper 3 Part-B','Unit-2',            1024),
  ('hindi','Paper 3 Part-B','Unit-3 & Unit-4',   1012),
  ('hindi','Paper 3 Part-B','Unit-5',            1031),
  ('hindi','Paper 4 Part-A','Unit-1',            1025),
  ('hindi','Paper 4 Part-A','Unit-2',            1023),
  ('hindi','Paper 4 Part-A','Unit-3 & Unit-4',   1024),
  ('hindi','Paper 4 Part-B','Unit-1 & Unit-2',   1014),
  ('hindi','Paper 4 Part-B','Unit-3 & Unit-4',   1025),
  ('hindi','Paper 4 Part-B','Unit-5',            1032),
  ('english','Paper 1 Part-A','Unit-1',           500),
  ('english','Paper 1 Part-A','Unit-3',           527),
  ('english','Paper 1 Part-A','Unit-4',           518),
  ('english','Paper 1 Part-B','Unit-1',           522),
  ('english','Paper 1 Part-B','Unit-2 & Unit-3',  527),
  ('english','Paper 3 Part-A','Unit-1 & Unit-2',  518),
  ('english','Paper 3 Part-A','Unit-3 & Unit-4',  510),
  ('english','Paper 3 Part-B','Unit-1',           522),
  ('english','Paper 3 Part-B','Unit-2',           512),
  ('english','Paper 3 Part-B','Unit-3 & Unit-4',  514),
  ('english','Paper 3 Part-B','Unit-5',           516),
  ('english','Paper 4 Part-A','Unit-2',           520),
  ('english','Paper 4 Part-B','Unit-1 & Unit-2',  521),
  ('english','Paper 4 Part-B','Unit-3 & Unit-4',  524)
)
INSERT INTO stock_additions (book_id, qty, note, added_at)
SELECT
  b.id,
  e.excel_qty,
  'Fresh-start recalculation from Books.numbers 2026-07-14',
  NOW()
FROM excel_data e
JOIN books b ON b.medium = e.medium
             AND b.unit = e.unit_col
             AND b.part = e.part_col
             AND b.exam_level = 'Mains';


-- ============================================================
-- STEP 4: Add unique constraint to prevent future duplicates
-- Skip if it already exists (the IF NOT EXISTS syntax isn't
-- supported for constraints — just run once)
-- ============================================================
ALTER TABLE stock ADD CONSTRAINT stock_book_id_unique UNIQUE (book_id);


-- ============================================================
-- STEP 5: VERIFY — run this after the fix to confirm results
-- ============================================================
SELECT
  b.medium,
  b.unit,
  b.part,
  s.total_qty,
  s.available_qty,
  s.total_qty - s.available_qty AS total_deducted,
  (SELECT COUNT(*) FROM issuances
   WHERE book_id = b.id AND is_previous_issuance = false AND is_reversed = false) AS issued,
  (SELECT COALESCE(SUM(qty),0) FROM sales
   WHERE book_id = b.id AND is_returned = false) AS sold,
  (SELECT COALESCE(SUM(qty),0) FROM allotments WHERE book_id = b.id) AS allotted
FROM stock s
JOIN books b ON b.id = s.book_id
WHERE b.exam_level = 'Mains' AND b.medium IN ('hindi','english')
ORDER BY b.medium DESC, b.unit, b.part;
