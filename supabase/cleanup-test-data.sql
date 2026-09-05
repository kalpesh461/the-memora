-- One-off cleanup: removes test orders/leads created while verifying
-- the Supabase migration and the RLS security fixes. Run once in the
-- SQL Editor, then this file can be deleted — it's not part of the app.

delete from public.orders
where id in ('TM84001890', 'TM86507954');

delete from public.leads
where kind = 'contact'
  and payload->>'name' in ('Test Enquirer', 'Direct Test');
