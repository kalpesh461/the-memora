// THE MEMORA — creates a Razorpay order + the matching Memora order row.
// Deploy via Supabase Dashboard -> Edge Functions -> Create function
// (paste this file), then set these two secrets in the same section:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase for every Edge Function — no need to set those yourself.
//
// The service-role key never leaves this function; it's what lets this
// server-side code write the order row directly (bypassing RLS, the same
// trust boundary the client's own INSERT policy already relies on for
// guest/COD checkout — just exercised here instead of in the browser).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const row = await req.json();
    // Expected shape (identical to what Store.createOrder already builds
    // client-side for guest/COD checkout): id, customer, items, totals,
    // coupon, gift, note, user_id.
    if (!row || !row.id || !row.totals || !row.totals.total || !row.customer || !row.items) {
      return json({ error: 'Missing or invalid order payload' }, 400);
    }
    // Guest checkout is not allowed — this function uses the service-role
    // key, which bypasses RLS entirely, so this check (not a database
    // policy) is the actual enforcement point for this particular path.
    if (!row.user_id) return json({ error: 'A signed-in account is required to place an order' }, 401);

    const amountPaise = Math.round(Number(row.totals.total) * 100);
    if (!amountPaise || amountPaise <= 0) return json({ error: 'Invalid order amount' }, 400);

    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: row.id,
        notes: { memora_order_id: row.id },
      }),
    });
    const rpOrder = await rpRes.json();
    if (!rpRes.ok) return json({ error: rpOrder?.error?.description || 'Could not create Razorpay order' }, 502);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from('orders').insert({
      id: row.id,
      status: 'placed',
      payment: 'prepaid',
      payment_status: 'pending',
      razorpay_order_id: rpOrder.id,
      coupon: row.coupon || '',
      gift: !!row.gift,
      note: row.note || '',
      customer: row.customer,
      items: row.items,
      totals: row.totals,
      user_id: row.user_id || null,
    });
    if (error) return json({ error: error.message }, 500);

    return json({
      memoraOrderId: row.id,
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
