-- The Memora — Supabase schema
-- Run this once in your project's SQL Editor (Supabase dashboard → SQL Editor → New query → Run).
-- Then run the contents of seed.sql (generated from assets/js/data.js) to load the starting catalogue.
-- Safe to re-run in full any time this file changes — every statement is idempotent.

-- ============================================================
-- admin_users — the allowlist that distinguishes "the admin" from
-- "any logged-in customer." Customer sign-ups are enabled (see the
-- README/setup notes), so `authenticated` alone no longer means
-- "trusted admin" — every admin-only policy below checks
-- is_admin(auth.uid()) instead of just `to authenticated using (true)`.
-- One-time setup: after creating your admin auth user (Authentication
-- → Users), insert their id here:
--   insert into public.admin_users (user_id) values ('<uid from the Users list>');
-- ============================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admin_users enable row level security;
-- no policies at all on this table — nobody can read or write it via
-- the API (anon or authenticated); it's only ever touched from the SQL
-- editor, and only ever read internally by is_admin() below.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid);
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- ============================================================
-- site_content — one row, one JSONB blob: settings, hero, categories,
-- occasions, coupons, testimonials, faqs, blog, products.
-- This is the CMS content every visitor reads on every page load.
-- Anyone can read it; only the admin can write it.
-- ============================================================
create table if not exists public.site_content (
  id smallint primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint site_content_singleton check (id = 1)
);

alter table public.site_content enable row level security;

drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_admin_write"
  on public.site_content for update
  to authenticated
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- keep updated_at current on every write
create or replace function public.touch_site_content()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch
  before update on public.site_content
  for each row execute function public.touch_site_content();

-- ============================================================
-- orders — one row per order. Placing one requires a signed-in account
-- (no anon INSERT policy exists below) — user_id is effectively required
-- going forward, though the column stays nullable for older rows created
-- before this was enforced. Looking one up by id (track-order.html /
-- order-success.html) goes through the get_order_by_id() function below,
-- NOT a table-level RLS policy — RLS filters rows, not query shape, so a
-- blanket "select" policy for anon would let anyone with the (public,
-- unavoidably-exposed) anon key list every customer's name/phone/address
-- by calling the table directly, not just look up the one order they
-- placed. A signed-in customer can list their own orders (user_id
-- match); only the admin can list every order or change status.
-- ============================================================
create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'placed',
  payment text not null,
  coupon text default '',
  gift boolean not null default false,
  note text default '',
  customer jsonb not null,
  items jsonb not null,
  totals jsonb not null,
  payment_status text not null default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text
);

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists razorpay_order_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('pending', 'paid', 'failed', 'cod'));

alter table public.orders enable row level security;

-- Guest checkout is intentionally NOT allowed — placing an order requires
-- a signed-in account, enforced here (not just in the UI): anon has no
-- INSERT policy on this table at all, so a direct API call can't create
-- an order either, regardless of what the checkout page does or doesn't
-- redirect. (Anon can still look up ONE order by its exact id via
-- get_order_by_id() below — that's an unrelated read path, unaffected.)
drop policy if exists "orders_anon_insert" on public.orders;

-- signed-in checkout: a customer may only create an order stamped as their own
drop policy if exists "orders_customer_insert" on public.orders;
create policy "orders_customer_insert"
  on public.orders for insert
  to authenticated
  with check (status = 'placed' and user_id = auth.uid());

-- a signed-in customer can read their own order history
drop policy if exists "orders_customer_read" on public.orders;
create policy "orders_customer_read"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

-- deliberately no anon select policy — see get_order_by_id() below
drop policy if exists "orders_lookup_by_id" on public.orders;

drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read"
  on public.orders for select
  to authenticated
  using (is_admin(auth.uid()));

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update
  to authenticated
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete"
  on public.orders for delete
  to authenticated
  using (is_admin(auth.uid()));

-- The only way an anonymous visitor can read order data: one exact,
-- known order id in, that one order's row out. No id, no rows, no scan.
create or replace function public.get_order_by_id(order_id text)
returns setof public.orders
language sql
security definer
set search_path = public
as $$
  select * from public.orders where id = order_id;
$$;

revoke all on function public.get_order_by_id(text) from public;
grant execute on function public.get_order_by_id(text) to anon, authenticated;

-- Guest checkout orders (user_id is null) aren't linked to any account.
-- These two let a signed-in customer find and claim their own past guest
-- orders — scoped by auth.email(), which comes from their verified JWT,
-- never a client-supplied parameter, so nobody can search or claim using
-- an email that isn't genuinely their own signed-in identity.
create or replace function public.find_my_guest_orders()
returns setof public.orders
language sql
security definer
stable
set search_path = public
as $$
  select * from public.orders
  where user_id is null
    and lower(customer->>'email') = lower(auth.email());
$$;

-- Supabase re-grants EXECUTE on public-schema functions to anon at the
-- platform level even after this revoke, so anon can technically still
-- call it — harmless: auth.email() is null for anon, so the WHERE above
-- never matches a row, always returning empty. The revoke is left here
-- as intent/documentation, not as the actual security boundary — that's
-- auth.email() being tied to a verified JWT, which anon doesn't have.
revoke all on function public.find_my_guest_orders() from public;
revoke execute on function public.find_my_guest_orders() from anon;
grant execute on function public.find_my_guest_orders() to authenticated;

create or replace function public.claim_guest_order(order_id text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  update public.orders
  set user_id = auth.uid()
  where id = order_id
    and user_id is null
    and lower(customer->>'email') = lower(auth.email())
  returning * into o;
  if o.id is null then
    raise exception 'Order not found, or not eligible to claim';
  end if;
  return o;
end;
$$;

revoke all on function public.claim_guest_order(text) from public;
revoke execute on function public.claim_guest_order(text) from anon;
grant execute on function public.claim_guest_order(text) to authenticated;

-- ============================================================
-- leads — contact form, corporate form and newsletter sign-ups.
-- Anyone can submit one; only the admin can read them back
-- (shown in the admin dashboard).
-- ============================================================
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('contact', 'corporate', 'newsletter')),
  payload jsonb not null
);

alter table public.leads enable row level security;

drop policy if exists "leads_anon_insert" on public.leads;
create policy "leads_anon_insert"
  on public.leads for insert
  to anon
  with check (true);

drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read"
  on public.leads for select
  to authenticated
  using (is_admin(auth.uid()));

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads for delete
  to authenticated
  using (is_admin(auth.uid()));

-- ============================================================
-- wishlists — a signed-in customer's saved products, synced across
-- devices. Guests keep using localStorage (see assets/js/store.js);
-- this table only ever matters for someone who has actually signed in.
-- ============================================================
create table if not exists public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlists enable row level security;

drop policy if exists "wishlists_owner_all" on public.wishlists;
create policy "wishlists_owner_all"
  on public.wishlists for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
