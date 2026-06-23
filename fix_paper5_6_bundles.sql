-- Remove combined Paper 5 & 6 bundle and create them separately
-- Supabase SQL Editor → New Query → Run

-- Step 1: Delete the combined bundle (cascade deletes bundle_books too)
DELETE FROM bundle_books WHERE bundle_id = (SELECT id FROM bundles WHERE name = 'Mains – Paper 5 & 6');
DELETE FROM bundles WHERE name = 'Mains – Paper 5 & 6';

-- Step 2: Create separate bundles and link books
WITH created AS (
  INSERT INTO bundles (name, is_active) VALUES
  ('Mains – Paper 5', true),
  ('Mains – Paper 6', true)
  RETURNING id, name
)
INSERT INTO bundle_books (bundle_id, book_id)
SELECT c.id, b.id
FROM created c
JOIN books b ON b.is_active = true AND (
  (c.name = 'Mains – Paper 5' AND b.exam_level = 'Mains' AND b.unit = 'Paper 5')
  OR (c.name = 'Mains – Paper 6' AND b.exam_level = 'Mains' AND b.unit = 'Paper 6')
);
