-- ============================================================
-- MRP UPDATE — MAINS BOOKS ONLY
-- Matched by: medium + exam_level + unit (Paper X Part-Y) + part (Unit-N)
-- No title matching. Books not matched below are untouched.
-- ============================================================

-- ─────────────────────────────────────────
-- HINDI MEDIUM  (24 books)
-- ─────────────────────────────────────────

UPDATE books SET mrp = 580 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-1';
UPDATE books SET mrp = 540 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-2 & Unit-5';
UPDATE books SET mrp = 480 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-3';
UPDATE books SET mrp = 480 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-4';

UPDATE books SET mrp = 450 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-B' AND part = 'Unit-1';
UPDATE books SET mrp = 580 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-B' AND part = 'Unit-2 & Unit-3';
UPDATE books SET mrp = 450 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-B' AND part = 'Unit-4';
UPDATE books SET mrp = 400 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-B' AND part = 'Unit-5';

UPDATE books SET mrp = 450 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 2 Part-A' AND part = 'Unit-1';
UPDATE books SET mrp = 400 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 2 Part-A' AND part = 'Unit-2 & Unit-3';
UPDATE books SET mrp = 550 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 2 Part-A' AND part = 'Unit-4 & Unit-5';

UPDATE books SET mrp = 600 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-A' AND part = 'Unit-1 & Unit-2';
UPDATE books SET mrp = 550 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-A' AND part = 'Unit-3 & Unit-4';
UPDATE books SET mrp = 470 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-A' AND part = 'Unit-5 & Unit-2';

UPDATE books SET mrp = 480 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-1';
UPDATE books SET mrp = 480 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-2';
UPDATE books SET mrp = 450 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-3 & Unit-4';
UPDATE books SET mrp = 370 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-5';

UPDATE books SET mrp = 600 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-A' AND part = 'Unit-1';
UPDATE books SET mrp = 400 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-A' AND part = 'Unit-2';
UPDATE books SET mrp = 540 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-A' AND part = 'Unit-3 & Unit-4';

UPDATE books SET mrp = 500 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-B' AND part = 'Unit-1 & Unit-2';
UPDATE books SET mrp = 540 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-B' AND part = 'Unit-3 & Unit-4';
UPDATE books SET mrp = 250 WHERE medium = 'hindi' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-B' AND part = 'Unit-5';

-- ─────────────────────────────────────────
-- ENGLISH MEDIUM  (16 books from price list)
-- 8 English books not in the image are left untouched
-- ─────────────────────────────────────────

UPDATE books SET mrp = 540 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-1';
UPDATE books SET mrp = 520 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-2 & Unit-5';
UPDATE books SET mrp = 620 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-3';
UPDATE books SET mrp = 550 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-A' AND part = 'Unit-4';

UPDATE books SET mrp = 450 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-B' AND part = 'Unit-1';
UPDATE books SET mrp = 600 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 1 Part-B' AND part = 'Unit-2 & Unit-3';

UPDATE books SET mrp = 640 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 2 Part-A' AND part = 'Unit-2 & Unit-3';

UPDATE books SET mrp = 650 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-A' AND part = 'Unit-1 & Unit-2';
UPDATE books SET mrp = 600 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-A' AND part = 'Unit-3 & Unit-4';
UPDATE books SET mrp = 550 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-A' AND part = 'Unit-5 & Unit-2';

UPDATE books SET mrp = 600 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-1';
UPDATE books SET mrp = 500 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-2';
UPDATE books SET mrp = 600 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-3 & Unit-4';
UPDATE books SET mrp = 520 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 3 Part-B' AND part = 'Unit-5';

UPDATE books SET mrp = 620 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-B' AND part = 'Unit-1 & Unit-2';
UPDATE books SET mrp = 600 WHERE medium = 'english' AND exam_level = 'Mains' AND unit = 'Paper 4 Part-B' AND part = 'Unit-3 & Unit-4';

-- ─────────────────────────────────────────
-- VERIFY: run this SELECT after to confirm all rows updated correctly
-- ─────────────────────────────────────────

SELECT medium, unit, part, title, mrp
FROM books
WHERE exam_level = 'Mains'
ORDER BY medium, unit, part;
