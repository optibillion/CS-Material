-- ============================================================
-- Admin dashboard: accurate ALL-TIME totals for the new
-- "Total Books Distributed" summary card.
--
-- Supabase/PostgREST caps a plain .select() at 1000 rows, so
-- summing sales.qty / allotments.qty client-side silently
-- undercounts once either table passes 1000 rows. These RPCs
-- do the SUM() in the database instead, same pattern already
-- used by get_my_sales_qty / get_my_sales_stats.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

create or replace function get_total_sales_qty()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(qty), 0)::integer
  from sales
  where is_returned = false;
$$;

create or replace function get_total_allotments_qty()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(qty), 0)::integer
  from allotments;
$$;

grant execute on function get_total_sales_qty() to authenticated;
grant execute on function get_total_allotments_qty() to authenticated;
