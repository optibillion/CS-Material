-- ============================================================
-- Diagnostic: which books have an exam_level that isn't exactly
-- 'Mains' or 'Prelims'? These are the ones missing from both
-- mains_books_distribution_report.sql and
-- prelims_books_distribution_report.sql, but still counted in
-- the dashboard's "Total Books Distributed" card (which sums
-- across ALL books with no exam_level filter).
-- ============================================================

-- 1. Every distinct exam_level value currently in use, with a
--    flag for anything that isn't a clean 'Mains'/'Prelims'.
select
  exam_level,
  length(exam_level) as char_length,   -- catches trailing/leading spaces
  count(*) as book_count
from books
where exam_level is null
   or exam_level not in ('Mains', 'Prelims')
group by exam_level
order by exam_level;

-- 2. The actual books that fall outside 'Mains'/'Prelims', with
--    their issued/sold/allotted quantities, so you can see
--    exactly what's contributing to the gap.
with odd_books as (
  select id, title, category, medium, exam_level, unit, part
  from books
  where exam_level is null
     or exam_level not in ('Mains', 'Prelims')
)
select
  ob.exam_level,
  ob.title,
  ob.category,
  ob.medium,
  coalesce((
    select count(*) from issuances i
    where i.book_id = ob.id and i.is_reversed = false and i.is_previous_issuance = false
  ), 0) as issued_to_students,
  coalesce((
    select sum(qty) from sales s
    where s.book_id = ob.id and s.is_returned = false
  ), 0) as sold_to_students,
  coalesce((
    select sum(qty) from allotments a
    where a.book_id = ob.id
  ), 0) as given_to_distributors
from odd_books ob
order by ob.exam_level, ob.title;
