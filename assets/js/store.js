/* ============================================================
   THE MEMORA — Store / data layer
   Supabase-backed CMS (public content, one row) + orders + leads,
   localStorage-backed cart / wishlist / recently-viewed.

   Tier 1 (settings, hero, categories, occasions, coupons,
   testimonials, faqs, blog, products) is fetched once via ready()
   into the in-memory `db` object and read synchronously from there —
   every accessor below keeps the exact same signature it always had.

   Tier 2 (orders, leads) is per-visitor / write-heavy and is never
   preloaded — it's fetched on demand via the async methods at the
   bottom, so a storefront visitor's browser never receives every
   other customer's order history just to render a product page.
   ============================================================ */
(function (w) {
  'use strict';

  var K = { cart: 'memora_cart_v1', wish: 'memora_wish_v1', recent: 'memora_recent_v1' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function read(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('Storage full', e); return false; } }

  var cfg = w.MEMORA_SUPABASE || {};
  var sb = (w.supabase && cfg.url && cfg.anonKey && cfg.url.indexOf('YOUR_SUPABASE') !== 0)
    ? w.supabase.createClient(cfg.url, cfg.anonKey)
    : null;

  /* Supabase fires PASSWORD_RECOVERY (and other one-shot auth events)
     almost immediately after the client is created — well before a page's
     own boot sequence gets around to registering a listener for it. So the
     listener is wired up right here, synchronously, at the earliest
     possible moment, and every event it sees is buffered — a late
     subscriber (see onAuthEvent below) gets replayed anything it missed
     instead of silently never finding out a recovery link was clicked. */
  var authEventLog = [];
  var authEventListeners = [];
  if (sb) {
    sb.auth.onAuthStateChange(function (event) {
      authEventLog.push(event);
      authEventListeners.forEach(function (fn) { try { fn(event); } catch (e) { console.error(e); } });
    });
  }

  var db = { settings: {}, hero: [], categories: [], occasions: [], coupons: [], testimonials: [], faqs: [], blog: [], products: [] };
  var readyPromise = null;

  /* current customer session (null = guest) and the wishlist cache it
     drives — see initSession() below for why this is synchronous everywhere else */
  var session = null;
  var wishCache = null;

  var listeners = [];
  function emit(evt, payload) {
    listeners.forEach(function (fn) { try { fn(evt, payload); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent('memora:' + evt, { detail: payload }));
  }

  var Store = {
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    /* ---------- Boot ---------- */
    ready: function () {
      if (readyPromise) return readyPromise;
      if (!sb) {
        readyPromise = Promise.reject(new Error('Supabase is not configured. Fill in your project URL and anon key in assets/js/config.js.'));
        return readyPromise;
      }
      readyPromise = sb.from('site_content').select('data').eq('id', 1).single().then(function (res) {
        if (res.error) throw res.error;
        db = res.data.data;
        emit('db');
        return db;
      });
      return readyPromise;
    },

    /* Runs alongside ready() at boot (independent of it — one is the
       catalogue, this is "who's logged in"). Populates the wishlist
       cache so wishlist()/inWishlist() stay synchronous everywhere,
       exactly like the Tier-1 catalogue accessors above. */
    initSession: function () {
      if (!sb) { wishCache = read(K.wish, []); return Promise.resolve(null); }
      return sb.auth.getSession().then(function (res) {
        session = res.data.session;
        if (!session) { wishCache = read(K.wish, []); emit('wish', wishCache); return session; }
        return sb.from('wishlists').select('product_id').eq('user_id', session.user.id).then(function (r) {
          var serverIds = (r.data || []).map(function (x) { return x.product_id; });
          var localIds = read(K.wish, []);
          var merged = serverIds.slice();
          localIds.forEach(function (id) { if (merged.indexOf(id) === -1) merged.push(id); });
          wishCache = merged;
          write(K.wish, merged);
          emit('wish', wishCache);
          var toAdd = merged.filter(function (id) { return serverIds.indexOf(id) === -1; });
          if (toAdd.length) {
            sb.from('wishlists').upsert(toAdd.map(function (id) { return { user_id: session.user.id, product_id: id }; })).then(function () {});
          }
          return session;
        });
      });
    },
    session: function () { return session; },

    /* ---------- CMS (Tier 1 — synchronous once ready() has resolved) ---------- */
    db: function () { return db; },
    save: function () {
      return sb.from('site_content').update({ data: db }).eq('id', 1).then(function (res) {
        emit('db');
        return !res.error;
      });
    },
    settings: function () { return db.settings; },
    setSetting: function (k, v) { db.settings[k] = v; return this.save(); },

    products: function (opts) {
      opts = opts || {};
      var list = (db.products || []).filter(function (p) { return opts.all ? true : p.active !== false; });
      return clone(list);
    },
    product: function (id) { var p = (db.products || []).filter(function (x) { return x.id === id; })[0]; return p ? clone(p) : null; },
    upsertProduct: function (p) {
      var i = (db.products || []).findIndex(function (x) { return x.id === p.id; });
      if (i > -1) db.products[i] = p; else db.products.unshift(p);
      return this.save().then(function () { return p; });
    },
    deleteProduct: function (id) { db.products = db.products.filter(function (x) { return x.id !== id; }); return this.save(); },

    categories: function () { return clone(db.categories || []); },
    categoryName: function (id) { var c = (db.categories || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; },
    occasions: function () { return clone(db.occasions || []); },
    occasionName: function (id) { var o = (db.occasions || []).filter(function (x) { return x.id === id; })[0]; return o ? o.name : id; },
    hero: function () { return clone(db.hero || []); },
    testimonials: function () { return clone(db.testimonials || []); },
    faqs: function () { return clone(db.faqs || []); },
    blog: function () { return clone(db.blog || []); },
    post: function (slug) { var p = (db.blog || []).filter(function (x) { return x.slug === slug; })[0]; return p ? clone(p) : null; },
    coupons: function () { return clone(db.coupons || []); },

    /* ---------- Money ---------- */
    money: function (n) {
      var s = db.settings.currency || '₹';
      return s + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    },
    discountPct: function (p) { return p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0; },

    /* ---------- Cart (per-device — stays in localStorage) ---------- */
    cart: function () { return read(K.cart, []); },
    cartCount: function () { return this.cart().reduce(function (a, i) { return a + i.qty; }, 0); },
    _saveCart: function (c) { write(K.cart, c); emit('cart', c); },
    addToCart: function (id, qty, variant) {
      var p = this.product(id); if (!p) return false;
      qty = Math.max(1, qty || 1);
      var key = id + '|' + (variant || '');
      var c = this.cart();
      var line = c.filter(function (x) { return x.key === key; })[0];
      if (line) line.qty = Math.min(99, line.qty + qty);
      else c.push({ key: key, id: id, qty: qty, variant: variant || '', name: p.name, price: p.price, mrp: p.mrp, image: p.images[0] });
      this._saveCart(c); return true;
    },
    setQty: function (key, qty) {
      var c = this.cart();
      c.forEach(function (x) { if (x.key === key) x.qty = Math.max(1, Math.min(99, qty)); });
      this._saveCart(c);
    },
    removeFromCart: function (key) { this._saveCart(this.cart().filter(function (x) { return x.key !== key; })); },
    clearCart: function () { this._saveCart([]); },

    /* ---------- Wishlist (localStorage for guests, synced to `wishlists` when signed in) ---------- */
    wishlist: function () { return (wishCache || read(K.wish, [])).slice(); },
    inWishlist: function (id) { return this.wishlist().indexOf(id) > -1; },
    toggleWishlist: function (id) {
      var wl = this.wishlist(), i = wl.indexOf(id), added;
      if (i > -1) { wl.splice(i, 1); added = false; } else { wl.push(id); added = true; }
      wishCache = wl; write(K.wish, wl); emit('wish', wl);
      if (session) {
        var q = added
          ? sb.from('wishlists').upsert({ user_id: session.user.id, product_id: id })
          : sb.from('wishlists').delete().eq('user_id', session.user.id).eq('product_id', id);
        q.then(function (res) { if (res.error) console.error('Wishlist sync failed', res.error); });
      }
      return added;
    },

    /* ---------- Recently viewed (per-device) ---------- */
    pushRecent: function (id) {
      var r = read(K.recent, []).filter(function (x) { return x !== id; });
      r.unshift(id); write(K.recent, r.slice(0, 8));
    },
    recent: function () { return read(K.recent, []); },

    /* ---------- Coupons + totals ---------- */
    findCoupon: function (code) {
      code = (code || '').trim().toUpperCase();
      return (db.coupons || []).filter(function (c) { return c.active !== false && c.code.toUpperCase() === code; })[0] || null;
    },
    totals: function (couponCode, payMethod) {
      var s = db.settings, cart = this.cart();
      var sub = cart.reduce(function (a, i) { return a + i.price * i.qty; }, 0);
      var mrpSub = cart.reduce(function (a, i) { return a + (i.mrp || i.price) * i.qty; }, 0);
      var discount = 0, shipFree = false, coupon = null, err = '';
      if (couponCode) {
        coupon = this.findCoupon(couponCode);
        if (!coupon) err = 'That code is not valid.';
        else if (sub < (coupon.min || 0)) { err = 'Valid on orders above ' + this.money(coupon.min); coupon = null; }
        else if (coupon.type === 'percent') discount = Math.round(sub * coupon.value / 100);
        else if (coupon.type === 'flat') discount = Math.min(coupon.value, sub);
        else if (coupon.type === 'shipping') shipFree = true;
      }
      var afterDisc = sub - discount;
      var ship = (afterDisc >= (s.freeShipThreshold || 0) || shipFree || sub === 0) ? 0 : (s.shippingFlat || 0);
      var cod = payMethod === 'cod' ? (s.codFee || 0) : 0;
      var tax = Math.round(afterDisc * ((s.taxRate || 0) / 100));
      return {
        items: cart.reduce(function (a, i) { return a + i.qty; }, 0),
        sub: sub, mrpSub: mrpSub, saved: (mrpSub - sub) + discount,
        discount: discount, shipping: ship, cod: cod, tax: tax,
        total: Math.max(0, afterDisc + ship + cod + tax),
        coupon: coupon, couponError: err,
        toFreeShip: Math.max(0, (s.freeShipThreshold || 0) - afterDisc)
      };
    },

    /* ---------- Orders (Tier 2 — async, fetched on demand only) ---------- */
    /* Placing an order requires a signed-in account — enforced here (a
       clear error instead of a confusing RLS failure) and, for real, at
       the database level (no anon INSERT policy on orders at all; see
       schema.sql). initCheckout in pages.js redirects to account.html
       before this could ever be called without a session, but this guard
       stays regardless of what any particular caller does. */
    /* Direct-insert path: COD (payment confirmed on delivery), and prepaid
       orders while Razorpay isn't switched on yet (paid via a manual
       WhatsApp/UPI link instead — see initCheckout in pages.js). Once
       Razorpay is live, prepaid orders go through createRazorpayOrder()
       below instead, since those need a verified payment before they're real. */
    createOrder: function (payload) {
      if (!session) return Promise.reject(new Error('Please sign in to place an order.'));
      var id = (db.settings.orderPrefix || 'TM') + Date.now().toString().slice(-8);
      var row = Object.assign({}, payload, {
        id: id, status: 'placed', payment_status: payload.payment === 'cod' ? 'cod' : 'pending',
        created_at: new Date().toISOString(),
        user_id: session.user.id
      });
      /* no .select() here on purpose: neither anon nor a customer has a SELECT
         policy that covers a row the instant after insert in every case (RLS
         evaluates RETURNING like a SELECT), so asking Postgres to hand the row
         back would risk failing even though the insert itself is fine. We
         already know exactly what we just inserted — just return it. */
      return sb.from('orders').insert(row).then(function (res) {
        if (res.error) throw res.error;
        return row;
      });
    },
    /* Prepaid checkout. The Edge Function creates both the Razorpay order
       and the Memora order row (payment_status:'pending') using the secret
       key — something that can only ever happen server-side. Returns the
       Razorpay order id to open the Checkout.js widget with. */
    createRazorpayOrder: function (payload) {
      if (!session) return Promise.reject(new Error('Please sign in to place an order.'));
      var id = (db.settings.orderPrefix || 'TM') + Date.now().toString().slice(-8);
      var row = Object.assign({}, payload, { id: id, user_id: session.user.id });
      return sb.functions.invoke('create-razorpay-order', { body: row }).then(function (res) {
        if (res.error) throw res.error;
        if (res.data && res.data.error) throw new Error(res.data.error);
        return res.data;
      });
    },
    /* Called from the Checkout.js success handler with the three values
       Razorpay hands back — the Edge Function is the only place that can
       actually confirm they're genuine (recomputes the signature with the
       secret key), then flips payment_status to 'paid'. */
    verifyRazorpayPayment: function (data) {
      return sb.functions.invoke('verify-razorpay-payment', { body: data }).then(function (res) {
        if (res.error) throw res.error;
        if (res.data && res.data.error) throw new Error(res.data.error);
        return res.data.order;
      });
    },
    getOrder: function (id) {
      return sb.rpc('get_order_by_id', { order_id: String(id || '').trim().toUpperCase() }).then(function (res) {
        if (res.error) throw res.error;
        return (res.data && res.data[0]) || null;
      });
    },
    /* the signed-in customer's own order history (orders_customer_read RLS policy) */
    getMyOrders: function () {
      if (!session) return Promise.resolve([]);
      return sb.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    /* every order, admin only (orders_admin_read RLS policy) */
    listOrders: function () {
      return sb.from('orders').select('*').order('created_at', { ascending: false }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    updateOrder: function (id, patch) {
      return sb.from('orders').update(patch).eq('id', id).then(function (res) { return !res.error; });
    },
    deleteOrder: function (id) {
      return sb.from('orders').delete().eq('id', id).then(function (res) { return !res.error; });
    },
    /* past guest orders (user_id null) that match the signed-in customer's
       own verified email — see find_my_guest_orders()/claim_guest_order()
       in schema.sql for why this can't be spoofed with someone else's email */
    findMyGuestOrders: function () {
      if (!session) return Promise.resolve([]);
      return sb.rpc('find_my_guest_orders').then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    claimGuestOrder: function (id) {
      return sb.rpc('claim_guest_order', { order_id: id }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },

    /* ---------- Leads: contact / corporate forms + newsletter ---------- */
    submitLead: function (kind, payload) {
      return sb.from('leads').insert({ kind: kind, payload: payload }).then(function (res) { return !res.error; });
    },
    listLeads: function () {
      return sb.from('leads').select('*').order('created_at', { ascending: false }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    deleteLead: function (id) {
      return sb.from('leads').delete().eq('id', id).then(function (res) { return !res.error; });
    },

    /* ---------- Auth (Supabase Auth — real sessions; used by both the admin panel and customer accounts) ---------- */
    getSession: function () {
      return sb.auth.getSession().then(function (res) { return res.data.session; });
    },
    /* fires 'PASSWORD_RECOVERY' when the visitor lands via a reset-password
       email link — account.html listens for this to show a "set new
       password" form instead of the usual sign-in/dashboard views */
    onAuthEvent: function (cb) {
      authEventLog.forEach(function (event) { cb(event); }); // replay anything already seen before this subscriber existed
      authEventListeners.push(cb);
    },
    /* true admin check — a session alone no longer implies admin now that
       customer sign-ups are enabled. Backed by the is_admin() RPC, which
       checks the admin_users allowlist server-side (the real gate is the
       RLS policies that call the same function; this is for UI/UX). */
    isCurrentUserAdmin: function () {
      if (!session) return Promise.resolve(false);
      return sb.rpc('is_admin', { uid: session.user.id }).then(function (res) {
        return !res.error && res.data === true;
      });
    },
    login: function (email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) return false;
        return this.initSession().then(function () { return true; });
      }.bind(this));
    },
    signUp: function (name, email, password) {
      return sb.auth.signUp({ email: email, password: password, options: { data: { name: name } } }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    logout: function () {
      return sb.auth.signOut().then(function () {
        session = null; wishCache = read(K.wish, []); emit('wish', wishCache);
      });
    },
    changePassword: function (password) {
      return sb.auth.updateUser({ password: password }).then(function (res) { return !res.error; });
    },
    /* sends a reset-password email; the link lands back on account.html,
       which detects the recovery session and shows a "set new password" form */
    requestPasswordReset: function (email) {
      return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/account.html' }).then(function (res) {
        return !res.error;
      });
    },
    /* saved checkout address — lives on the auth user itself (user_metadata),
       so it needs no table or RLS policy of its own: the Auth API already
       scopes it to "only the owning user can read/write their own." */
    getProfile: function () {
      return (session && session.user.user_metadata) || {};
    },
    updateProfile: function (profile) {
      return sb.auth.updateUser({ data: profile }).then(function (res) {
        if (res.error) throw res.error;
        session = session ? Object.assign({}, session, { user: res.data.user }) : session;
        return res.data.user.user_metadata;
      });
    },

    /* ---------- Import / export (point-in-time backups of the live catalogue) ---------- */
    exportJSON: function () { return JSON.stringify(db, null, 1); },
    exportDataJS: function () {
      return '/* THE MEMORA — catalogue backup, generated from the admin panel on ' + new Date().toLocaleString('en-IN') + '.\n' +
        '   This is a point-in-time snapshot for safekeeping — it is not loaded by the live site,\n' +
        '   which reads its content straight from Supabase. Restore via Admin -> Backup & publish. */\n' +
        'window.MEMORA_BACKUP = ' + JSON.stringify(db, null, 1) + ';\n';
    },
    importJSON: function (txt) {
      var o = JSON.parse(txt);
      if (!o || !o.products) throw new Error('Not a valid Memora backup file.');
      db = o;
      return this.save();
    },

    /* ---------- Search ---------- */
    search: function (q) {
      q = (q || '').toLowerCase().trim(); if (!q) return [];
      return this.products().filter(function (p) {
        return (p.name + ' ' + p.short + ' ' + p.category + ' ' + (p.occasions || []).join(' ')).toLowerCase().indexOf(q) > -1;
      }).slice(0, 8);
    },

    /* ---------- WhatsApp order message ---------- */
    waLink: function (text) {
      return 'https://wa.me/' + (db.settings.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
    },
    orderMessage: function (o) {
      var L = ['*New order — The Memora*', 'Order: ' + o.id, ''];
      o.items.forEach(function (i) { L.push('• ' + i.name + (i.variant ? ' (' + i.variant + ')' : '') + ' × ' + i.qty + ' — ' + Store.money(i.price * i.qty)); });
      L.push('', 'Subtotal: ' + this.money(o.totals.sub));
      if (o.totals.discount) L.push('Discount (' + (o.coupon || '') + '): -' + this.money(o.totals.discount));
      L.push('Shipping: ' + (o.totals.shipping ? this.money(o.totals.shipping) : 'Free'));
      if (o.totals.cod) L.push('COD fee: ' + this.money(o.totals.cod));
      L.push('*Total: ' + this.money(o.totals.total) + '*', '', 'Payment: ' + (o.payment === 'cod' ? 'Cash on delivery' : 'Prepaid / UPI'));
      L.push('', '*Deliver to*', o.customer.name, o.customer.phone, o.customer.address, o.customer.city + ' ' + o.customer.pincode + ', ' + o.customer.state);
      if (o.gift) L.push('', 'Gift order — no invoice inside.');
      if (o.note) L.push('Message on card: "' + o.note + '"');
      return L.join('\n');
    }
  };

  w.Store = Store;
})(window);
