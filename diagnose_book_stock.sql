-- ============================================================
-- Diagnostic: why isn't "संकल्पना एवं विचार - Cultural Heritage &
-- Thought" (Prelims > 1 > B) deducting stock correctly?
--
-- Single UNION ALL query — Supabase's SQL editor only shows the
-- last statement's result when you run several separated by
-- semicolons, so everything is combined into one result set here.
-- Paste the full output back and I'll write the exact fix.
--
-- Change the title filter below if you want to check a different
-- book instead.
-- ============================================================

with target as (
  select id, title from books where title ilike '%Cultural Heritage%'
)

select 'BOOK' as row_type, t.title as detail, null as col2, null as col3, null as col4
from target t

union all

select 'STOCK ROW',
  coalesce(s.location, '(no location)'),
  'total_qty=' || s.total_qty,
  'available_qty=' || s.available_qty,
  'low_stock_threshold=' || s.low_stock_threshold
from stock s join target t on t.id = s.book_id

union all

select 'MOVEMENT TOTALS',
  'stock_in=' || coalesce((select sum(qty) from stock_additions sa where sa.book_id = t.id), 0),
  'sold=' || coalesce((select sum(qty) from sales sl where sl.book_id = t.id and sl.is_returned = false), 0),
  'issued=' || coalesce((select count(*) from issuances i where i.book_id = t.id and i.is_reversed = false and i.is_previous_issuance = false), 0),
  'allotted=' || coalesce((select sum(qty) from allotments al where al.book_id = t.id), 0)
from target t

union all

select 'EXPECTED VS ACTUAL',
  'expected_available=' || (
    coalesce((select sum(qty) from stock_additions sa where sa.book_id = t.id), 0)
    - coalesce((select sum(qty) from sales sl where sl.book_id = t.id and sl.is_returned = false), 0)
    - coalesce((select count(*) from issuances i where i.book_id = t.id and i.is_reversed = false and i.is_previous_issuance = false), 0)
    - coalesce((select sum(qty) from allotments al where al.book_id = t.id), 0)
  ),
  'actual_available_sum=' || coalesce((select sum(available_qty) from stock s where s.book_id = t.id), 0),
  'stock_row_count=' || coalesce((select count(*) from stock s where s.book_id = t.id), 0),
  null
from target t;
