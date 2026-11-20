-- ============================================================
-- Diagnostic #2: the exam_level check came back clean, so the
-- 3-unit gap between the dashboard total (16327) and
-- mains(15824) + prelims(500) = 16324 isn't a categorization
-- issue. Next suspect: sales/issuances/allotments rows that
-- reference a book_id whose book has since been deleted. The
-- dashboard RPCs (get_total_sales_qty, get_total_allotments_qty)
-- and the issuances count sum qty directly with no join to
-- books, so orphaned rows still count there — but the Mains/
-- Prelims reports require the book to exist AND have that
-- exam_level, so orphaned rows silently disappear from both.
--
-- Single UNION ALL query so everything shows in one result set
-- (Supabase's SQL editor only displays the last statement's
-- result when you run several separated by semicolons — that's
-- why the previous 3-statement version looked like "no rows").
-- ============================================================

select 'issuances' as source, i.book_id::text as book_id, count(*) as qty
from issuances i
left join books b on b.id = i.book_id
where b.id is null
  and i.is_reversed = false
  and i.is_previous_issuance = false
group by i.book_id

union all

select 'sales' as source, s.book_id::text as book_id, coalesce(sum(s.qty), 0) as qty
from sales s
left join books b on b.id = s.book_id
where b.id is null
  and s.is_returned = false
group by s.book_id

union all

select 'allotments' as source, a.book_id::text as book_id, coalesce(sum(a.qty), 0) as qty
from allotments a
left join books b on b.id = a.book_id
where b.id is null
group by a.book_id

order by source, book_id;
