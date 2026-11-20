-- ============================================================
-- Mains books: how many were issued free to students, sold to
-- students, and given to distributors — per book, plus a grand
-- total row. Only counts exam_level = 'Mains'.
--
-- Notes:
--   - issuances has no qty column (one row = one book issued),
--     so student "issued" count is a row count, not sum(qty).
--   - issued_qty only counts is_previous_issuance = false rows —
--     those are the ones that actually deducted stock
--     (adjustStock is only called for regularToIssue in
--     Issue.jsx). Previous-issuance rows are just a record that
--     the student already had the book; no stock was touched.
--   - sales.qty excludes returned sales (is_returned = false).
--   - allotments.qty is the distributor quantity.
-- ============================================================

with mains_books as (
  select id, title, category, medium, unit, part
  from books
  where exam_level = 'Mains'
),
issued as (
  select book_id, count(*) as issued_qty
  from issuances
  where is_reversed = false
    and is_previous_issuance = false
    and book_id in (select id from mains_books)
  group by book_id
),
sold as (
  select book_id, coalesce(sum(qty), 0) as sold_qty
  from sales
  where is_returned = false
    and book_id in (select id from mains_books)
  group by book_id
),
allotted as (
  select book_id, coalesce(sum(qty), 0) as distributor_qty
  from allotments
  where book_id in (select id from mains_books)
  group by book_id
)

-- Per-book breakdown, with a final TOTAL row (sort_order pushes
-- it below every real book without disturbing the alphabetical
-- per-book ordering above it)
select
  category,
  title,
  medium,
  unit,
  part,
  issued_to_students,
  sold_to_students,
  given_to_distributors,
  total_books
from (
  select
    0 as sort_order,
    mb.category,
    mb.title,
    mb.medium,
    mb.unit,
    mb.part,
    coalesce(i.issued_qty, 0)      as issued_to_students,
    coalesce(s.sold_qty, 0)        as sold_to_students,
    coalesce(a.distributor_qty, 0) as given_to_distributors,
    coalesce(i.issued_qty, 0) + coalesce(s.sold_qty, 0) + coalesce(a.distributor_qty, 0) as total_books
  from mains_books mb
  left join issued   i on i.book_id = mb.id
  left join sold     s on s.book_id = mb.id
  left join allotted a on a.book_id = mb.id

  union all

  select
    1 as sort_order,
    'TOTAL' as category,
    null as title,
    null as medium,
    null as unit,
    null as part,
    coalesce(sum(i.issued_qty), 0)      as issued_to_students,
    coalesce(sum(s.sold_qty), 0)        as sold_to_students,
    coalesce(sum(a.distributor_qty), 0) as given_to_distributors,
    coalesce(sum(i.issued_qty), 0) + coalesce(sum(s.sold_qty), 0) + coalesce(sum(a.distributor_qty), 0) as total_books
  from mains_books mb
  left join issued   i on i.book_id = mb.id
  left join sold     s on s.book_id = mb.id
  left join allotted a on a.book_id = mb.id
) report
order by sort_order, category, title;
