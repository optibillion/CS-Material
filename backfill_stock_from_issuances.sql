-- ============================================================
-- STEP 1: Preview — run this first to see what will change
-- Shows: current stock, how many were issued, what will remain
-- ============================================================
SELECT
  b.title,
  s.available_qty                          AS stock_now,
  COALESCE(i.total_issued, 0)              AS to_deduct,
  GREATEST(0, s.available_qty - COALESCE(i.total_issued, 0)) AS stock_after
FROM stock s
JOIN books b ON b.id = s.book_id
LEFT JOIN (
  SELECT book_id, COUNT(*) AS total_issued
  FROM issuances
  WHERE is_reversed = false
  GROUP BY book_id
) i ON i.book_id = s.book_id
WHERE COALESCE(i.total_issued, 0) > 0
ORDER BY to_deduct DESC;


-- ============================================================
-- STEP 2: Apply — run this once you're happy with the preview
-- Deducts all issuances from stock in one go
-- ============================================================
UPDATE stock
SET available_qty = GREATEST(0, available_qty - issuance_counts.total_issued)
FROM (
  SELECT book_id, COUNT(*) AS total_issued
  FROM issuances
  WHERE is_reversed = false
  GROUP BY book_id
) AS issuance_counts
WHERE stock.book_id = issuance_counts.book_id;
