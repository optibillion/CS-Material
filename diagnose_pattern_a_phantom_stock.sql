-- ============================================================
-- Pattern A follow-up: 8 books show stock_in_total = 0 (or near
-- zero) alongside hundreds of logged sales/issuances/allotments,
-- with actual_available_now pinned at 0 (two are already slightly
-- negative). Root cause found in code: every sale/issuance/
-- allotment INSERTs its own row first, then calls adjustStock()
-- as a separate step — and adjustStock() only shows a toast on
-- failure, it never rolls back or blocks the transaction (see
-- src/lib/supabase.js adjustStock(), and its call sites in
-- Sales.jsx / Issue.jsx / Internal.jsx / InstitutionDetail.jsx).
-- So the "paper" record and the "stock" record can silently
-- diverge.
--
-- What we don't know yet: whether this is OLD damage (from before
-- add_atomic_stock_functions.sql added row-locking on 2025-11-03,
-- closing a lost-update race in the previous client-side
-- read-modify-write) or STILL HAPPENING NOW. This query answers
-- that by pulling, per book:
--   - first/last activity timestamp across sales, issuances,
--     allotments, internal issuances
--   - how much of that activity happened ON OR AFTER 2025-11-03
--     (the atomic-function cutover) vs before
--   - whether "Add Stock" (stock_additions) was EVER run for it
--   - whether any manual "Correct" was ever logged
--   - the book's own catalog creation date, for context
--
-- If activity_after_cutover is 0 (or near 0) for a book, the
-- damage is historical and a one-time physical recount + Correct
-- closes it. If it's still accumulating, the fire-and-forget
-- deduction is an active, ongoing risk for that book right now.
-- ============================================================

with targets (title, exam_level, unit, part, medium) as (
  values
    ('सामान्य हिन्दी एवं व्याकरण', 'Mains', 'Paper 5', '', 'both'),
    ('हिन्दी निबंध एवं प्रारूप लेखन', 'Mains', 'Paper 6', '', 'both'),
    ('समाजशास्त्र', 'Mains', 'Paper 2 Part-B', '1 & 2', 'hindi'),
    ('समाजशास्त्र', 'Mains', 'Paper 2 Part-B', '3,4&5', 'hindi'),
    ('मध्यप्रदेश का भूगोल - Geography of MP', 'Prelims', '4', '', 'english'),
    ('मध्यप्रदेश की जनजातियाँ - Tribes of Madhya', 'Prelims', '10', '', 'english'),
    ('महासंकलन', 'Prelims', '', '', 'hindi'),
    ('Tribes Chart', 'Prelims', '10', '', 'hindi')
),
matched as (
  select b.id as book_id, b.title, b.exam_level, b.unit, b.part, b.medium, b.created_at as book_created_at
  from books b
  join targets t
    on trim(b.title) = trim(t.title)
    and b.exam_level = t.exam_level
    and coalesce(trim(b.unit), '') = coalesce(trim(t.unit), '')
    and coalesce(trim(b.part), '') = coalesce(trim(t.part), '')
    and b.medium = t.medium
),
sale_span as (
  select book_id, min(sold_at) as first_sale, max(sold_at) as last_sale,
    count(*) filter (where sold_at >= '2025-11-03') as sales_after_cutover
  from sales where book_id in (select book_id from matched)
  group by book_id
),
issue_span as (
  select book_id, min(issued_at) as first_issue, max(issued_at) as last_issue,
    count(*) filter (where issued_at >= '2025-11-03' and is_previous_issuance = false) as issuances_after_cutover
  from issuances where book_id in (select book_id from matched)
  group by book_id
),
allot_span as (
  select book_id, min(allotted_at) as first_allot, max(allotted_at) as last_allot,
    count(*) filter (where allotted_at >= '2025-11-03') as allotments_after_cutover
  from allotments where book_id in (select book_id from matched)
  group by book_id
),
internal_span as (
  select book_id, min(issued_at) as first_internal, max(issued_at) as last_internal,
    count(*) filter (where issued_at >= '2025-11-03') as internal_after_cutover
  from internal_issuances where book_id in (select book_id from matched)
  group by book_id
),
stock_adds as (
  select book_id, count(*) as add_stock_runs, min(added_at) as first_add_stock, max(added_at) as last_add_stock
  from stock_additions where book_id in (select book_id from matched)
  group by book_id
),
corrections as (
  select book_id, count(*) as correction_runs, max(corrected_at) as last_correction
  from stock_corrections where book_id in (select book_id from matched)
  group by book_id
),
current_stock as (
  select book_id, sum(available_qty) as available_qty, sum(total_qty) as total_qty, count(*) as stock_rows
  from stock where book_id in (select book_id from matched)
  group by book_id
)
select
  m.title, m.exam_level, m.unit, m.part, m.medium,
  m.book_created_at,

  cs.total_qty, cs.available_qty,

  least(coalesce(ss.first_sale, 'infinity'::timestamptz), coalesce(ish.first_issue, 'infinity'::timestamptz),
        coalesce(al.first_allot, 'infinity'::timestamptz), coalesce(ins.first_internal, 'infinity'::timestamptz))
    as earliest_activity,
  greatest(coalesce(ss.last_sale, '-infinity'::timestamptz), coalesce(ish.last_issue, '-infinity'::timestamptz),
           coalesce(al.last_allot, '-infinity'::timestamptz), coalesce(ins.last_internal, '-infinity'::timestamptz))
    as latest_activity,

  coalesce(ss.sales_after_cutover, 0) + coalesce(ish.issuances_after_cutover, 0)
    + coalesce(al.allotments_after_cutover, 0) + coalesce(ins.internal_after_cutover, 0)
    as activity_count_on_or_after_2025_11_03,

  coalesce(sa.add_stock_runs, 0) as add_stock_ever_run_count,
  sa.first_add_stock, sa.last_add_stock,

  coalesce(co.correction_runs, 0) as manual_corrections_ever_run_count,
  co.last_correction

from matched m
left join current_stock cs on cs.book_id = m.book_id
left join sale_span ss on ss.book_id = m.book_id
left join issue_span ish on ish.book_id = m.book_id
left join allot_span al on al.book_id = m.book_id
left join internal_span ins on ins.book_id = m.book_id
left join stock_adds sa on sa.book_id = m.book_id
left join corrections co on co.book_id = m.book_id

order by latest_activity desc nulls last;
