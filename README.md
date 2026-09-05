# The Memora — Website + Admin Panel

A complete, multi-page, production-ready e-commerce website for **The Memora** (gift boxes with jewellery and keepsakes), built as plain HTML / CSS / JavaScript. No build step, no server, no dependencies — open `index.html` and it runs.

---

## 1. Quick start

**Look at it locally**

```bash
cd memora
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly by double-click also works, but a local server is closer to real hosting.)

**Put it online (free)**

| Host | How |
|---|---|
| Netlify | Drag the whole `memora` folder onto app.netlify.com/drop |
| Vercel | `vercel deploy` inside the folder, or drag-and-drop |
| GitHub Pages | Push the folder to a repo → Settings → Pages → deploy from branch |
| cPanel / Hostinger / any host | Upload everything into `public_html` |

Everything is relative-path, so it works in a subfolder too.

---

## 2. One-time backend setup (Supabase)

The site's content, orders and form leads live in a [Supabase](https://supabase.com) project (Postgres + Auth), not in the browser. Do this once:

1. Create a free project at [supabase.com](https://supabase.com) (pick a region, save the DB password somewhere safe).
2. Open **SQL Editor → New query**, paste in the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `site_content`, `orders`, `leads`, `wishlists` and `admin_users` tables with their access policies.
3. Run the contents of [`supabase/seed.sql`](supabase/seed.sql) the same way — it loads the starting catalogue (generated from the old `data.js` via `node supabase/gen-seed.js`, in case you ever need to regenerate it).
4. Go to **Authentication → Users → Add user** and create yourself an admin login (your own email + a real password). Copy that user's **UID** from the Users list.
5. Back in the **SQL Editor**, run one line to make that user the admin (swap in the UID you just copied):
   ```sql
   insert into public.admin_users (user_id) values ('paste-the-uid-here');
   ```
   This is what actually distinguishes you from a regular customer — see §2a below.
6. Go to **Authentication → Providers/Settings** and make sure email sign-ups are **enabled** (customers need this to create accounts). This is safe now: only the UID in `admin_users` gets admin access, no matter who else signs up.
7. Go to **Project Settings → API**, copy the **Project URL** and the **`anon` public** key, and paste them into `assets/js/config.js`:
   ```js
   window.MEMORA_SUPABASE = { url: 'https://xxxx.supabase.co', anonKey: 'eyJ...' };
   ```
   The anon key is safe to ship in the front-end — it's public by design, and every table it touches is protected by the row-level-security policies in `schema.sql`. **Never** put the `service_role` key here.

### 2a. Admin vs. customer accounts

Anyone can create a customer account at `/account.html` — order history, a saved address and a synced wishlist. That account can **never** reach `/admin.html` or touch the catalogue: every admin-only policy in `schema.sql` checks the `admin_users` allowlist (step 5 above), not just "is someone logged in." If you ever need a second admin, insert their UID the same way; if you need to revoke one, delete their row from `admin_users`.

That's it — the storefront and the admin panel now both talk straight to Supabase.

### 2b. Real online payment (optional — Razorpay)

Checkout works fully without this (Cash on delivery, and a WhatsApp/UPI handoff for "prepaid" orders). When you're ready for real online payment:

1. Create a [Razorpay](https://razorpay.com) account — test-mode keys are instant, no KYC needed to start. Dashboard → **Settings → API Keys** → generate a Key ID + Key Secret.
2. Supabase Dashboard → **Edge Functions** → create two functions, pasting in `supabase/functions/create-razorpay-order/index.ts` and `supabase/functions/verify-razorpay-payment/index.ts` respectively, and deploy each.
3. In that same Edge Functions section, add secrets `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (your values from step 1). `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are injected automatically — nothing to do there.
4. Paste your Key ID into `assets/js/config.js` (`window.MEMORA_RAZORPAY_KEY_ID`).

Until that last step is done, `checkout.html` automatically keeps using the WhatsApp flow for prepaid orders — nothing breaks either way.

## 3. Admin panel — this is the important part

Open **`/admin.html`** and sign in with the Supabase user you created above.

### What you can edit without touching code

| Section | What it controls |
|---|---|
| **Dashboard** | Live counts, recent orders, stock alerts, form enquiries |
| **Products** | Add / edit / duplicate / delete, price, MRP, stock, badges, photos (upload or URL), occasions, description, finishes, show/hide |
| **Categories** | Category names, taglines, tile photos + occasion tags |
| **Offers & coupons** | Coupon codes (% off / flat ₹ off / free shipping), minimum order, active or paused + the scrolling announcement bar |
| **Homepage banners** | Hero slides: photo, headline, sub-line, both button labels and links |
| **Orders** | Every order placed on the site, from every visitor, status updates, full order view, WhatsApp handoff, CSV export |
| **Journal** | Blog posts: title, summary, category, date, cover photo |
| **Testimonials** | Homepage reviews |
| **FAQs** | FAQ page + homepage accordion (also feeds Google's FAQ rich result) |
| **Settings** | Brand name, tagline, logo, WhatsApp number, phone, email, address, socials, currency, free-shipping threshold, flat shipping, COD fee, tax %, order prefix, admin password |
| **Backup & publish** | Download/restore JSON backups of the live catalogue |

### How saving works (read this once)

Every edit you make saves straight to Supabase and is **live for every visitor immediately** — there is no publish step, no download/re-upload loop. Cart, wishlist and "recently viewed" stay in each visitor's own browser (as before) since there's no reason to share those.

Orders and contact/corporate/newsletter form submissions are stored the same way, so they show up in the admin dashboard no matter which device or browser received them — unlike before, when they were only visible in the browser that happened to receive them.

---

## 4. Pages included

**Storefront**

`index.html` · `shop.html` · `product.html` · `cart.html` · `checkout.html` · `order-success.html` · `wishlist.html` · `track-order.html` · `account.html` · `about.html` · `contact.html` · `corporate.html` · `faq.html` · `blog.html` · `blog-post.html` · `404.html`

**Policies** — `shipping-policy.html` · `returns-policy.html` · `privacy-policy.html` · `terms.html`

**Admin** — `admin.html`

---

## 5. What actually works

- **Catalogue** — 35 products across 6 categories and 10 occasions
- **Shop** — filter by category, occasion and price, 8 sort options, live search, active-filter chips, pagination
- **Product page** — image gallery with hover-zoom, finish swatches, quantity, tabs (description / details / shipping / reviews), related products, recently viewed, Product JSON-LD for Google
- **Cart** — slide-out drawer + full cart page, free-shipping progress bar, add-on upsells, coupon codes
- **Checkout** — requires a signed-in account (see below), full validation (Indian mobile format, 6-digit PIN, email), gift mode with message card, prepaid or COD, live totals
- **Orders** — order number generated, order saved, confirmation page, one-tap **"Send on WhatsApp"** with the whole order pre-written, plus an email fallback
- **Track order** — enter order number → visual timeline
- **Customer accounts** (`account.html`) — sign up / sign in (required to place an order — see Order flow below), order history, one saved address that prefills checkout, and a wishlist that syncs across devices once signed in
- **Wishlist** — usable while just browsing without an account (per-device); syncs to the account once signed in
- **Forms** — contact + corporate quote forms validate, save to the admin dashboard, and offer a WhatsApp handoff
- **Search** — modal search with `Ctrl/⌘ + K`
- **WhatsApp chat bubble** — the floating WhatsApp button opens a quick-reply panel (Track an order / Corporate gifting / Something else) instead of jumping straight out, then hands off to WhatsApp with the right message pre-filled

### Order flow, honestly described

**An account is required to place an order** — guest checkout was removed deliberately: `checkout.html` sends anyone who isn't signed in to `account.html` first (and back to checkout automatically once they've signed in or created an account), and the database itself has no policy allowing an order to be created without one, so this isn't just a UI nicety.

For payment: **Cash on delivery** places the order directly. For **online/prepaid**, there's no payment gateway wired in yet (that needs a merchant account and keys) — the flow is: customer fills checkout → order is recorded and given a number → they tap **Send on WhatsApp** → the full order arrives on your phone → you reply with the UPI ID/payment link. This is exactly how most new Indian D2C brands start, and it converts well. A real gateway (Razorpay) is fully built and ready to switch on whenever you want — see `supabase/functions/` and the Razorpay section of this README's setup notes; until you add real keys, checkout automatically uses the WhatsApp flow above for prepaid orders too.

---

## 6. Design & animation

Theme pulled from your logo: **deep olive green + antique gold + ivory**, Cormorant Garamond over Jost.

Animations included: hero cross-fade slider with Ken Burns zoom, scroll-reveal (fade / slide / mask / stagger), hide-on-scroll sticky header, marquee announcement bar, hover-lift product cards with second-image swap, magnetic gold button fills, count-up statistics, accordions, cart drawer, toasts, floating WhatsApp button with a pulse, skeleton and page-fade transitions. All of it respects `prefers-reduced-motion`.

Fully responsive: 4-column desktop → 2-column tablet → 2-column mobile, with a slide-in mobile menu.

---

## 7. SEO & performance

- Unique title, meta description, canonical, Open Graph and Twitter tags on every page
- JSON-LD: `Store` (home), `Product` (product pages), `FAQPage` (FAQ)
- `sitemap.xml` (61 URLs), `robots.txt` (admin excluded), `manifest.json` (installable)
- Semantic HTML, alt text everywhere, lazy-loaded images, `fetchpriority` on the hero
- Zero JavaScript frameworks — total JS is ~90 KB unminified. Only external request is Google Fonts.
- `.htaccess` (Apache) and `netlify.toml` included with caching + 404 rules

**Before you go live, change these:**

1. Admin → Settings → WhatsApp number, phone, email, address, social links *(the defaults are placeholders)*
2. Product photos — replace the placeholder artwork with real photography (Admin → Products → Edit → upload)
3. Find-and-replace `https://www.thememora.in` with your real domain in all `.html` files, `sitemap.xml` and `robots.txt`
4. Change the admin password

