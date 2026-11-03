-- ============================================================
-- Full stock reconciliation — every tracked book, what it SHOULD
-- have vs what's actually in the stock table right now.
--
-- v3 fix: v1 and v2 both tried to reconstruct "total ever received"
-- by summing stock_additions — but that table only logs additions
-- made through the app's "Add Stock" button. Any book whose stock
-- was set up before that (the original bulk seed when Inventory
-- tracking first launched) has most or all of its real total
-- missing from stock_additions, making stock_in look tiny (e.g. "1")
-- next to a total_qty of 500+. That's not a data problem — it's
-- this query asking the wrong table.
--
-- Fix: trust stock.total_qty itself as "total ever received" (it's
-- a running counter the app keeps correct via atomic increments,
-- not something to reconstruct from a side-ledger) and only check
-- whether available_qty is internally consistent with it given the
-- CURRENT full deduction picture.
--
-- expected_available = total_qty
--                       - net sold (sales still not returned)
--                       - net issued (regular issuances only —
--                         excludes previous-issuance records, which
--                         never deduct, and reversed ones, which
--                         were credited back)
--                       - net allotted (allotment rows are already
--                         signed — a return/reversal carries a
--                         negative qty, so a plain sum nets correctly)
--                       - net internal issued (Staff/Campus tab —
--                         a separate internal_issuances table that
--                         also deducts from this same stock when its
--                         "deduct from stock" option was checked;
--                         "undo" there deletes the row outright
--                         rather than flagging it, so summing what's
--                         currently present is already net-correct)
--                       + net manual corrections (stock_corrections —
--                         every use of the "Correct" button in
--                         Inventory now logs its delta here, so a
--                         deliberate recount-driven adjustment is
--                         folded into "expected" instead of showing
--                         up as a mismatch forever. Requires
--                         add_stock_corrections.sql to have been run;
--                         corrections made before that table existed
--                         still won't be captured)
--
-- mismatch = actual_available - expected_available. Zero = clean.
-- Positive = actual is higher than the current deduction picture
-- implies (something that should have been deducted wasn't, in
-- full). Negative = actual is lower than it should be (something
-- was deducted that shouldn't have been, or credited short).
-- ============================================================

with sold as (
  select book_id, coalesce(sum(qty), 0) as net_sold
  from sales
  where is_returned = false
  group by book_id
),
issued as (
  select book_id, count(*) as net_issued
  from issuances
  where is_previous_issuance = false and is_reversed = false
  group by book_id
),
allotted as (
  select book_id, coalesce(sum(qty), 0) as net_allotted
  from allotments
  group by book_id
),
internal_issued as (
  select book_id, coalesce(sum(qty), 0) as net_internal_issued
  from internal_issuances
  where stock_deducted = true
  group by book_id
),
corrected as (
  select book_id, coalesce(sum(delta), 0) as net_corrected
  from stock_corrections
  group by book_id
),
actual as (
  select book_id, coalesce(sum(available_qty), 0) as actual_available, coalesce(sum(total_qty), 0) as total_qty, count(*) as stock_rows
  from stock
  group by book_id
)
select
  b.title,
  b.exam_level,
  b.unit,
  b.part,
  b.medium,
  ac.total_qty,
  coalesce(so.net_sold, 0) as sold,
  coalesce(i.net_issued, 0) as issued,
  coalesce(al.net_allotted, 0) as allotted,
  coalesce(ii.net_internal_issued, 0) as internal_issued,
  coalesce(co.net_corrected, 0) as corrected,
  (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0)) as expected_available,
  ac.actual_available,
  ac.stock_rows,
  ac.actual_available - (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0)) as mismatch
from books b
inner join actual ac on ac.book_id = b.id
left join sold so on so.book_id = b.id
left join issued i on i.book_id = b.id
left join allotted al on al.book_id = b.id
left join internal_issued ii on ii.book_id = b.id
left join corrected co on co.book_id = b.id
order by abs(ac.actual_available - (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0))) desc,
         b.exam_level, b.unit, b.part, b.medium;
