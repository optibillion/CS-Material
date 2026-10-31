-- ============================================================
-- Atomic stock updates — closes the last remaining way two
-- near-simultaneous actions on the same book could lose one
-- update (a client-side "read current value, then write new
-- value" has a race window; two people clicking +Add, or an
-- issuance and a sale landing in the same instant, could overwrite
-- each other). Both functions do their read-modify-write inside a
-- single locked transaction, so Postgres serializes concurrent
-- calls instead of letting one silently clobber the other.
--
-- Run this once in Supabase → SQL Editor.
-- ============================================================

-- Every deduction/credit in the app (issuance, sale, allotment,
-- reversal, return, take-back) routes through this. Negative
-- available_qty is intentional — a shortfall stays visible as
-- "-N" instead of being silently capped at 0.
create or replace function adjust_stock(p_book_id uuid, p_delta integer)
returns integer
language plpgsql
as $$
declare
  v_id bigint;
  v_available integer;
begin
  select id into v_id
  from stock
  where book_id = p_book_id
  order by id desc
  limit 1
  for update;

  if v_id is not null then
    update stock set available_qty = available_qty + p_delta
    where id = v_id
    returning available_qty into v_available;
    return v_available;
  end if;

  -- no stock row exists yet — only worth creating one to show a
  -- deficit; crediting a book with no stock history ever is a no-op
  if p_delta < 0 then
    insert into stock (book_id, location, total_qty, available_qty, low_stock_threshold)
    values (p_book_id, 'Main Campus', 0, p_delta, 50)
    returning available_qty into v_available;
    return v_available;
  end if;

  return null;
end;
$$;

grant execute on function adjust_stock(uuid, integer) to authenticated;

-- Add Stock: bumps total_qty and available_qty together atomically
-- for a book's existing stock row.
create or replace function add_stock_batch(p_book_id uuid, p_qty integer)
returns table(id bigint, total_qty integer, available_qty integer)
language plpgsql
as $$
declare
  v_id bigint;
begin
  select stock.id into v_id from stock where book_id = p_book_id order by stock.id desc limit 1 for update;

  if v_id is not null then
    return query
    update stock set total_qty = stock.total_qty + p_qty, available_qty = stock.available_qty + p_qty
    where stock.id = v_id
    returning stock.id, stock.total_qty, stock.available_qty;
  else
    return query
    insert into stock (book_id, location, total_qty, available_qty, low_stock_threshold)
    values (p_book_id, 'Main Campus', p_qty, p_qty, 50)
    returning stock.id, stock.total_qty, stock.available_qty;
  end if;
end;
$$;

grant execute on function add_stock_batch(uuid, integer) to authenticated;