---

## 8. File structure

```
memora/
├── index.html … 19 pages
├── admin.html
├── sitemap.xml, robots.txt, manifest.json, .htaccess, netlify.toml, _redirects
├── supabase/
│   ├── schema.sql      ← tables + row-level-security policies (run once)
│   ├── seed.sql         ← starting catalogue (generated, run once)
│   └── gen-seed.js      ← regenerates seed.sql from assets/js/data.js
└── assets/
    ├── css/
    │   ├── style.css      ← all storefront styling + animations
    │   └── admin.css      ← admin panel styling
    ├── js/
    │   ├── data.js        ← factory-default content — only read by gen-seed.js, not loaded by any page
    │   ├── config.js      ← your Supabase project URL + anon key
    │   ├── store.js       ← data layer: Supabase-backed CMS + orders + leads, localStorage cart/wishlist
    │   ├── app.js         ← shared UI: header, cart drawer, search, reveals
    │   ├── pages.js       ← per-page controllers
    │   └── admin.js       ← admin panel
    └── img/
        ├── logo.png, favicon.svg
        ├── products/      ← 70 placeholder product images
        └── site/          ← hero, category, blog artwork
```

**Where to change what**

| I want to… | Go to |
|---|---|
| Change colours | `assets/css/style.css`, the `:root` block at the top |
| Change fonts | `:root` `--ff-display` / `--ff-body`, and the Google Fonts `<link>` in each page |
| Change content | Admin panel (the catalogue lives in Supabase, not in a file) |
| Change page copy | Edit that page's `.html` directly |
| Switch on real online payment | See §2b — Razorpay is fully built, just needs your API keys |

---

## 9. Handing this to Claude Code

This folder is self-contained and readable. Good next prompts:

- "Add a build-your-own-box wizard page: pick box → pick jewellery → pick add-ons → personal note."
- "Minify CSS/JS and inline critical CSS for the homepage."
- "Convert the placeholder SVG product art to real photos in assets/img/products and update the catalogue in Supabase."
- "Move uploaded product images from base64-in-JSONB to a Supabase Storage bucket."

---

Built for The Memora. *We wrap emotions, you create memory.*
