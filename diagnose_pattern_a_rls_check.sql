-- ============================================================
-- Pattern A, step 3: all 8 books show 100% failure of every
-- adjust_stock() deduction for 5+ months straight (confirmed live,
-- still happening as of yesterday) while total_qty never left 0 and
-- stock_rows stayed at exactly 1 the whole time. A persistent,
-- per-book, total failure rate — not occasional/random — is the
-- signature of Row-Level Security quietly filtering the row out of
-- the `for update` select inside adjust_stock(), rather than a
-- flaky network/RPC issue. This checks that directly.
-- ============================================================

-- 1) What RLS policies actually exist on `stock` — in particular,
-- does SELECT/UPDATE have a USING clause that could exclude some
-- rows for some roles (e.g. scoped by location, created_by, etc)?
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where tablename = 'stock';

-- 2) Is RLS even enabled, and is there a FORCE on it (matters if
-- the function owner is also the table owner, which normally
-- bypasses RLS unless FORCE ROW LEVEL SECURITY is set)?
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'stock';

-- 3) The raw stock row for each of the 8 problem books — in
-- particular `location`, which is the most likely thing an RLS
-- policy would scope by.
with targets (title, exam_level, unit, part, medium) as (
  values
    ('सामान्य हिन्दी एवं व्याकरण', 'Mains', 'Paper 5', '', 'both'),
    ('हिन्दी निबंध एवं प्रारूप लेखन', 'Mains', 'Paper 6', '', 'both'),
    ('समाजशास्त्र', 'Mains', 'Paper 2 Part-B', '1 & 2', 'hindi'),
    ('समाजशास्त्र', 'Mains', 'Paper 2 Part-B', '3,4&5', 'hindi'),
    ('मध्यप्रदेश का भूगोल - Geography of MP', 'Prelims', '4', '', 'english'),
    ('मध्यप्रदेश की जनजातियाँ - Tribes of Madhya', 'Prelims', '10', '', 'english'),
    ('महासंकलन', 'Prelims', '', '', 'hindi'),
    ('Tribes Chart', 'Prelims', '10', '', 'hindi')
),
matched as (
  select b.id as book_id, b.title
  from books b
  join targets t
    on trim(b.title) = trim(t.title)
    and b.exam_level = t.exam_level
    and coalesce(trim(b.unit), '') = coalesce(trim(t.unit), '')
    and coalesce(trim(b.part), '') = coalesce(trim(t.part), '')
    and b.medium = t.medium
)
select m.title, s.id as stock_row_id, s.book_id, s.location, s.total_qty, s.available_qty, s.low_stock_threshold
from stock s
join matched m on m.book_id = s.book_id;

-- 4) For comparison: the same details for a HEALTHY book (one with
-- a clean reconciliation, e.g. a stock_in_total in the thousands
-- and mismatch near 0) — swap in any title from the earlier report
-- that showed mismatch = 0. Compare its `location` against query 3.
select s.id as stock_row_id, s.book_id, b.title, s.location, s.total_qty, s.available_qty
from stock s
join books b on b.id = s.book_id
where b.title ilike '%History of India%Ancient%'
   or b.title ilike '%MP GEETA%'
limit 5;
