/* ============================================================
   THE MEMORA — Shared UI behaviour
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  window.$ = $; window.$$ = $$;

  /* ---------- Icons ---------- */
  var ICON = {
    cart: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24" style="stroke:currentColor;fill:none;stroke-width:1.6;width:18px;height:18px"><path d="M12 19V6M6 12l6-6 6 6"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.1-.7.2-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4a3.4 3.4 0 0 0-1 2.5A5.8 5.8 0 0 0 7.3 13c.2.2 2.1 3.2 5.1 4.5a17 17 0 0 0 1.7.6 4 4 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/></svg>'
  };

  /* ---------- Toasts ---------- */
  var toastWrap;
  function toast(msg, type) {
    if (!toastWrap) { toastWrap = document.createElement('div'); toastWrap.className = 'toast-wrap'; document.body.appendChild(toastWrap); }
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span style="color:var(--gold)">' + (type === 'err' ? '!' : '✓') + '</span><span>' + msg + '</span>';
    toastWrap.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 380); }, 2600);
  }
  window.toast = toast;

  /* ---------- Reveal on scroll ---------- */
  function initReveal(root) {
    var els = $$('[data-rev],.stagger', root || document).filter(function (e) { return !e.__rev; });
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { e.__rev = 1; io.observe(e); });
  }
  window.initReveal = initReveal;

  /* ---------- Count-up ---------- */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      if (el.__c) return; el.__c = 1;
      var target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
      var io = new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return; io.disconnect();
        var start = performance.now(), dur = 1500;
        (function step(now) {
          var p = Math.min(1, (now - start) / dur), e2 = 1 - Math.pow(1 - p, 3);
          var v = target * e2;
          el.textContent = (target % 1 ? v.toFixed(1) : Math.round(v).toLocaleString('en-IN')) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(start);
      }, { threshold: .4 });
      io.observe(el);
    });
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var hdr = $('.site-header'); if (!hdr) return;
    var last = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      hdr.classList.toggle('scrolled', y > 20);
      if (y > 320 && y > last + 4) hdr.classList.add('hidden-up');
      else if (y < last - 4 || y < 320) hdr.classList.remove('hidden-up');
      last = y;
      var tt = $('.to-top'); if (tt) tt.classList.toggle('show', y > 700);
    }, { passive: true });

    var burger = $('.burger'), mnav = $('.mnav'), ov = $('.overlay');
    function closeAll() {
      if (burger) burger.classList.remove('open');
      if (mnav) mnav.classList.remove('open');
      var cd = $('.cart-drawer'); if (cd) cd.classList.remove('open');
      var sm = $('.search-modal'); if (sm) sm.classList.remove('open');
      if (ov) ov.classList.remove('show');
      document.body.style.overflow = '';
    }
    window.closeAllPanels = closeAll;
    if (burger) burger.addEventListener('click', function () {
      var open = !mnav.classList.contains('open');
      closeAll();
      if (open) { burger.classList.add('open'); mnav.classList.add('open'); ov.classList.add('show'); document.body.style.overflow = 'hidden'; }
    });
    if (ov) ov.addEventListener('click', closeAll);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    /* highlight current page */
    var here = location.pathname.split('/').pop() || 'index.html';
    $$('.nav > li > a, .mnav a').forEach(function (a) {
      if (a.hasAttribute('data-nomatch')) return;
      var href = (a.getAttribute('href') || '').split('?')[0];
      if (href === here) a.classList.add('active');
    });

    /* search */
    var sBtn = $('[data-open-search]'), sm = $('.search-modal');
    if (sBtn && sm) {
      var input = $('#searchInput'), res = $('#searchRes');
      sBtn.addEventListener('click', function () { closeAll(); sm.classList.add('open'); ov.classList.add('show'); setTimeout(function () { input.focus(); }, 120); });
      $$('[data-close-search]').forEach(function (b) { b.addEventListener('click', closeAll); });
      var t;
      input.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          var q = input.value, r = S.search(q);
          if (!q.trim()) { res.innerHTML = '<p style="font-size:.84rem;padding:8px">Try “anniversary”, “rakhi”, “necklace”…</p>'; return; }
          res.innerHTML = r.length ? r.map(function (p) {
            return '<a href="product.html?id=' + p.id + '"><img src="' + p.images[0] + '" alt="' + p.name + '" loading="lazy"><span><b style="display:block;font-size:.9rem;font-weight:500">' + p.name + '</b><small style="color:var(--muted)">' + S.categoryName(p.category) + ' · ' + S.money(p.price) + '</small></span></a>';
          }).join('') : '<p style="font-size:.86rem;padding:10px">No matches. <a href="shop.html" style="color:var(--gold-deep)">Browse everything →</a></p>';
        }, 140);
      });
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); sBtn.click(); }
      });
    }
  }

  /* ---------- Cart drawer ---------- */
  function renderCartDrawer() {
    var box = $('#cartItems'); if (!box) return;
    var cart = S.cart(), t = S.totals();
    if (!cart.length) {
      box.innerHTML = '<div class="empty" style="padding:50px 0">' + '<svg viewBox="0 0 24 24" style="stroke:var(--line-gold);fill:none;stroke-width:1;width:52px;height:52px;margin:0 auto 14px"><path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>' +
        '<p style="font-size:.92rem">Your box is empty.</p><a href="shop.html" class="btn btn-sm" style="margin-top:16px">Start shopping</a></div>';
    } else {
      box.innerHTML = cart.map(function (i) {
        return '<div class="ci"><img src="' + i.image + '" alt="" loading="lazy">' +
          '<div><h5><a href="product.html?id=' + i.id + '">' + i.name + '</a></h5>' +
          (i.variant ? '<small style="color:var(--muted);font-size:.74rem">' + i.variant + '</small>' : '') +
          '<div class="p">' + S.money(i.price) + '</div>' +
          '<div class="qty"><button data-q="-" data-k="' + i.key + '" aria-label="Decrease">−</button><span>' + i.qty + '</span><button data-q="+" data-k="' + i.key + '" aria-label="Increase">+</button></div></div>' +
          '<button class="ci-x" data-rm="' + i.key + '" aria-label="Remove" style="transition:.3s">×</button></div>';
      }).join('');
    }
    var fs = $('#drawerFree');
    if (fs) {
      var thr = S.settings().freeShipThreshold || 0;
      var pct = thr ? Math.min(100, Math.round(t.sub / thr * 100)) : 100;
      fs.innerHTML = t.toFreeShip > 0
        ? 'Add <b>' + S.money(t.toFreeShip) + '</b> more for free shipping.<div class="bar"><i style="width:' + pct + '%"></i></div>'
        : '<b style="color:var(--success)">✓ You’ve unlocked free shipping.</b><div class="bar"><i style="width:100%"></i></div>';
    }
    var st = $('#drawerTotal'); if (st) st.textContent = S.money(t.sub);
    var cta = $('#drawerCTA'); if (cta) cta.classList.toggle('is-disabled', !cart.length);
  }

  function initCart() {
    var open = $('[data-open-cart]'), drawer = $('.cart-drawer'), ov = $('.overlay');
    if (open && drawer) {
      open.addEventListener('click', function () {
        window.closeAllPanels(); drawer.classList.add('open'); ov.classList.add('show'); document.body.style.overflow = 'hidden';
      });
      $$('[data-close-cart]').forEach(function (b) { b.addEventListener('click', window.closeAllPanels); });
      drawer.addEventListener('click', function (e) {
        var q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
        if (q) { var line = S.cart().filter(function (x) { return x.key === q.dataset.k; })[0]; if (line) S.setQty(q.dataset.k, line.qty + (q.dataset.q === '+' ? 1 : -1)); }
        if (rm) { S.removeFromCart(rm.dataset.rm); toast('Removed from your box'); }
      });
    }
    updateBadges(true);
    renderCartDrawer();
    document.addEventListener('memora:cart', function () { updateBadges(); renderCartDrawer(); });
    document.addEventListener('memora:wish', function () { updateBadges(); });
  }

  function updateBadges(silent) {
    var c = S.cartCount(), wl = S.wishlist().length;
    $$('[data-cart-count]').forEach(function (b) {
      b.textContent = c; b.classList.toggle('show', c > 0);
      if (!silent && c > 0) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    });
    $$('[data-wish-count]').forEach(function (b) { b.textContent = wl; b.classList.toggle('show', wl > 0); });
  }
  window.updateBadges = updateBadges;

  /* ---------- Product card ---------- */
  function card(p, opts) {
    opts = opts || {};
    var d = S.discountPct(p), out = p.stock <= 0;
    var tags = '';
    if (out) tags += '<span class="tag out">Sold out</span>';
    else {
      if (p.badge === 'bestseller') tags += '<span class="tag">Bestseller</span>';
      if (p.badge === 'new') tags += '<span class="tag new">New in</span>';
      if (p.badge === 'premium') tags += '<span class="tag">Premium</span>';
      if (p.badge === 'seasonal') tags += '<span class="tag new">Seasonal</span>';
      if (d > 0) tags += '<span class="tag sale">' + d + '% off</span>';
    }
    var fav = S.inWishlist(p.id) ? ' on' : '';
    return '<article class="card" data-id="' + p.id + '">' +
      '<div class="card-media">' +
        '<a href="product.html?id=' + p.id + '" aria-label="' + p.name + '">' +
          '<img class="main" src="' + p.images[0] + '" alt="' + p.name + '" loading="lazy" width="800" height="1000">' +
          '<img class="alt" src="' + (p.images[1] || p.images[0]) + '" alt="" loading="lazy" aria-hidden="true">' +
        '</a>' +
        '<div class="card-tags">' + tags + '</div>' +
        '<button class="card-fav' + fav + '" data-fav="' + p.id + '" aria-label="Save to wishlist">' + ICON.heart + '</button>' +
        '<div class="card-quick">' +
          (out ? '<button class="btn btn-ghost is-disabled">Sold out</button>'
               : '<button class="btn btn-gold" data-add="' + p.id + '">Add to box</button>') +
        '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<span class="card-cat">' + S.categoryName(p.category) + '</span>' +
        '<h3><a href="product.html?id=' + p.id + '">' + p.name + '</a></h3>' +
        '<div class="stars">' + '★'.repeat(Math.round(p.rating)) + '<small>' + p.rating.toFixed(1) + ' (' + p.reviews + ')</small></div>' +
        '<div class="price" style="margin-top:8px"><b>' + S.money(p.price) + '</b>' +
        (d > 0 ? '<s>' + S.money(p.mrp) + '</s><em>Save ' + S.money(p.mrp - p.price) + '</em>' : '') + '</div>' +
      '</div></article>';
  }
  window.productCard = card;
  window.renderGrid = function (el, list, opts) {
    if (!el) return;
    el.innerHTML = list.map(function (p) { return card(p, opts); }).join('');
    initReveal(el);
  };

  /* delegated add / fav */
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      S.addToCart(add.dataset.add, 1, add.dataset.variant || '');
      toast('Added to your box');
      var d = $('.cart-drawer'), ov = $('.overlay');
      if (d && !add.dataset.noopen) { window.closeAllPanels(); d.classList.add('open'); ov.classList.add('show'); document.body.style.overflow = 'hidden'; }
    }
    var fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      var on = S.toggleWishlist(fav.dataset.fav);
      fav.classList.toggle('on', on);
      toast(on ? 'Saved to wishlist' : 'Removed from wishlist');
      $$('[data-fav="' + fav.dataset.fav + '"]').forEach(function (b) { b.classList.toggle('on', on); });
    }
  });

  /* ---------- Accordions ---------- */
  function initAcc() {
    $$('.acc').forEach(function (a) {
      if (a.__a) return; a.__a = 1;
      var btn = $('button', a), panel = $('.panel', a);
      btn.addEventListener('click', function () {
        var open = a.classList.contains('open');
        var group = a.closest('[data-acc-group]');
        if (group && !open) $$('.acc.open', group).forEach(function (o) { o.classList.remove('open'); $('.panel', o).style.height = '0px'; });
        a.classList.toggle('open', !open);
        panel.style.height = open ? '0px' : panel.scrollHeight + 'px';
      });
    });
  }
  window.initAcc = initAcc;

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$('.tabs').forEach(function (t) {
      if (t.__t) return; t.__t = 1;
      t.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-tab]'); if (!b) return;
        $$('button', t).forEach(function (x) { x.classList.toggle('on', x === b); });
        var scope = t.parentElement;
        $$('.tabpanel', scope).forEach(function (p) { p.classList.toggle('on', p.dataset.panel === b.dataset.tab); });
      });
    });
  }
  window.initTabs = initTabs;

  /* ---------- Hydrate settings-driven bits ---------- */
  function hydrate() {
    var s = S.settings();
    var m = $('#marquee');
    if (m) {
      var items = (s.announcements || []).map(function (a) { return '<span>' + a + '</span>'; }).join('');
      m.innerHTML = items + items;
    }
    $$('[data-s]').forEach(function (el) {
      var v = s[el.dataset.s]; if (v == null) return;
      if (el.tagName === 'A') { el.href = (el.dataset.href || '') + v; el.textContent = el.dataset.keepText ? el.textContent : v; }
      else el.textContent = v;
    });
    $$('[data-wa]').forEach(function (a) { a.href = S.waLink(a.dataset.wa || ('Hi ' + s.brand + '! I would like to know more about your gift boxes.')); });
    $$('[data-mail]').forEach(function (a) { a.href = 'mailto:' + s.email; });
    $$('[data-tel]').forEach(function (a) { a.href = 'tel:' + (s.phone || '').replace(/\s/g, ''); });
    $$('[data-social="instagram"]').forEach(function (a) { a.href = s.instagram || '#'; });
    $$('[data-social="facebook"]').forEach(function (a) { a.href = s.facebook || '#'; });
    $$('[data-social="pinterest"]').forEach(function (a) { a.href = s.pinterest || '#'; });
    $$('[data-social="youtube"]').forEach(function (a) { a.href = s.youtube || '#'; });
    $$('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });
    $$('[data-freeship]').forEach(function (e) { e.textContent = S.money(s.freeShipThreshold); });
  }

  /* ---------- Newsletter ---------- */
  function initNews() {
    $$('form[data-news]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var i = $('input', f);
        if (!/^\S+@\S+\.\S+$/.test(i.value)) { toast('Please enter a valid email', 'err'); return; }
        S.submitLead('newsletter', { email: i.value }).catch(function () {});
        i.value = ''; toast('You’re on the list — 10% off code sent.');
      });
    });
  }

  /* ---------- To top ---------- */
  function initTop() {
    var b = $('.to-top'); if (b) b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- WhatsApp quick-reply chat ---------- */
  function initChat() {
    var fab = $('.fab-wa'); if (!fab || fab.__chat) return; fab.__chat = 1;
    var topics = [
      ['Track an order', 'Hi! I need help tracking my order.'],
      ['Corporate gifting', 'Hi! I am interested in corporate gifting.'],
      ['Something else', '']
    ];
    var panel;
    function close() { if (panel) { panel.remove(); panel = null; } }
    fab.addEventListener('click', function (e) {
      e.preventDefault();
      if (panel) { close(); return; }
      var s = S.settings();
      panel = document.createElement('div');
      panel.className = 'wa-panel';
      panel.innerHTML = '<p>Hi! What brings you here today?</p>' +
        topics.map(function (t, i) { return '<button data-wa-topic="' + i + '">' + t[0] + '</button>'; }).join('');
      document.body.appendChild(panel);
      panel.addEventListener('click', function (e2) {
        var b = e2.target.closest('[data-wa-topic]'); if (!b) return;
        var msg = topics[+b.dataset.waTopic][1] || ('Hi ' + s.brand + '! I would like to know more about your gift boxes.');
        window.open(S.waLink(msg), '_blank', 'noopener');
        close();
      });
      setTimeout(function () {
        document.addEventListener('click', function outside(e3) {
          if (!panel) { document.removeEventListener('click', outside); return; }
          if (!panel.contains(e3.target) && !fab.contains(e3.target)) { close(); document.removeEventListener('click', outside); }
        });
      }, 0);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    Promise.all([S.ready(), S.initSession()]).then(function () {
      hydrate(); initHeader(); initCart(); initReveal(); initAcc(); initTabs(); initCounters(); initNews(); initTop(); initChat();
      document.body.classList.add('page-fade');
      if (typeof window.pageInit === 'function') window.pageInit();
    }).catch(function (err) {
      console.error('Could not load site content from Supabase:', err);
      document.body.innerHTML = '<div style="max-width:520px;margin:80px auto;padding:24px;font-family:sans-serif;text-align:center">' +
        '<h1 style="font-size:1.2rem">The site could not load its content.</h1>' +
        '<p style="color:#777;margin-top:10px">' + (err && err.message ? err.message : 'Check assets/js/config.js and your Supabase project.') + '</p></div>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
