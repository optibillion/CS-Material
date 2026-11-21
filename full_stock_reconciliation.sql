-- ============================================================
-- Full stock reconciliation — every tracked book, every single
-- source of IN and OUT broken into its own column, what the
-- numbers SAY available_qty should be vs what it actually is.
--
-- v4: v3 already got "expected vs actual" right (see its history
-- below). This version exists because collapsing everything into
-- a few net columns made it impossible to tell, at a glance,
-- whether a mismatch came from distributors, students, internal
-- issuance, or something invisible like unreturned sales — and it
-- didn't surface the "doesn't touch stock" activity at all, which
-- is exactly the kind of thing that *feels* unaccounted even
-- though it's accounted for correctly (by being excluded). So:
--
--   1. Every outflow is split into its NET (what actually hit
--      stock) and its GROSS counterpart that was reversed/returned,
--      so you can see both "what's out right now" and "how much
--      churn happened" per book.
--   2. Activity that never touches stock (previous-issuance
--      records, internal issuances with "deduct from stock"
--      unchecked) gets its own column instead of being silently
--      dropped, so it's visibly accounted for rather than absent.
--   3. A GRAND TOTAL row across every book is appended, so the
--      whole-catalog picture ("how many books are we short/over
--      in total") doesn't require summing the output yourself.
--   4. Website Orders (website_orders table) is deliberately left
--      OUT of this math — see the note above query 2 for why — and
--      checked separately so it doesn't get silently conflated with
--      real stock-moving sales.
--
-- --- v3 history (same base logic, kept for context) ---
-- v3 fix: v1/v2 tried to reconstruct "total ever received" by
-- summing stock_additions — but that table only logs additions made
-- through the app's "Add Stock" button. Any book whose stock was set
-- up before that (the original bulk seed) has most/all of its real
-- total missing from stock_additions. Fix: trust stock.total_qty
-- itself as "total ever received" (a running counter the app keeps
-- correct via atomic increments) and only check whether
-- available_qty is internally consistent with the full current
-- deduction picture.
--
-- expected_available = total_qty
--                       - net sold (sales still not returned)
--                       - net issued (regular issuances only —
--                         excludes previous-issuance records, which
--                         never deduct, and reversed ones, which
--                         were credited back)
--                       - net allotted to distributors (allotment
--                         rows are already signed — a return/reversal
--                         carries a negative qty, so a plain sum
--                         nets correctly)
--                       - net internal issued (Staff/Campus tab,
--                         only rows where stock_deducted = true)
--                       + net manual corrections (stock_corrections —
--                         every use of the "Correct" button; requires
--                         add_stock_corrections.sql to have been run)
--
-- mismatch = actual_available - expected_available. Zero = clean.
-- Positive = actual is higher than the deduction picture implies
-- (something that should have been deducted wasn't, in full).
-- Negative = actual is lower than it should be (something was
-- deducted that shouldn't have been, or credited short).
-- ============================================================

-- ------------------------------------------------------------
-- 1) THE RECONCILIATION — one row per book, every column labeled.
-- Wrapped in an outer SELECT because Postgres won't let ORDER BY
-- use expressions (CASE, abs()) directly after a UNION ALL — only
-- plain output column names. Sorting outside the union sidesteps that.
-- ------------------------------------------------------------
select * from (
with sold as (
  select book_id,
    coalesce(sum(qty) filter (where is_returned = false), 0) as sold_net,
    coalesce(sum(qty) filter (where is_returned = true), 0)  as sold_returned
  from sales
  group by book_id
),
issued as (
  select book_id,
    count(*) filter (where is_previous_issuance = false and is_reversed = false) as issued_net,
    count(*) filter (where is_previous_issuance = false and is_reversed = true)  as issued_reversed,
    count(*) filter (where is_previous_issuance = true)                          as previous_issuances_no_deduction
  from issuances
  group by book_id
),
allotted as (
  select book_id,
    coalesce(sum(qty) filter (where qty > 0), 0)  as allotted_gross,
    coalesce(sum(-qty) filter (where qty < 0), 0) as allotted_returned,
    coalesce(sum(qty), 0)                         as allotted_net
  from allotments
  group by book_id
),
internal_issued as (
  select book_id,
    coalesce(sum(qty) filter (where stock_deducted = true), 0)  as internal_issued_net,
    coalesce(sum(qty) filter (where stock_deducted = false), 0) as internal_issued_no_deduction
  from internal_issuances
  group by book_id
),
corrected as (
  select book_id, coalesce(sum(delta), 0) as net_corrected
  from stock_corrections
  group by book_id
),
actual as (
  select book_id,
    coalesce(sum(available_qty), 0) as actual_available,
    coalesce(sum(total_qty), 0)     as total_qty,
    count(*)                        as stock_rows
  from stock
  group by book_id
)
select
  b.title,
  b.exam_level,
  b.unit,
  b.part,
  b.medium,

  ac.total_qty                                   as stock_in_total,

  coalesce(so.sold_net, 0)                        as sold_net,
  coalesce(so.sold_returned, 0)                   as sold_returned_info_only,

  coalesce(i.issued_net, 0)                       as issued_net,
  coalesce(i.issued_reversed, 0)                  as issued_reversed_info_only,
  coalesce(i.previous_issuances_no_deduction, 0)  as previous_issuances_info_only,

  coalesce(al.allotted_net, 0)                    as distributor_net,
  coalesce(al.allotted_gross, 0)                  as distributor_gross_given,
  coalesce(al.allotted_returned, 0)               as distributor_gross_returned,

  coalesce(ii.internal_issued_net, 0)             as internal_issued_net,
  coalesce(ii.internal_issued_no_deduction, 0)    as internal_issued_info_only,

  coalesce(co.net_corrected, 0)                   as manual_correction_net,

  (coalesce(so.sold_net, 0) + coalesce(i.issued_net, 0)
    + coalesce(al.allotted_net, 0) + coalesce(ii.internal_issued_net, 0))
                                                   as total_net_out,

  (ac.total_qty
    - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
    - coalesce(al.allotted_net, 0) - coalesce(ii.internal_issued_net, 0)
    + coalesce(co.net_corrected, 0))              as expected_available,

  ac.actual_available                             as actual_available_now,
  ac.stock_rows,

  (ac.actual_available - (ac.total_qty
    - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
    - coalesce(al.allotted_net, 0) - coalesce(ii.internal_issued_net, 0)
    + coalesce(co.net_corrected, 0)))             as mismatch

from books b
inner join actual ac on ac.book_id = b.id
left join sold so on so.book_id = b.id
left join issued i on i.book_id = b.id
left join allotted al on al.book_id = b.id
left join internal_issued ii on ii.book_id = b.id
left join corrected co on co.book_id = b.id

union all

-- ------------------------------------------------------------
-- GRAND TOTAL across every tracked book — same columns, summed,
-- so the whole-catalog shortfall/surplus doesn't need manual adding.
-- ------------------------------------------------------------
select
  '— GRAND TOTAL (ALL BOOKS) —', null, null, null, null,
  sum(ac.total_qty),
  sum(coalesce(so.sold_net, 0)),
  sum(coalesce(so.sold_returned, 0)),
  sum(coalesce(i.issued_net, 0)),
  sum(coalesce(i.issued_reversed, 0)),
  sum(coalesce(i.previous_issuances_no_deduction, 0)),
  sum(coalesce(al.allotted_net, 0)),
  sum(coalesce(al.allotted_gross, 0)),
  sum(coalesce(al.allotted_returned, 0)),
  sum(coalesce(ii.internal_issued_net, 0)),
  sum(coalesce(ii.internal_issued_no_deduction, 0)),
  sum(coalesce(co.net_corrected, 0)),
  sum(coalesce(so.sold_net, 0) + coalesce(i.issued_net, 0)
      + coalesce(al.allotted_net, 0) + coalesce(ii.internal_issued_net, 0)),
  sum(ac.total_qty
      - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
      - coalesce(al.allotted_net, 0) - coalesce(ii.internal_issued_net, 0)
      + coalesce(co.net_corrected, 0)),
  sum(ac.actual_available),
  sum(ac.stock_rows),
  sum(ac.actual_available - (ac.total_qty
      - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
      - coalesce(al.allotted_net, 0) - coalesce(ii.internal_issued_net, 0)
      + coalesce(co.net_corrected, 0)))
from books b
inner join actual ac on ac.book_id = b.id
left join sold so on so.book_id = b.id
left join issued i on i.book_id = b.id
left join allotted al on al.book_id = b.id
left join internal_issued ii on ii.book_id = b.id
left join corrected co on co.book_id = b.id
) reconciliation

order by
  case when title = '— GRAND TOTAL (ALL BOOKS) —' then 1 else 0 end,
  abs(mismatch) desc nulls last,
  exam_level, unit, part, medium;


-- ------------------------------------------------------------
-- 2) WEBSITE ORDERS — kept OUT of the math above on purpose.
--
-- website_orders is an order/fulfillment tracker (see
-- WebsiteOrders.jsx) — nothing in the app calls adjust_stock() when
-- an order is created or fulfilled. It does NOT deduct available_qty
-- the way the `sales` table does, so folding it into query 1's
-- "sold" numbers would double-count against stock that was never
-- actually touched. This section checks it separately, matching each
-- order's raw `books_ordered` text against catalog titles so you can
-- see order volume per book without it polluting the reconciliation.
-- If some of these SHOULD have deducted stock (i.e. fulfillment was
-- meant to come out of the same pool as `sales`), that's a separate,
-- deliberate decision to wire up — not something this query assumes.
-- ------------------------------------------------------------
select
  b.title,
  b.exam_level,
  b.medium,
  count(*) as website_order_lines_matched,
  count(*) filter (where wo.delivered = true)                          as delivered,
  count(*) filter (where wo.shipped = true and wo.delivered is not true) as shipped_not_delivered,
  count(*) filter (where wo.shipped is not true)                        as not_yet_shipped
from website_orders wo
join books b on wo.books_ordered ilike b.title || '%'
group by b.title, b.exam_level, b.medium
order by website_order_lines_matched desc;
