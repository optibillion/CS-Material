-- ============================================================
-- Was there actually enough stock to cover a specific allotment
-- line at the moment it was recorded? Computes available stock
-- from the full ledger as of just before that timestamp.
--
-- Pre-filled for the suspect line: English "Cultural Heritage &
-- Thought" ×240 to B3 Book Store, batch at 2026-10-30 07:17:14.
-- If available_just_before < 240, the ledger recorded more than
-- was physically deducted — confirming the gap.
--
-- To check a different line: change book_id and just_before.
-- ============================================================

with target as (
  select
    'dcf38441-a179-4d94-adaa-3f8f8d3b94b3'::uuid as book_id,
    '2026-10-30 07:17:14+00'::timestamptz as just_before
)
select
  (
    coalesce((select sum(qty) from stock_additions sa, target t where sa.book_id = t.book_id and sa.added_at < t.just_before), 0)
    - coalesce((select sum(qty) from sales s, target t where s.book_id = t.book_id and s.sold_at < t.just_before), 0)
    - coalesce((select count(*) from issuances i, target t where i.book_id = t.book_id and i.issued_at < t.just_before and i.is_previous_issuance = false and i.is_reversed = false), 0)
    - coalesce((select sum(qty) from allotments a, target t where a.book_id = t.book_id and a.allotted_at < t.just_before), 0)
  ) as available_just_before_this_allotment,
  240 as what_was_requested;
