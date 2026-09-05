/* THE MEMORA — Supabase connection config.
   Fill these in from your Supabase project: Project Settings → API.
   The anon key is safe to expose here — it is public by design and
   every table it can touch is protected by the Row Level Security
   policies in supabase/schema.sql. Never put the service_role key here. */
window.MEMORA_SUPABASE = {
  url: 'https://jsfmwonrshocbtzolcps.supabase.co',
  anonKey: 'sb_publishable_j70TZAXW1vguXfJp77tAHw_Lk_kZmoz'
};

/* Razorpay's public Key ID — safe to expose (it's the *public* half; the
   secret key lives only as a Supabase Edge Function secret, never here). */
window.MEMORA_RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID';
