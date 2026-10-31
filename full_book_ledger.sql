-- ============================================================
-- Full in/out ledger for both "Cultural Heritage & Thought" book
-- records (Hindi: fe7f2ef9-5395-40a0-aa57-6324a5dbb14c, English:
-- dcf38441-a179-4d94-adaa-3f8f8d3b94b3), one combined timeline
-- per book with a running stock balance, so you can see exactly
-- where the numbers stop matching reality.
--
-- signed_qty is how each event changed available stock: positive
-- = added back, negative = taken out. running_balance is the
-- cumulative total up to and including that row, per book.
--
-- Change the two UUIDs below to check a different book.
-- ============================================================

with target as (
  select id, medium from books
  where id in ('fe7f2ef9-5395-40a0-aa57-6324a5dbb14c', 'dcf38441-a179-4d94-adaa-3f8f8d3b94b3')
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

  -- allotments: qty is already negative on a reversal/return row, so a
  -- plain -qty correctly nets both directions in one line
  select book_id, allotted_at, case when qty < 0 then 'ALLOTMENT RETURN' else 'ALLOTMENT' end, -qty,
    institution_name || coalesce(' · ' || contact_person, '') || ' (' || type || ')'
  from allotments
  where book_id in (select id from target)
)
select
  t.medium,
  m.moved_at,
  m.type,
  m.signed_qty,
  m.detail,
  sum(m.signed_qty) over (
    partition by m.book_id
    order by m.moved_at, m.type
    rows between unbounded preceding and current row
  ) as running_balance
from movements m
join target t on t.id = m.book_id
where m.moved_at is not null
order by t.medium, m.moved_at;
