-- ============================================================
-- Admin & Accountant Sales pages: accurate stats (Books Sold,
-- Revenue, Cash, Online, Transactions) for a given date range
-- (or all-time when both dates are null).
--
-- Same root cause as add_dashboard_totals_rpc.sql: the Sales
-- pages fetch the raw `sales` table client-side with no limit,
-- Supabase/PostgREST caps that at 1000 rows, and every stat
-- (Books Sold, Revenue, ...) is summed in JS from the truncated
-- array — silently wrong once sales pass 1000 rows. This mirrors
-- the get_my_sales_stats fix already applied on the issuer side,
-- but scoped to ALL sales instead of one issuer's own sales.
--
-- "Mark Returned" always flips every row of a transaction
-- together (see handleReturn in Sales.jsx — .in('id', txn.ids)),
-- so a transaction is never partially returned. That means a
-- plain row-level is_returned filter is equivalent to the
-- client's per-transaction all_returned grouping — no need to
-- reconstruct transaction groups in SQL.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

create or replace function get_sales_stats(date_from date default null, date_to date default null)
returns table (
  total_qty integer,
  total_revenue numeric,
  cash_revenue numeric,
  online_revenue numeric,
  total_transactions integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(qty) filter (where is_returned = false), 0)::integer as total_qty,
    coalesce(sum(total_price) filter (where is_returned = false), 0)::numeric as total_revenue,
    coalesce(sum(total_price) filter (where is_returned = false and coalesce(payment_mode, 'cash') <> 'online'), 0)::numeric as cash_revenue,
    coalesce(sum(total_price) filter (where is_returned = false and payment_mode = 'online'), 0)::numeric as online_revenue,
    count(distinct (sold_at, buyer_name, sold_by))::integer as total_transactions
  from sales
  where (date_from is null or sold_at::date >= date_from)
    and (date_to is null or sold_at::date <= date_to);
$$;

grant execute on function get_sales_stats(date, date) to authenticated;
