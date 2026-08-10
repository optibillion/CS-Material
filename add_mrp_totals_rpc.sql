-- ============================================================
-- Admin dashboard: total MRP (list price) value of books Sold
-- and Given to Distributors, shown next to those two breakdown
-- tiles on "Total Books Distributed" (not shown for Issued to
-- Students, since those are given free — no MRP to report).
--
-- Same 1000-row-cap reasoning as the other RPCs here: sales and
-- allotments both already exceed 1000 rows, so this must be
-- summed in the database, not fetched and reduced client-side.
--
-- This is the plain MRP total (qty × list price), not the
-- discounted value already shown elsewhere (e.g. distributor
-- slips use unit_mrp * (1 - discount_pct/100)). It's a separate,
-- undiscounted "what this would cost at full price" figure.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

create or replace function get_total_sales_mrp()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  -- left join (not inner join): a sale whose book was since deleted must
  -- still count its qty at ₹0 MRP, not vanish from the sum entirely —
  -- this has to stay in lockstep with get_total_sales_qty's plain
  -- sum(qty), which has no join and so never drops a row.
  select coalesce(sum(s.qty * coalesce(b.mrp, 0)), 0)::numeric
  from sales s
  left join books b on b.id = s.book_id
  where s.is_returned = false;
$$;

create or replace function get_total_allotments_mrp()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(a.qty * coalesce(a.unit_mrp, b.mrp, 0)), 0)::numeric
  from allotments a
  left join books b on b.id = a.book_id;
$$;

grant execute on function get_total_sales_mrp() to authenticated;
grant execute on function get_total_allotments_mrp() to authenticated;
