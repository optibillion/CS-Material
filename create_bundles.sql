-- Create all bundles and auto-link existing books by unit
-- Run AFTER insert_english_books.sql, insert_hindi_books.sql, insert_both_books.sql
-- Supabase SQL Editor → New Query → Run

WITH created AS (
  INSERT INTO bundles (name, is_active) VALUES
  ('Prelims Full Kit',        true),
  ('Mains – Paper 1 Part-A', true),
  ('Mains – Paper 1 Part-B', true),
  ('Mains – Paper 2 Part-A', true),
  ('Mains – Paper 3 Part-A', true),
  ('Mains – Paper 3 Part-B', true),
  ('Mains – Paper 4 Part-A', true),
  ('Mains – Paper 4 Part-B', true),
  ('Mains – Paper 5',        true),
  ('Mains – Paper 6',        true)
  RETURNING id, name
)
INSERT INTO bundle_books (bundle_id, book_id)
SELECT c.id, b.id
FROM created c
JOIN books b ON b.is_active = true AND (
  (c.name = 'Prelims Full Kit'        AND b.exam_level = 'Prelims')
  OR (c.name = 'Mains – Paper 1 Part-A' AND b.exam_level = 'Mains' AND b.unit = 'Paper 1 Part-A')
  OR (c.name = 'Mains – Paper 1 Part-B' AND b.exam_level = 'Mains' AND b.unit = 'Paper 1 Part-B')
  OR (c.name = 'Mains – Paper 2 Part-A' AND b.exam_level = 'Mains' AND b.unit = 'Paper 2 Part-A')
  OR (c.name = 'Mains – Paper 3 Part-A' AND b.exam_level = 'Mains' AND b.unit = 'Paper 3 Part-A')
  OR (c.name = 'Mains – Paper 3 Part-B' AND b.exam_level = 'Mains' AND b.unit = 'Paper 3 Part-B')
  OR (c.name = 'Mains – Paper 4 Part-A' AND b.exam_level = 'Mains' AND b.unit = 'Paper 4 Part-A')
  OR (c.name = 'Mains – Paper 4 Part-B' AND b.exam_level = 'Mains' AND b.unit = 'Paper 4 Part-B')
  OR (c.name = 'Mains – Paper 5'         AND b.exam_level = 'Mains' AND b.unit = 'Paper 5')
  OR (c.name = 'Mains – Paper 6'         AND b.exam_level = 'Mains' AND b.unit = 'Paper 6')
);
