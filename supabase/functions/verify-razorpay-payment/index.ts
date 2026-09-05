// THE MEMORA — verifies a completed Razorpay payment and marks the
// matching order paid. Deploy via Supabase Dashboard -> Edge Functions
// (paste this file), reusing the same RAZORPAY_KEY_SECRET secret set for
// create-razorpay-order. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by Supabase.
//
// The whole point of this function: never trust a "payment succeeded"
// claim from the browser. Razorpay's checkout widget hands the client a
// signature it can't forge without the secret key; this function is the
// only place that secret exists, so it's the only place a payment can
// actually be confirmed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment details' }, 400);
    }

    const expected = await hmacHex(RAZORPAY_KEY_SECRET, razorpay_order_id + '|' + razorpay_payment_id);
    if (expected !== razorpay_signature) return json({ error: 'Payment signature did not match' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin
      .from('orders')
      .update({ payment_status: 'paid', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);

    return json({ order: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
