-- ============================================================
-- Step 1: see the damage across EVERY book before touching
-- anything. Same query as full_stock_reconciliation.sql — ins,
-- outs, expected vs actual, and the gap between them, worst
-- offenders first.
--
-- expected_available now folds in stock_corrections (every use of
-- the "Correct" button logs its delta there) — so a book that was
-- deliberately recounted no longer shows up here as a permanent
-- "mismatch" just because the raw transaction math disagrees with
-- a legitimate manual adjustment. Requires add_stock_corrections.sql
-- to have been run; corrections made before that table existed
-- (i.e. everything prior to today) won't be captured and will still
-- show as a mismatch here — check those against the admin audit log
-- (action = 'STOCK_CORRECTED') by hand before batch-fixing them.
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
-- side-ledger of in-app "Add Stock" actions only — for books whose
-- stock predates that button (the original bulk seed), this will be
-- lower than total_qty. Shown for sanity-checking, not used in the
-- expected_available math (which trusts total_qty, per the v3 note
-- in full_stock_reconciliation.sql).
stock_in_log as (
  select book_id, coalesce(sum(qty), 0) as stock_additions_total
  from stock_additions
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
  ac.total_qty as total_in,
  coalesce(sl.stock_additions_total, 0) as stock_additions_logged,
  coalesce(so.net_sold, 0) as sold,
  coalesce(i.net_issued, 0) as issued,
  coalesce(al.net_allotted, 0) as allotted,
  coalesce(ii.net_internal_issued, 0) as internal_issued,
  coalesce(co.net_corrected, 0) as corrected,
  (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0)) as expected_available,
  ac.actual_available,
  ac.actual_available - (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0)) as mismatch
from books b
inner join actual ac on ac.book_id = b.id
left join sold so on so.book_id = b.id
left join issued i on i.book_id = b.id
left join allotted al on al.book_id = b.id
left join internal_issued ii on ii.book_id = b.id
left join corrected co on co.book_id = b.id
left join stock_in_log sl on sl.book_id = b.id
where ac.actual_available - (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0)) <> 0
order by abs(ac.actual_available - (ac.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0) - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0) + coalesce(co.net_corrected, 0))) desc;

-- ============================================================
-- Step 2: batch-correct every mismatched book in one shot —
-- sets stock.available_qty = expected_available (now corrections-
-- aware, see above) for every row where they currently differ.
-- Only touches rows with a non-zero mismatch; everything already
-- correct — including books already matching a logged manual
-- correction — is left alone.
--
-- Review the Step 1 output first. Uncomment and run separately.
-- ============================================================

-- with sold as (
--   select book_id, coalesce(sum(qty), 0) as net_sold
--   from sales where is_returned = false
--   group by book_id
-- ),
-- issued as (
--   select book_id, count(*) as net_issued
--   from issuances
--   where is_previous_issuance = false and is_reversed = false
--   group by book_id
-- ),
-- allotted as (
--   select book_id, coalesce(sum(qty), 0) as net_allotted
--   from allotments
--   group by book_id
-- ),
-- internal_issued as (
--   select book_id, coalesce(sum(qty), 0) as net_internal_issued
--   from internal_issuances
--   where stock_deducted = true
--   group by book_id
-- ),
-- corrected as (
--   select book_id, coalesce(sum(delta), 0) as net_corrected
--   from stock_corrections
--   group by book_id
-- )
-- update stock s
-- set available_qty = s.total_qty
--   - coalesce(so.net_sold, 0)
--   - coalesce(i.net_issued, 0)
--   - coalesce(al.net_allotted, 0)
--   - coalesce(ii.net_internal_issued, 0)
--   + coalesce(co.net_corrected, 0)
-- from stock s2
-- left join sold so on so.book_id = s2.book_id
-- left join issued i on i.book_id = s2.book_id
-- left join allotted al on al.book_id = s2.book_id
-- left join internal_issued ii on ii.book_id = s2.book_id
-- left join corrected co on co.book_id = s2.book_id
-- where s.id = s2.id
--   and s.available_qty <> (
--     s2.total_qty - coalesce(so.net_sold, 0) - coalesce(i.net_issued, 0)
--     - coalesce(al.net_allotted, 0) - coalesce(ii.net_internal_issued, 0)
--     + coalesce(co.net_corrected, 0)
--   );
