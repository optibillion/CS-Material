-- Lets ADMIN ONLY correct buyer/address/payment/product details on a
-- website order (e.g. a typo'd phone number or address) from the Website
-- Orders detail modal. Every other logged-in role (accountant, view_admin,
-- or an issuer with can_view_website_orders) must NOT be able to touch
-- these fields — and this page is shared by /admin/website-orders AND
-- /issuer/website-orders (same component), so a plain RLS USING(true)
-- policy (as used for shipped/delivered in add_website_orders_fulfillment.sql)
-- would let ANY authenticated user edit them, since every logged-in user
-- maps to the same Postgres "authenticated" role.
--
-- Instead of RLS, this uses a SECURITY DEFINER function that looks up the
-- caller's app-level role in `users` (via auth_id = auth.uid()) and raises
-- an exception for anyone who isn't role = 'admin'. The fulfillment
-- (shipped/delivered) RLS policy and grants are untouched.
-- Run this once in Supabase → SQL Editor.

create or replace function update_website_order_details(
  p_id bigint,
  p_buyer_name text,
  p_phone text,
  p_email text,
  p_house text,
  p_locality text,
  p_city text,
  p_district text,
  p_state text,
  p_pincode text,
  p_amount numeric,
  p_status text,
  p_product_name text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin') into v_is_admin
  from users
  where auth_id = auth.uid();

  if not coalesce(v_is_admin, false) then
    raise exception 'Only an admin can edit website order details';
  end if;

  update website_orders
  set buyer_name          = p_buyer_name,
      phone               = p_phone,
      email               = p_email,
      house               = p_house,
      locality            = p_locality,
      city                = p_city,
      district            = p_district,
      state               = p_state,
      pincode             = p_pincode,
      amount              = p_amount,
      status              = p_status,
      product_name        = p_product_name,
      razorpay_order_id   = p_razorpay_order_id,
      razorpay_payment_id = p_razorpay_payment_id
  where id = p_id;
end;
$$;

grant execute on function update_website_order_details(
  bigint, text, text, text, text, text, text, text, text, text, numeric, text, text, text, text
) to authenticated;
