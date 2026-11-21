-- ============================================================
-- Mismatched books only — every book's full in/out breakdown,
-- what the ledger says available_qty SHOULD be (expected) vs what
-- the stock table ACTUALLY shows (actual), filtered down to ONLY
-- the ones that don't match. Clean books (mismatch = 0) are left
-- out entirely so this is a hunt list, not a full audit.
--
-- Same source-of-truth logic as full_stock_reconciliation.sql:
--   stock_in_total      = total_qty (trusted directly off `stock`,
--                          not reconstructed from stock_additions,
--                          which undercounts anything added before
--                          that table existed)
--   sold_net            = sales still not returned
--   issued_net          = active student issuances (excludes
--                          reversed ones and "previous issuance"
--                          historical records, neither of which
--                          ever deducted stock)
--   distributor_net     = net currently with distributors
--                          (allotment qty is already signed — a
--                          return/reversal row carries negative qty)
--   internal_issued_net = internal issuances with "deduct from
--                          stock" checked only
--   manual_correction_net = net of every "Correct" button use —
--                          already folded into "expected" below,
--                          so a corrected book shows mismatch = 0
--                          going forward even though the raw
--                          numbers don't look round
--   total_out           = everything above that actually deducts,
--                          summed — this is "what should have come
--                          off the shelf"
--   expected_available  = stock_in_total - total_out + corrections
--   actual_available_now = what the stock table literally shows
--   mismatch             = actual - expected. 0 = clean (excluded
--                          here). Positive = more stock on hand
--                          than the ledger explains. Negative =
--                          less stock on hand than the ledger says
--                          there should be — the dangerous direction.
-- ============================================================

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
    count(*) filter (where is_previous_issuance = true)                          as previous_issuances
  from issuances
  group by book_id
),
allotted as (
  select book_id,
    coalesce(sum(qty) filter (where qty > 0), 0)  as allotted_gross_given,
    coalesce(sum(-qty) filter (where qty < 0), 0) as allotted_gross_returned,
    coalesce(sum(qty), 0)                         as allotted_net
  from allotments
  group by book_id
),
internal_issued as (
  select book_id,
    coalesce(sum(qty) filter (where stock_deducted = true), 0)  as internal_net,
    coalesce(sum(qty) filter (where stock_deducted = false), 0) as internal_info_only
  from internal_issuances
  group by book_id
),
corrected as (
  select book_id, coalesce(sum(delta), 0) as manual_correction_net
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

  ac.total_qty                                    as total_in,

  coalesce(so.sold_net, 0)                         as sale,
  coalesce(i.issued_net, 0)                        as issued,
  coalesce(al.allotted_net, 0)                     as allotted,
  coalesce(ii.internal_net, 0)                     as internal,

  (coalesce(so.sold_net, 0) + coalesce(i.issued_net, 0)
    + coalesce(al.allotted_net, 0) + coalesce(ii.internal_net, 0))
                                                    as total_out,

  coalesce(co.manual_correction_net, 0)            as manual_correction,

  (ac.total_qty
    - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
    - coalesce(al.allotted_net, 0) - coalesce(ii.internal_net, 0)
    + coalesce(co.manual_correction_net, 0))       as expected_available,

  ac.actual_available                              as actual_available,

  (ac.actual_available - (ac.total_qty
    - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
    - coalesce(al.allotted_net, 0) - coalesce(ii.internal_net, 0)
    + coalesce(co.manual_correction_net, 0)))      as mismatch,

  -- context columns — don't affect the math, but explain activity
  -- that's easy to mistake for "missing" if you don't know it's
  -- deliberately excluded
  coalesce(i.previous_issuances, 0)                as prev_issuances_not_deducted,
  coalesce(so.sold_returned, 0)                    as sales_returned,
  coalesce(i.issued_reversed, 0)                   as issuances_reversed,
  coalesce(al.allotted_gross_given, 0)             as allotted_gross_given,
  coalesce(al.allotted_gross_returned, 0)          as allotted_gross_returned,
  coalesce(ii.internal_info_only, 0)               as internal_not_deducted,
  ac.stock_rows

from books b
inner join actual ac on ac.book_id = b.id
left join sold so on so.book_id = b.id
left join issued i on i.book_id = b.id
left join allotted al on al.book_id = b.id
left join internal_issued ii on ii.book_id = b.id
left join corrected co on co.book_id = b.id

where (ac.actual_available - (ac.total_qty
    - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
    - coalesce(al.allotted_net, 0) - coalesce(ii.internal_net, 0)
    + coalesce(co.manual_correction_net, 0))) <> 0

order by abs(ac.actual_available - (ac.total_qty
    - coalesce(so.sold_net, 0) - coalesce(i.issued_net, 0)
    - coalesce(al.allotted_net, 0) - coalesce(ii.internal_net, 0)
    + coalesce(co.manual_correction_net, 0))) desc,
  b.exam_level, b.unit, b.part, b.medium;
