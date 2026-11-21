-- ============================================================
-- Add Stock previously only reconciled against the full ledger
-- (sales + issuances + allotments + internal issuances) the VERY
-- FIRST time a book ever got a stock row. Every add after that
-- used add_stock_batch(), which just does total_qty += qty,
-- available_qty += qty — a plain add on top of whatever available_qty
-- already was, including if that number was already wrong from a
-- silently-failed deduction somewhere else in the app.
--
-- That meant any book whose stock row was created once (even a
-- placeholder from the original bulk seed, total_qty = 0) could
-- never again benefit from the reconciliation safety net — every
-- future "Add Stock" just piled the new delivery on top of the
-- existing drift instead of fixing it.
--
-- Fix: add_stock_reconciled() always recomputes available_qty from
-- the full ledger — not from the current available_qty — on every
-- single stock-in, whether the book has a row yet or not. Manual
-- corrections (stock_corrections) are added back on top, so a
-- deliberate physical-recount override never gets silently erased
-- by this recompute; it's additive to the ledger math, not
-- overridden by it.
--
-- Row-locked (`for update`) same as add_stock_batch()/adjust_stock(),
-- so two near-simultaneous "+Add Stock" clicks on the same book
-- can't race each other.
--
-- Run this once in Supabase → SQL Editor.
-- ============================================================

drop function if exists add_stock_batch(uuid, integer);

create or replace function add_stock_reconciled(p_book_id uuid, p_qty integer)
returns table(
  id uuid, total_qty integer, available_qty integer,
  sold_qty integer, issued_qty integer, allotted_qty integer,
  internal_qty integer, correction_net integer
)
language plpgsql
as $$
declare
  v_id uuid;
  v_existing_total integer;
  v_total_qty integer;
  v_sold integer;
  v_issued integer;
  v_allotted integer;
  v_internal integer;
  v_correction integer;
  v_available integer;
begin
  select stock.id, stock.total_qty into v_id, v_existing_total
  from stock
  where stock.book_id = p_book_id
  order by stock.id desc
  limit 1
  for update;

  select coalesce(sum(s.qty), 0) into v_sold
  from sales s where s.book_id = p_book_id and s.is_returned = false;

  select count(*) into v_issued
  from issuances i where i.book_id = p_book_id and i.is_previous_issuance = false and i.is_reversed = false;

  select coalesce(sum(a.qty), 0) into v_allotted
  from allotments a where a.book_id = p_book_id;

  select coalesce(sum(ii.qty), 0) into v_internal
  from internal_issuances ii where ii.book_id = p_book_id and ii.stock_deducted = true;

  select coalesce(sum(c.delta), 0) into v_correction
  from stock_corrections c where c.book_id = p_book_id;

  v_total_qty := coalesce(v_existing_total, 0) + p_qty;
  v_available := v_total_qty - v_sold - v_issued - v_allotted - v_internal + v_correction;

  if v_id is not null then
    update stock set total_qty = v_total_qty, available_qty = v_available
    where stock.id = v_id;
  else
    insert into stock (book_id, location, total_qty, available_qty, low_stock_threshold)
    values (p_book_id, 'Main Campus', v_total_qty, v_available, 50)
    returning stock.id into v_id;
  end if;

  return query select v_id, v_total_qty, v_available, v_sold, v_issued, v_allotted, v_internal, v_correction;
end;
$$;

grant execute on function add_stock_reconciled(uuid, integer) to authenticated;
