-- ============================================================
-- Full in/out ledger for "Constitutional System of India & MP"
-- (Hindi medium) — every stock movement in sequence, with a
-- running closing balance after each row.
--
-- signed_qty is how each event changed available stock: positive
-- = added back, negative = taken out. running_balance is the
-- cumulative total up to and including that row.
--
-- Looks the book up by title + medium, so no UUID needed. If the
-- title in your `books` table is slightly different, adjust the
-- ilike pattern below.
--
-- total_stock_in_all_time is a constant column (same value every
-- row) = sum of every STOCK IN event ever logged for this book,
-- so you can eyeball "total in minus every out" against the
-- running_balance column directly.
-- ============================================================

with target as (
  select id, title, medium from books
  where title ilike '%Constitutional System%India%MP%'
    and medium = 'hindi'
),
movements as (
  -- stock received
  select book_id, added_at as moved_at, 'STOCK IN' as type, qty as signed_qty,
    coalesce(note, '') as detail
  from stock_additions
  where book_id in (select id from target)

  union all

  -- every sale deducts at the moment it's made, returned or not
  select book_id, sold_at, 'SALE', -qty,
    buyer_name || coalesce(' · ' || buyer_phone, '')
  from sales
  where book_id in (select id from target)

  union all

  -- a later return credits it back separately, dated at the return
  select book_id, returned_at, 'SALE RETURNED', qty,
    buyer_name || coalesce(' · ' || buyer_phone, '')
  from sales
  where book_id in (select id from target) and is_returned = true

  union all

  -- every regular student issuance deducts 1 at issue time
  select i.book_id, i.issued_at, 'ISSUANCE', -1,
    coalesce(s.name, '—') || coalesce(' (' || s.student_id || ')', '')
  from issuances i
  left join students s on s.id = i.student_id
  where i.book_id in (select id from target) and i.is_previous_issuance = false

  union all

  -- a later reversal credits it back, dated at the reversal
  select i.book_id, i.reversed_at, 'ISSUANCE REVERSED', 1,
    coalesce(s.name, '—') || coalesce(' — ' || i.reversal_reason, '')
  from issuances i
  left join students s on s.id = i.student_id
  where i.book_id in (select id from target) and i.is_reversed = true and i.is_previous_issuance = false

  union all

  -- previous (pre-system) issuances never deducted stock — shown for
  -- completeness but with 0 effect on the running balance
  select i.book_id, i.issued_at, 'PREV ISSUANCE (no stock effect)', 0,
    coalesce(s.name, '—') || coalesce(' (' || s.student_id || ')', '')
  from issuances i
  left join students s on s.id = i.student_id
  where i.book_id in (select id from target) and i.is_previous_issuance = true

  union all

  -- allotments: qty is already negative on a reversal/return row, so a
  -- plain -qty correctly nets both directions in one line
  select book_id, allotted_at, case when qty < 0 then 'ALLOTMENT RETURN' else 'ALLOTMENT' end, -qty,
    institution_name || coalesce(' · ' || contact_person, '') || ' (' || type || ')'
  from allotments
  where book_id in (select id from target)

  union all

  -- staff/campus internal issuances also deduct from this same stock
  -- when "deduct from stock" was checked; "undo" deletes the row
  -- outright rather than flagging it, so what's present is net-correct
  select book_id, issued_at, 'INTERNAL ISSUANCE', -qty,
    recipient_type || ' — ' || recipient_name
  from internal_issuances
  where book_id in (select id from target) and stock_deducted = true
),
total_in as (
  select book_id, coalesce(sum(qty), 0) as total_stock_in_all_time
  from stock_additions
  where book_id in (select id from target)
  group by book_id
)
select
  t.title,
  t.medium,
  m.moved_at,
  m.type,
  m.signed_qty,
  m.detail,
  coalesce(ti.total_stock_in_all_time, 0) as total_stock_in_all_time,
  sum(m.signed_qty) over (
    partition by m.book_id
    order by m.moved_at, m.type
    rows between unbounded preceding and current row
  ) as running_balance
from movements m
join target t on t.id = m.book_id
left join total_in ti on ti.book_id = m.book_id
where m.moved_at is not null
order by m.moved_at;
