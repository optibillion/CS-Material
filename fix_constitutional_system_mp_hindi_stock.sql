-- ============================================================
-- Step 1: CONFIRM the mismatch for "Constitutional System of
-- India & MP" (Hindi) before touching anything. Same logic as
-- full_stock_reconciliation.sql, scoped to this one book.
-- ============================================================

with target as (
  select id from books
  where title ilike '%Constitutional System%India%MP%'
    and medium = 'hindi'
),
sold as (
  select book_id, coalesce(sum(qty), 0) as net_sold
  from sales where book_id in (select id from target) and is_returned = false
  group by book_id
),
issued as (
  select book_id, count(*) as net_issued
  from issuances
  where book_id in (select id from target) and is_previous_issuance = false and is_reversed = false
  group by book_id
),
allotted as (
  select book_id, coalesce(sum(qty), 0) as net_allotted
  from allotments where book_id in (select id from target)
  group by book_id
),
internal_issued as (
  select book_id, coalesce(sum(qty), 0) as net_internal_issued
  from internal_issuances
  where book_id in (select id from target) and stock_deducted = true
  group by book_id
),
actual as (
  select book_id, coalesce(sum(available_qty), 0) as actual_available, coalesce(sum(total_qty), 0) as total_qty
  from stock where book_id in (select id from target)
  group by book_id
)
select
  b.title,
  ac.total_qty,
  coalesce(so.net_sold, 0) as sold,
  coalesce(i.net_issued, 0) as issued,
  coalesce(al.net_allotted, 0) as allotted,
  coalesce(ii.net_internal_issued, 0) as internal_issued,
  (ac.total_qty - coalesce(so.net_sold,0) - coalesce(i.net_issued,0) - coalesce(al.net_allotted,0) - coalesce(ii.net_internal_issued,0)) as expected_available,
  ac.actual_available,
  ac.actual_available - (ac.total_qty - coalesce(so.net_sold,0) - coalesce(i.net_issued,0) - coalesce(al.net_allotted,0) - coalesce(ii.net_internal_issued,0)) as mismatch
from books b
join actual ac on ac.book_id = b.id
left join sold so on so.book_id = b.id
left join issued i on i.book_id = b.id
left join allotted al on al.book_id = b.id
left join internal_issued ii on ii.book_id = b.id;

-- ============================================================
-- Step 2: once you've confirmed `mismatch` above is the 125 you
-- expected (and not something stranger), run this to snap
-- stock.available_qty back to expected_available for this book.
-- Uncomment and run separately — not auto-run with the select above.
-- ============================================================

-- with target as (
--   select id from books
--   where title ilike '%Constitutional System%India%MP%'
--     and medium = 'hindi'
-- ),
-- sold as (
--   select book_id, coalesce(sum(qty), 0) as net_sold
--   from sales where book_id in (select id from target) and is_returned = false
--   group by book_id
-- ),
-- issued as (
--   select book_id, count(*) as net_issued
--   from issuances
--   where book_id in (select id from target) and is_previous_issuance = false and is_reversed = false
--   group by book_id
-- ),
-- allotted as (
--   select book_id, coalesce(sum(qty), 0) as net_allotted
--   from allotments where book_id in (select id from target)
--   group by book_id
-- ),
-- internal_issued as (
--   select book_id, coalesce(sum(qty), 0) as net_internal_issued
--   from internal_issuances
--   where book_id in (select id from target) and stock_deducted = true
--   group by book_id
-- )
-- update stock s
-- set available_qty = s.total_qty - coalesce(so.net_sold,0) - coalesce(i.net_issued,0) - coalesce(al.net_allotted,0) - coalesce(ii.net_internal_issued,0)
-- from target t
-- left join sold so on so.book_id = t.id
-- left join issued i on i.book_id = t.id
-- left join allotted al on al.book_id = t.id
-- left join internal_issued ii on ii.book_id = t.id
-- where s.book_id = t.id;
