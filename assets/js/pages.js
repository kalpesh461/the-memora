/* ============================================================
   THE MEMORA — Page controllers
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store;
  var qs = function (k) { return new URLSearchParams(location.search).get(k); };

  /* =========================================================
     HOME
     ========================================================= */
  window.initHome = function () {
    /* hero slider */
    var hero = document.querySelector('.hero');
    if (hero) {
      var slides = S.hero();
      hero.innerHTML = slides.map(function (h, i) {
        return '<div class="hero-slide' + (i === 0 ? ' active' : '') + '">' +
          '<div class="hero-bg"><img src="' + h.image + '" alt="" ' + (i ? 'loading="lazy"' : 'fetchpriority="high"') + '></div>' +
          '<div class="wrap"><div class="hero-inner">' +
            '<span class="eyebrow" style="color:var(--gold-light)">' + h.eyebrow + '</span>' +
            '<h1>' + h.title + '</h1><p>' + h.sub + '</p>' +
            '<div class="hero-cta"><a href="' + h.link + '" class="btn btn-gold btn-lg">' + h.cta + '</a>' +
            '<a href="' + h.link2 + '" class="btn btn-ghost on-dark btn-lg">' + h.cta2 + '</a></div>' +
          '</div></div></div>';
      }).join('') +
      '<div class="hero-dots">' + slides.map(function (_, i) { return '<button data-hd="' + i + '" class="' + (i ? '' : 'on') + '" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('') + '</div>' +
      '<div class="scroll-hint"><span>Scroll</span><i></i></div>';

      var idx = 0, timer;
      function go(n) {
        idx = (n + slides.length) % slides.length;
        document.querySelectorAll('.hero-slide').forEach(function (s, i) { s.classList.toggle('active', i === idx); });
        document.querySelectorAll('[data-hd]').forEach(function (b, i) { b.classList.toggle('on', i === idx); });
      }
      function play() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 6500); }
      hero.addEventListener('click', function (e) { var d = e.target.closest('[data-hd]'); if (d) { go(+d.dataset.hd); play(); } });
      play();
    }

    /* categories */
    var cg = document.getElementById('catGrid');
    if (cg) {
      cg.innerHTML = S.categories().map(function (c, i) {
        return '<a class="cat-tile" href="shop.html?category=' + c.id + '" data-rev="zoom" style="--d:' + (i * .06) + 's">' +
          '<img src="' + c.image + '" alt="' + c.name + '" loading="lazy">' +
          '<div class="ct"><h3>' + c.name + '</h3><p style="color:rgba(247,243,233,.72);font-size:.86rem;margin-top:4px">' + c.tag + '</p><span>Shop now →</span></div></a>';
      }).join('');
    }

    /* occasion chips */
    var oc = document.getElementById('occChips');
    if (oc) oc.innerHTML = S.occasions().map(function (o) { return '<a class="chip" href="shop.html?occasion=' + o.id + '">' + o.name + '</a>'; }).join('');

    /* bestsellers + new in */
    var all = S.products();
    window.renderGrid(document.getElementById('bestGrid'), all.filter(function (p) { return p.badge === 'bestseller'; }).slice(0, 4));
    window.renderGrid(document.getElementById('newGrid'), all.filter(function (p) { return p.badge === 'new' || p.featured; }).slice(0, 4));

    /* testimonials */
    var tg = document.getElementById('testiGrid');
    if (tg) tg.innerHTML = S.testimonials().slice(0, 3).map(function (t, i) {
      return '<div class="tcard" data-rev style="--d:' + (i * .08) + 's"><div class="stars">' + '★'.repeat(t.rating) + '</div>' +
        '<q>“' + t.text + '”</q><div class="who"><span class="av">' + t.name.charAt(0) + '</span><div><b>' + t.name + '</b><small>' + t.city + ' · Verified buyer</small></div></div></div>';
    }).join('');

    /* faq preview */
    var fq = document.getElementById('faqPreview');
    if (fq) fq.innerHTML = S.faqs().slice(0, 5).map(function (f) {
      return '<div class="acc"><button><span>' + f.q + '</span><span class="ic">+</span></button><div class="panel"><p>' + f.a + '</p></div></div>';
    }).join('');

    /* journal */
    var jg = document.getElementById('journalGrid');
    if (jg) jg.innerHTML = S.blog().slice(0, 3).map(function (b, i) {
      return '<a class="blog-card" href="blog-post.html?slug=' + b.slug + '" data-rev style="--d:' + (i * .08) + 's">' +
        '<div class="m"><img src="' + b.image + '" alt="' + b.title + '" loading="lazy"></div>' +
        '<div class="b"><span class="card-cat">' + b.category + ' · ' + b.read + '</span><h3>' + b.title + '</h3>' +
        '<p style="font-size:.9rem">' + b.excerpt + '</p></div></a>';
    }).join('');

    window.initAcc(); window.initReveal();
  };

  /* =========================================================
     SHOP
     ========================================================= */
  window.initShop = function () {
    var state = {
      cats: qs('category') ? [qs('category')] : [],
      occs: qs('occasion') ? [qs('occasion')] : [],
      price: qs('price') || 'all',
      sort: qs('sort') || 'featured',
      q: qs('q') || '',
      page: 1, per: 12
    };
    var all = S.products();

    /* build filters */
    var cats = S.categories(), occs = S.occasions();
    document.getElementById('fCats').innerHTML = cats.map(function (c) {
      var n = all.filter(function (p) { return p.category === c.id; }).length;
      return '<label><input type="checkbox" value="' + c.id + '" data-f="cat"' + (state.cats.indexOf(c.id) > -1 ? ' checked' : '') + '>' + c.name + '<span class="cnt">' + n + '</span></label>';
    }).join('');
    document.getElementById('fOccs').innerHTML = occs.map(function (o) {
      var n = all.filter(function (p) { return (p.occasions || []).indexOf(o.id) > -1; }).length;
      return '<label><input type="checkbox" value="' + o.id + '" data-f="occ"' + (state.occs.indexOf(o.id) > -1 ? ' checked' : '') + '>' + o.name + '<span class="cnt">' + n + '</span></label>';
    }).join('');
    var PR = [['all', 'Any price'], ['0-999', 'Under ₹999'], ['1000-1999', '₹1,000 – ₹1,999'], ['2000-3499', '₹2,000 – ₹3,499'], ['3500-99999', '₹3,500 & above']];
    document.getElementById('fPrice').innerHTML = PR.map(function (p) {
      return '<label><input type="radio" name="pr" value="' + p[0] + '" data-f="price"' + (state.price === p[0] ? ' checked' : '') + '>' + p[1] + '</label>';
    }).join('');
    var sortSel = document.getElementById('sortSel'); if (sortSel) sortSel.value = state.sort;
    var sq = document.getElementById('shopQ'); if (sq) sq.value = state.q;

    function apply() {
      var list = all.slice();
      if (state.cats.length) list = list.filter(function (p) { return state.cats.indexOf(p.category) > -1; });
      if (state.occs.length) list = list.filter(function (p) { return (p.occasions || []).some(function (o) { return state.occs.indexOf(o) > -1; }); });
      if (state.price !== 'all') {
        var r = state.price.split('-');
        list = list.filter(function (p) { return p.price >= +r[0] && p.price <= +r[1]; });
      }
      if (state.q.trim()) {
        var q = state.q.toLowerCase();
        list = list.filter(function (p) { return (p.name + ' ' + p.short + ' ' + p.category).toLowerCase().indexOf(q) > -1; });
      }
      var sorters = {
        featured: function (a, b) { return (b.featured === true) - (a.featured === true) || b.rating - a.rating; },
        popular: function (a, b) { return b.reviews - a.reviews; },
        'price-asc': function (a, b) { return a.price - b.price; },
        'price-desc': function (a, b) { return b.price - a.price; },
        rating: function (a, b) { return b.rating - a.rating; },
        'name-asc': function (a, b) { return a.name.localeCompare(b.name); },
        'name-desc': function (a, b) { return b.name.localeCompare(a.name); },
        discount: function (a, b) { return S.discountPct(b) - S.discountPct(a); }
      };
      list.sort(sorters[state.sort] || sorters.featured);
      render(list);
    }

    function render(list) {
      var start = (state.page - 1) * state.per;
      var pageItems = list.slice(start, start + state.per);
      document.getElementById('shopCount').textContent = list.length + ' product' + (list.length === 1 ? '' : 's');
      var grid = document.getElementById('shopGrid');
      if (!list.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3 style="font-family:var(--ff-display)">Nothing matches those filters</h3><p style="margin:10px 0 18px">Try clearing a filter or two.</p><button class="btn btn-sm" onclick="document.getElementById(\'clearF\').click()">Clear all filters</button></div>';
      } else {
        window.renderGrid(grid, pageItems);
      }
      /* active chips */
      var chips = [];
      state.cats.forEach(function (c) { chips.push(['cat', c, S.categoryName(c)]); });
      state.occs.forEach(function (o) { chips.push(['occ', o, S.occasionName(o)]); });
      if (state.price !== 'all') chips.push(['price', state.price, (PR.filter(function (p) { return p[0] === state.price; })[0] || [])[1]]);
      var ac = document.getElementById('activeChips');
      ac.innerHTML = chips.length ? chips.map(function (c) { return '<button class="chip on" data-x="' + c[0] + '" data-v="' + c[1] + '">' + c[2] + ' ✕</button>'; }).join('') + '<button class="chip" id="clearF2">Clear all</button>' : '';

      /* pagination */
      var pages = Math.ceil(list.length / state.per), pg = document.getElementById('pager');
      if (pages <= 1) { pg.innerHTML = ''; return; }
      var html = '<button data-p="' + Math.max(1, state.page - 1) + '">←</button>';
      for (var i = 1; i <= pages; i++) html += '<button data-p="' + i + '" class="' + (i === state.page ? 'on' : '') + '">' + i + '</button>';
      html += '<button data-p="' + Math.min(pages, state.page + 1) + '">→</button>';
      pg.innerHTML = html;
    }

    document.addEventListener('change', function (e) {
      var f = e.target.closest('[data-f]'); if (!f) return;
      var t = f.dataset.f;
      if (t === 'cat' || t === 'occ') {
        var arr = t === 'cat' ? state.cats : state.occs, v = f.value, i = arr.indexOf(v);
        if (f.checked && i < 0) arr.push(v); if (!f.checked && i > -1) arr.splice(i, 1);
      }
      if (t === 'price') state.price = f.value;
      state.page = 1; apply();
    });
    if (sortSel) sortSel.addEventListener('change', function () { state.sort = sortSel.value; state.page = 1; apply(); });
    if (sq) sq.addEventListener('input', function () { state.q = sq.value; state.page = 1; apply(); });
    document.getElementById('pager').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      state.page = +b.dataset.p; apply();
      document.getElementById('shopGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('activeChips').addEventListener('click', function (e) {
      var x = e.target.closest('[data-x]');
      if (x) {
        if (x.dataset.x === 'cat') state.cats = state.cats.filter(function (c) { return c !== x.dataset.v; });
        if (x.dataset.x === 'occ') state.occs = state.occs.filter(function (c) { return c !== x.dataset.v; });
        if (x.dataset.x === 'price') state.price = 'all';
        syncInputs(); state.page = 1; apply();
      }
      if (e.target.id === 'clearF2') document.getElementById('clearF').click();
    });
    document.getElementById('clearF').addEventListener('click', function () {
      state.cats = []; state.occs = []; state.price = 'all'; state.q = ''; state.page = 1;
      if (sq) sq.value = ''; syncInputs(); apply();
    });
    function syncInputs() {
      document.querySelectorAll('[data-f="cat"]').forEach(function (i) { i.checked = state.cats.indexOf(i.value) > -1; });
      document.querySelectorAll('[data-f="occ"]').forEach(function (i) { i.checked = state.occs.indexOf(i.value) > -1; });
      document.querySelectorAll('[data-f="price"]').forEach(function (i) { i.checked = i.value === state.price; });
    }
    var fToggle = document.getElementById('filterToggle');
    if (fToggle) fToggle.addEventListener('click', function () { document.querySelector('.filters').classList.toggle('open'); });

    /* heading from query */
    if (qs('category')) {
      document.getElementById('shopTitle').textContent = S.categoryName(qs('category'));
      var c = S.categories().filter(function (x) { return x.id === qs('category'); })[0];
      if (c) document.getElementById('shopSub').textContent = c.tag;
    } else if (qs('occasion')) {
      document.getElementById('shopTitle').textContent = 'Gifts for ' + S.occasionName(qs('occasion'));
      document.getElementById('shopSub').textContent = 'Hand-picked for the occasion, ready to wrap.';
    }
    apply();
  };

  /* =========================================================
     PRODUCT
     ========================================================= */
  window.initProduct = function () {
    var id = qs('id'), p = S.product(id);
    if (!p) { location.replace('shop.html'); return; }
    S.pushRecent(p.id);
    document.title = p.name + ' — ' + S.settings().brand;
    var d = S.discountPct(p), out = p.stock <= 0;

    document.getElementById('pCrumbs').innerHTML =
      '<a href="index.html">Home</a><i>/</i><a href="shop.html">Shop</a><i>/</i><a href="shop.html?category=' + p.category + '">' + S.categoryName(p.category) + '</a><i>/</i><span>' + p.name + '</span>';

    document.getElementById('pGallery').innerHTML =
      '<div class="gal-main" id="galMain"><img src="' + p.images[0] + '" alt="' + p.name + '" width="800" height="1000" fetchpriority="high"></div>' +
      '<div class="gal-thumbs">' + p.images.map(function (im, i) {
        return '<button data-g="' + i + '" class="' + (i ? '' : 'on') + '"><img src="' + im + '" alt="" loading="lazy"></button>';
      }).join('') + '</div>';

    var variant = p.colors && p.colors.length ? p.colors[0] : '';
    var colorMap = { Gold: '#C9A961', 'Rose Gold': '#D9A88C', Silver: '#C7CBC9', Olive: '#4A5A38', Forest: '#2C3A22', Ivory: '#F2ECDD', Blush: '#E7C9C2', Sage: '#A9B79A', Cream: '#EFE7D6', Maroon: '#7A2E2E', Black: '#22251F', Oak: '#C8A87B', Walnut: '#7A5638', Amber: '#C98A3E', Clear: '#E9EDEA', Cocoa: '#6B4A32', 'Deep Green': '#22301A', Mixed: 'linear-gradient(135deg,#C9A961,#C7CBC9)' };

    document.getElementById('pInfo').innerHTML =
      '<span class="card-cat">' + S.categoryName(p.category) + '</span>' +
      '<h1>' + p.name + '</h1>' +
      '<div class="stars" style="margin-bottom:6px">' + '★'.repeat(Math.round(p.rating)) + '<small>' + p.rating.toFixed(1) + ' · ' + p.reviews + ' reviews</small></div>' +
      '<p class="lead" style="font-size:1rem">' + p.short + '</p>' +
      '<div class="pdp-price"><b>' + S.money(p.price) + '</b>' + (d ? '<s>' + S.money(p.mrp) + '</s><em>' + d + '% off</em>' : '') + '</div>' +
      '<p style="font-size:.8rem;color:var(--muted);margin-top:-8px">Inclusive of all taxes · ' + (out ? '<span style="color:var(--danger)">Currently sold out</span>' : (p.stock < 20 ? '<span style="color:var(--danger)">Only ' + p.stock + ' left</span>' : '<span style="color:var(--success)">In stock</span>')) + '</p>' +
      (p.colors && p.colors.length > 1 ? '<div style="margin-top:22px"><h4 style="font-family:var(--ff-body);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Finish: <span id="swName" style="color:var(--forest)">' + variant + '</span></h4><div class="swatches" id="swatches">' +
        p.colors.map(function (c, i) { return '<button class="sw' + (i ? '' : ' on') + '" data-sw="' + c + '" title="' + c + '" style="background:' + (colorMap[c] || '#ccc') + '"></button>'; }).join('') + '</div></div>' : '') +
      '<div style="margin-top:22px"><h4 style="font-family:var(--ff-body);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Quantity</h4>' +
      '<div class="qty" style="margin:0"><button id="qm">−</button><span id="qv">1</span><button id="qp">+</button></div></div>' +
      '<div class="pdp-actions">' +
      (out ? '<button class="btn is-disabled">Sold out</button>'
           : '<button class="btn btn-gold btn-lg" id="pAdd">Add to box</button><button class="btn btn-lg" id="pBuy">Buy it now</button>') +
      '<button class="icon-btn" data-fav="' + p.id + '" style="border:1px solid var(--line);width:52px;height:52px' + '" aria-label="Wishlist"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9z"/></svg></button></div>' +
      '<a class="btn btn-ghost btn-block" data-wa href="#" target="_blank" rel="noopener" style="margin-bottom:20px">Ask about this on WhatsApp</a>' +
      '<div class="trust">' +
      '<div><svg viewBox="0 0 24 24"><path d="M3 8h13v8H3z"/><path d="M16 11h4l1 3v2h-5z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>Free shipping over <span data-freeship>₹1499</span></div>' +
      '<div><svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>7-day easy returns</div>' +
      '<div><svg viewBox="0 0 24 24"><path d="M4 6h16v13H4z"/><path d="M4 6l8 6 8-6"/></svg>Free message card</div></div>';

    document.querySelector('[data-fav="' + p.id + '"]').classList.toggle('on', S.inWishlist(p.id));
    if (S.inWishlist(p.id)) document.querySelector('[data-fav="' + p.id + '"] svg').style.fill = 'var(--gold)';

    /* gallery */
    var main = document.getElementById('galMain');
    document.querySelector('.gal-thumbs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]'); if (!b) return;
      main.querySelector('img').src = p.images[+b.dataset.g];
      document.querySelectorAll('[data-g]').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    main.addEventListener('mousemove', function (e) {
      var r = main.getBoundingClientRect();
      main.querySelector('img').style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
    });
    main.addEventListener('mouseenter', function () { main.classList.add('zoom'); });
    main.addEventListener('mouseleave', function () { main.classList.remove('zoom'); });

    /* qty + variant */
    var qty = 1;
    var qv = document.getElementById('qv');
    document.getElementById('qm').onclick = function () { qty = Math.max(1, qty - 1); qv.textContent = qty; };
    document.getElementById('qp').onclick = function () { qty = Math.min(20, qty + 1); qv.textContent = qty; };
    var sw = document.getElementById('swatches');
    if (sw) sw.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sw]'); if (!b) return;
      variant = b.dataset.sw; document.getElementById('swName').textContent = variant;
      document.querySelectorAll('[data-sw]').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    if (!out) {
      document.getElementById('pAdd').onclick = function () {
        S.addToCart(p.id, qty, variant); window.toast('Added to your box');
        window.closeAllPanels(); document.querySelector('.cart-drawer').classList.add('open');
        document.querySelector('.overlay').classList.add('show'); document.body.style.overflow = 'hidden';
      };
      document.getElementById('pBuy').onclick = function () { S.addToCart(p.id, qty, variant); location.href = 'checkout.html'; };
    }

    /* tabs content */
    document.getElementById('tabDesc').innerHTML = '<p>' + p.description + '</p>' +
      '<h3>What\'s inside</h3><ul>' + p.includes.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
    document.getElementById('tabSpecs').innerHTML =
      '<table style="font-size:.92rem">' +
      [['SKU', p.sku], ['Category', S.categoryName(p.category)], ['Materials', p.materials.join(', ')],
       ['Finishes', p.colors.join(', ')], ['Occasions', (p.occasions || []).map(S.occasionName.bind(S)).join(', ')],
       ['Dispatch', p.category === 'personalised' ? '3–4 working days (made to order)' : 'Same day before 2 PM IST'],
       ['Care', 'Keep away from water, perfume and humidity. Wipe with the dry cloth included.']]
      .map(function (r) { return '<tr><td style="padding:11px 0;border-bottom:1px solid var(--line);color:var(--muted);width:34%">' + r[0] + '</td><td style="padding:11px 0;border-bottom:1px solid var(--line)">' + r[1] + '</td></tr>'; }).join('') + '</table>';
    document.getElementById('tabShip').innerHTML =
      '<h3>Shipping</h3><p>Free shipping on orders above <span data-freeship></span>. Below that, a flat ' + S.money(S.settings().shippingFlat) + '. Ready-to-ship orders placed before 2 PM IST dispatch the same day and reach most Indian metros in 2–3 working days, and the rest of India in 3–5.</p>' +
      '<h3>Returns</h3><p>Unused, unopened items can be returned within 7 days for a full refund minus shipping. Personalised and made-to-order pieces are exempt unless they arrive damaged or wrongly made — send us an unboxing video and we replace it, no argument.</p>' +
      '<h3>Gifting</h3><p>Tick “This is a gift” at checkout and we ship with no invoice inside, plus your message on a hand-written card.</p>';

    var revs = [
      { n: 'Priya S.', r: 5, t: 'Packaging alone is worth the price. The ribbon, the seal, the card — it all felt expensive.' },
      { n: 'Aditya V.', r: 5, t: 'Ordered for my wife’s birthday. She has kept the box itself on the dresser.' },
      { n: 'Nikita B.', r: 4, t: 'Beautiful piece and quick delivery. Wish there were more finish options.' }
    ];
    document.getElementById('tabRev').innerHTML =
      '<div class="between" style="margin-bottom:20px"><div><b style="font-size:2rem;font-family:var(--ff-display)">' + p.rating.toFixed(1) + '</b><span style="color:var(--muted)"> / 5</span><div class="stars">' + '★'.repeat(Math.round(p.rating)) + '<small>' + p.reviews + ' reviews</small></div></div></div>' +
      revs.map(function (r) {
        return '<div style="padding:18px 0;border-top:1px solid var(--line)"><div class="stars">' + '★'.repeat(r.r) + '</div>' +
          '<p style="margin:8px 0;color:var(--ink)">“' + r.t + '”</p><small style="color:var(--muted)">' + r.n + ' · Verified buyer</small></div>';
      }).join('');

    /* related + recent */
    var rel = S.products().filter(function (x) { return x.id !== p.id && (x.category === p.category || (x.occasions || []).some(function (o) { return (p.occasions || []).indexOf(o) > -1; })); }).slice(0, 4);
    window.renderGrid(document.getElementById('relGrid'), rel);
    var recIds = S.recent().filter(function (r) { return r !== p.id; }).slice(0, 4);
    if (recIds.length) {
      document.getElementById('recentSec').classList.remove('hide');
      window.renderGrid(document.getElementById('recentGrid'), recIds.map(function (r) { return S.product(r); }).filter(Boolean));
    }

    /* JSON-LD */
    var ld = document.createElement('script'); ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.short, sku: p.sku,
      brand: { '@type': 'Brand', name: S.settings().brand },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
      offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR', availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
    });
    document.head.appendChild(ld);
    window.initTabs(); window.initReveal();
  };

  /* =========================================================
     CART
     ========================================================= */
  window.initCartPage = function () {
    var coupon = sessionStorage.getItem('memora_coupon') || '';
    function draw() {
      var cart = S.cart(), t = S.totals(coupon);
      var box = document.getElementById('cartRows');
      if (!cart.length) {
        document.getElementById('cartWrap').innerHTML =
          '<div class="empty"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>' +
          '<h2 style="font-family:var(--ff-display)">Your gift box is empty</h2>' +
          '<p style="margin:12px auto 24px;max-width:44ch">Nothing in here yet. Our bestsellers are a good place to start.</p>' +
          '<a href="shop.html" class="btn btn-gold">Shop the collection</a></div>';
        return;
      }
      box.innerHTML = cart.map(function (i) {
        return '<div class="cart-row"><a href="product.html?id=' + i.id + '"><img src="' + i.image + '" alt="" loading="lazy"></a>' +
          '<div><a href="product.html?id=' + i.id + '"><h3 style="font-family:var(--ff-body);font-size:1.02rem;font-weight:500">' + i.name + '</h3></a>' +
          (i.variant ? '<small style="color:var(--muted)">Finish: ' + i.variant + '</small>' : '') +
          '<div class="price" style="margin:8px 0"><b>' + S.money(i.price) + '</b>' + (i.mrp > i.price ? '<s>' + S.money(i.mrp) + '</s>' : '') + '</div>' +
          '<div class="qty"><button data-q="-" data-k="' + i.key + '">−</button><span>' + i.qty + '</span><button data-q="+" data-k="' + i.key + '">+</button></div></div>' +
          '<div style="text-align:right"><b style="font-size:1.05rem">' + S.money(i.price * i.qty) + '</b>' +
          '<br><button class="ci-x" data-rm="' + i.key + '" style="margin-top:10px;font-size:.76rem;letter-spacing:.1em;text-transform:uppercase">Remove</button></div></div>';
      }).join('');
      document.getElementById('sumBody').innerHTML =
        '<div class="li"><span>Subtotal (' + t.items + ' items)</span><b>' + S.money(t.sub) + '</b></div>' +
        (t.discount ? '<div class="li" style="color:var(--success)"><span>Coupon ' + t.coupon.code + '</span><b>−' + S.money(t.discount) + '</b></div>' : '') +
        '<div class="li"><span>Shipping</span><b>' + (t.shipping ? S.money(t.shipping) : 'Free') + '</b></div>' +
        '<div class="li total"><span>Total</span><span>' + S.money(t.total) + '</span></div>' +
        (t.saved > 0 ? '<p style="color:var(--success);font-size:.84rem;margin-top:10px">You save ' + S.money(t.saved) + ' on this order.</p>' : '');
      var cm = document.getElementById('couponMsg');
      cm.textContent = t.couponError || (t.coupon ? '✓ ' + t.coupon.note : '');
      cm.style.color = t.couponError ? 'var(--danger)' : 'var(--success)';
      /* upsell */
      var addons = S.products().filter(function (p) { return p.category === 'addons' && !cart.some(function (c) { return c.id === p.id; }); }).slice(0, 3);
      document.getElementById('upsell').innerHTML = addons.map(function (p) {
        return '<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)">' +
          '<img src="' + p.images[0] + '" alt="" style="width:56px;height:66px;object-fit:cover;border-radius:8px" loading="lazy">' +
          '<div style="flex:1"><b style="font-size:.9rem;font-weight:500;display:block">' + p.name + '</b><span style="color:var(--gold-deep);font-size:.86rem">' + S.money(p.price) + '</span></div>' +
          '<button class="btn btn-sm btn-ghost" data-add="' + p.id + '" data-noopen="1">Add</button></div>';
      }).join('');
    }
    document.addEventListener('memora:cart', draw);
    document.addEventListener('click', function (e) {
      var q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
      if (q && q.closest('.cart-row')) { var l = S.cart().filter(function (x) { return x.key === q.dataset.k; })[0]; if (l) S.setQty(q.dataset.k, l.qty + (q.dataset.q === '+' ? 1 : -1)); }
      if (rm && rm.closest('.cart-row')) { S.removeFromCart(rm.dataset.rm); window.toast('Removed'); }
    });
    var ci = document.getElementById('couponInput'); if (ci) ci.value = coupon;
    document.getElementById('couponBtn').onclick = function () {
      coupon = ci.value.trim().toUpperCase();
      sessionStorage.setItem('memora_coupon', coupon); draw();
    };
    draw();
  };

  /* =========================================================
     WISHLIST
     ========================================================= */
  window.initWishlist = function () {
    function draw() {
      var ids = S.wishlist(), items = ids.map(function (i) { return S.product(i); }).filter(Boolean);
      var g = document.getElementById('wishGrid');
      if (!items.length) {
        g.innerHTML = '<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9z"/></svg>' +
          '<h2 style="font-family:var(--ff-display)">Nothing saved yet</h2><p style="margin:12px 0 22px">Tap the heart on any product to keep it here.</p>' +
          '<a href="shop.html" class="btn btn-gold">Browse the collection</a></div>';
      } else window.renderGrid(g, items);
    }
    document.addEventListener('memora:wish', draw); draw();
  };

  /* =========================================================
     CHECKOUT
     ========================================================= */
  window.initCheckout = function () {
    if (!S.cart().length) { location.replace('cart.html'); return; }
    /* placing an order requires an account — send them to sign in/create
       one first; account.html sends them right back here afterwards
       (see the ?redirect=checkout handling in initAccount) */
    if (!S.session()) { location.replace('account.html?redirect=checkout'); return; }
    var coupon = sessionStorage.getItem('memora_coupon') || '';
    var pay = 'prepaid';

    /* prefill from the signed-in customer's saved address, if they have one */
    var p = S.getProfile(), form0 = document.getElementById('ckForm');
    ['name', 'phone', 'address', 'city', 'state', 'pincode'].forEach(function (k) {
      var f = form0.querySelector('[name="' + k + '"]');
      if (f && p[k]) f.value = p[k];
    });
    if (S.session().user.email) form0.querySelector('[name="email"]').value = S.session().user.email;

    function draw() {
      var t = S.totals(coupon, pay), cart = S.cart();
      document.getElementById('ckItems').innerHTML = cart.map(function (i) {
        return '<div style="display:flex;gap:12px;padding:10px 0;align-items:center">' +
          '<div style="position:relative"><img src="' + i.image + '" style="width:56px;height:66px;object-fit:cover;border-radius:8px" alt="" loading="lazy">' +
          '<span style="position:absolute;top:-6px;right:-6px;background:var(--forest);color:var(--gold-light);width:20px;height:20px;border-radius:50%;font-size:.66rem;display:grid;place-items:center">' + i.qty + '</span></div>' +
          '<div style="flex:1"><b style="font-size:.88rem;font-weight:500;display:block">' + i.name + '</b>' + (i.variant ? '<small style="color:var(--muted);font-size:.74rem">' + i.variant + '</small>' : '') + '</div>' +
          '<b style="font-size:.9rem">' + S.money(i.price * i.qty) + '</b></div>';
      }).join('');
      document.getElementById('ckSummary').innerHTML =
        '<div class="li"><span>Subtotal</span><b>' + S.money(t.sub) + '</b></div>' +
        (t.discount ? '<div class="li" style="color:var(--success)"><span>Coupon ' + t.coupon.code + '</span><b>−' + S.money(t.discount) + '</b></div>' : '') +
        '<div class="li"><span>Shipping</span><b>' + (t.shipping ? S.money(t.shipping) : 'Free') + '</b></div>' +
        (t.cod ? '<div class="li"><span>COD handling</span><b>' + S.money(t.cod) + '</b></div>' : '') +
        '<div class="li total"><span>Total payable</span><span>' + S.money(t.total) + '</span></div>';
      document.getElementById('ckPayBtn').textContent = (pay === 'cod' ? 'Place COD order · ' : 'Place order · ') + S.money(t.total);
      var cm = document.getElementById('ckCouponMsg');
      cm.textContent = t.couponError || (t.coupon ? '✓ ' + t.coupon.note : '');
      cm.style.color = t.couponError ? 'var(--danger)' : 'var(--success)';
    }

    document.querySelectorAll('[name="pay"]').forEach(function (r) {
      r.addEventListener('change', function () {
        pay = r.value;
        document.querySelectorAll('.pay-opt').forEach(function (o) { o.classList.toggle('on', o.contains(r)); });
        draw();
      });
    });
    var ci = document.getElementById('ckCoupon'); ci.value = coupon;
    document.getElementById('ckCouponBtn').onclick = function () { coupon = ci.value.trim().toUpperCase(); sessionStorage.setItem('memora_coupon', coupon); draw(); };
    document.getElementById('giftToggle').addEventListener('change', function (e) {
      document.getElementById('giftBox').classList.toggle('hide', !e.target.checked);
    });

    var form = document.getElementById('ckForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (f) {
        var bad = !f.value.trim() ||
          (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)) ||
          (f.name === 'phone' && !/^[6-9]\d{9}$/.test(f.value.replace(/\D/g, '').slice(-10))) ||
          (f.name === 'pincode' && !/^\d{6}$/.test(f.value.trim()));
        f.closest('.field').classList.toggle('invalid', bad);
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) { window.toast('Please check the highlighted fields', 'err'); return; }

      var fd = new FormData(form), c = {};
      fd.forEach(function (v, k) { c[k] = String(v).trim(); });
      var t = S.totals(coupon, pay);
      var btn = document.getElementById('ckPayBtn'), btnText = btn.textContent;
      var orderPayload = {
        items: S.cart(), totals: t, coupon: coupon || '', payment: pay,
        gift: document.getElementById('giftToggle').checked,
        note: c.giftnote || '',
        customer: { name: c.name, email: c.email, phone: c.phone, address: c.address, city: c.city, state: c.state, pincode: c.pincode }
      };

      function goToSuccess(order) {
        var msg = S.orderMessage(order);
        try { sessionStorage.setItem('memora_wa', S.waLink(msg)); } catch (err) {}
        S.clearCart(); sessionStorage.removeItem('memora_coupon');
        location.href = 'order-success.html?id=' + order.id;
      }
      function reset() { btn.disabled = false; btn.textContent = btnText; }

      /* Razorpay switches on by setting a real key in assets/js/config.js —
         until then, prepaid orders fall back to the same "place order, pay
         via WhatsApp/UPI link" flow the site always used, same as COD. */
      var razorpayReady = window.MEMORA_RAZORPAY_KEY_ID && window.MEMORA_RAZORPAY_KEY_ID.indexOf('YOUR_RAZORPAY') !== 0;
      if (pay === 'cod' || !razorpayReady) {
        btn.disabled = true; btn.textContent = 'Placing your order…';
        S.createOrder(orderPayload).then(goToSuccess).catch(function (err) {
          console.error(err); reset();
          window.toast('Could not place the order — please try again.', 'err');
        });
        return;
      }

      /* prepaid, Razorpay live: create the (unpaid) order + a Razorpay
         order, then open the payment widget — the cart is only cleared once
         the payment is actually verified, so an abandoned/failed payment
         doesn't lose it */
      btn.disabled = true; btn.textContent = 'Opening payment…';
      S.createRazorpayOrder(orderPayload).then(function (res) {
        var rzp = new Razorpay({
          key: res.keyId || window.MEMORA_RAZORPAY_KEY_ID,
          amount: res.amount,
          currency: res.currency,
          order_id: res.razorpayOrderId,
          name: S.settings().brand,
          description: 'Order ' + res.memoraOrderId,
          prefill: { name: c.name, email: c.email, contact: c.phone },
          theme: { color: '#C9A961' },
          handler: function (resp) {
            btn.textContent = 'Confirming payment…';
            S.verifyRazorpayPayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature
            }).then(goToSuccess).catch(function (err) {
              console.error(err); reset();
              window.toast('Payment received but confirmation failed — please contact us with payment ID ' + resp.razorpay_payment_id, 'err');
            });
          },
          modal: { ondismiss: function () { reset(); window.toast('Payment cancelled — your cart is unchanged, you can try again.', 'err'); } }
        });
        rzp.on('payment.failed', function (resp) {
          reset();
          window.toast('Payment failed' + (resp.error && resp.error.description ? ': ' + resp.error.description : '') + ' — please try again.', 'err');
        });
        rzp.open();
        btn.textContent = btnText;
      }).catch(function (err) {
        console.error(err); reset();
        window.toast('Could not start the payment — please try again.', 'err');
      });
    });
    draw();
  };

  /* =========================================================
     ORDER SUCCESS
     ========================================================= */
  window.initSuccess = function () {
    var id = qs('id');
    S.getOrder(id).then(function (o) {
      if (!o) { showNotFound(); return; }
      document.getElementById('okId').textContent = o.id;
      document.getElementById('okTotal').textContent = S.money(o.totals.total);
      document.getElementById('okPay').textContent = o.payment === 'cod' ? 'Cash on delivery' : 'Prepaid / UPI';
      document.getElementById('okEmail').textContent = o.customer.email;
      document.getElementById('okItems').innerHTML = o.items.map(function (i) {
        return '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);align-items:center">' +
          '<img src="' + i.image + '" style="width:52px;height:62px;object-fit:cover;border-radius:8px" alt="" loading="lazy">' +
          '<div style="flex:1"><b style="font-weight:500;font-size:.9rem">' + i.name + '</b><br><small style="color:var(--muted)">Qty ' + i.qty + (i.variant ? ' · ' + i.variant : '') + '</small></div>' +
          '<b>' + S.money(i.price * i.qty) + '</b></div>';
      }).join('');
      var wa = sessionStorage.getItem('memora_wa');
      if (wa) document.getElementById('okWa').href = wa;
      var body = encodeURIComponent(S.orderMessage(o));
      document.getElementById('okMail').href = 'mailto:' + S.settings().email + '?subject=' + encodeURIComponent('New order ' + o.id + ' — The Memora') + '&body=' + body;
    }).catch(showNotFound);
    function showNotFound() {
      document.getElementById('okBox').innerHTML = '<div class="empty"><h2 style="font-family:var(--ff-display)">Order not found</h2><a href="shop.html" class="btn btn-gold" style="margin-top:18px">Back to shop</a></div>';
    }
  };

  /* =========================================================
     TRACK ORDER
     ========================================================= */
  window.initTrack = function () {
    var f = document.getElementById('trackForm'), out = document.getElementById('trackOut');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('trackId').value.trim();
      var btn = f.querySelector('button[type="submit"]'), btnText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Looking…'; }
      S.getOrder(id).then(function (o) {
        if (btn) { btn.disabled = false; btn.textContent = btnText; }
        if (!o) { showMiss(); return; }
        var steps = [['placed', 'Order placed', 'We have your order and payment details.'],
                     ['packed', 'Wrapped & packed', 'Your box is lined, ribboned and wax-sealed.'],
                     ['shipped', 'Dispatched', 'Handed to our courier partner.'],
                     ['delivered', 'Delivered', 'Signed for at your address.']];
        var at = ['placed', 'packed', 'shipped', 'delivered'].indexOf(o.status);
        out.innerHTML = '<div style="background:var(--cream);border:1px solid var(--line);border-radius:16px;padding:26px">' +
          '<div class="between" style="flex-wrap:wrap"><div><span class="eyebrow">Order</span><h3 style="margin-top:6px">' + o.id + '</h3></div>' +
          '<div style="text-align:right"><small style="color:var(--muted)">Placed ' + new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + '</small><br><b>' + S.money(o.totals.total) + '</b></div></div>' +
          '<div class="track-timeline">' + steps.map(function (s, i) {
            return '<div class="tstep ' + (i <= at ? 'done' : '') + '"><i>' + (i <= at ? '✓' : i + 1) + '</i><div><b>' + s[1] + '</b><small>' + s[2] + '</small></div></div>';
          }).join('') + '</div>' +
          '<div style="border-top:1px solid var(--line);padding-top:16px;margin-top:6px">' +
          o.items.map(function (i) { return '<div style="display:flex;justify-content:space-between;font-size:.9rem;padding:5px 0"><span>' + i.name + ' × ' + i.qty + '</span><b>' + S.money(i.price * i.qty) + '</b></div>'; }).join('') +
          '</div></div>';
      }).catch(function () { if (btn) { btn.disabled = false; btn.textContent = btnText; } showMiss(); });
      function showMiss() {
        out.innerHTML = '<div style="background:var(--cream);border:1px solid var(--line);border-radius:14px;padding:24px;text-align:center">' +
          '<b>No order found with that number.</b><p style="margin-top:8px;font-size:.9rem">Check the number in your confirmation email, or <a data-wa href="#" target="_blank" rel="noopener" style="color:var(--gold-deep)">message us on WhatsApp</a> and we\'ll find it.</p></div>';
        document.querySelectorAll('[data-wa]').forEach(function (a) { a.href = S.waLink('Hi! I need help tracking order ' + id); });
      }
    });
  };

  /* =========================================================
     BLOG
     ========================================================= */
  window.initBlog = function () {
    var g = document.getElementById('blogGrid');
    g.innerHTML = S.blog().map(function (b, i) {
      return '<a class="blog-card" href="blog-post.html?slug=' + b.slug + '" data-rev style="--d:' + (i % 3 * .07) + 's">' +
        '<div class="m"><img src="' + b.image + '" alt="' + b.title + '" loading="lazy"></div>' +
        '<div class="b"><span class="card-cat">' + b.category + ' · ' + b.read + '</span><h3>' + b.title + '</h3>' +
        '<p style="font-size:.9rem">' + b.excerpt + '</p>' +
        '<span class="link-u" style="margin-top:14px">Read article</span></div></a>';
    }).join('');
    window.initReveal();
  };

  window.initPost = function () {
    var slug = qs('slug'), p = S.post(slug) || S.blog()[0];
    document.title = p.title + ' — ' + S.settings().brand;
    document.getElementById('postHead').innerHTML =
      '<nav class="crumbs"><a href="index.html">Home</a><i>/</i><a href="blog.html">Journal</a><i>/</i><span>' + p.category + '</span></nav>' +
      '<span class="eyebrow" style="color:var(--gold-light);margin-top:12px">' + p.category + ' · ' + p.read + '</span>' +
      '<h1>' + p.title + '</h1><p>' + p.excerpt + '</p>' +
      '<p style="font-size:.8rem;margin-top:14px;opacity:.75">' + p.author + ' · ' + new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p>';
    document.getElementById('postImg').src = p.image;
    document.getElementById('postImg').alt = p.title;
    document.getElementById('postBody').innerHTML = window.POST_BODY(p);
    var more = S.blog().filter(function (b) { return b.slug !== p.slug; }).slice(0, 3);
    document.getElementById('moreGrid').innerHTML = more.map(function (b) {
      return '<a class="blog-card" href="blog-post.html?slug=' + b.slug + '"><div class="m"><img src="' + b.image + '" alt="" loading="lazy"></div>' +
        '<div class="b"><span class="card-cat">' + b.category + '</span><h3>' + b.title + '</h3></div></a>';
    }).join('');
  };

  /* =========================================================
     FAQ / CONTACT / CORPORATE forms
     ========================================================= */
  window.initFaq = function () {
    var box = document.getElementById('faqList');
    box.innerHTML = S.faqs().map(function (f) {
      return '<div class="acc"><button><span>' + f.q + '</span><span class="ic">+</span></button><div class="panel"><p>' + f.a + '</p></div></div>';
    }).join('');
    window.initAcc();
    var ld = document.createElement('script'); ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: S.faqs().map(function (f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; })
    });
    document.head.appendChild(ld);
  };

  window.initLeadForm = function (formId, subject) {
    var f = document.getElementById(formId); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      f.querySelectorAll('[required]').forEach(function (x) {
        var bad = !x.value.trim() || (x.type === 'email' && !/^\S+@\S+\.\S+$/.test(x.value));
        x.closest('.field').classList.toggle('invalid', bad); if (bad) ok = false;
      });
      if (!ok) { window.toast('Please fill the highlighted fields', 'err'); return; }
      var fd = new FormData(f), data = {}, lines = ['*' + subject + '*', ''];
      fd.forEach(function (v, k) {
        data[k] = v;
        if (String(v).trim()) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + v);
      });
      var msg = lines.join('\n');
      var kind = formId.toLowerCase().indexOf('corp') > -1 ? 'corporate' : 'contact';
      S.submitLead(kind, data).catch(function (err) { console.error(err); });
      f.reset();
      var box = document.getElementById(formId + 'Done');
      if (box) { box.classList.remove('hide'); box.querySelector('[data-wa-send]').href = S.waLink(msg); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      window.toast('Thanks — we’ll reply within a few hours.');
    });
  };

  /* =========================================================
     ACCOUNT — sign in / create account / order history / saved
     address / synced wishlist. Guest checkout is untouched by any
     of this; it only matters for a visitor who chooses to sign in.
     ========================================================= */
  window.initAccount = function () {
    var authBox = document.getElementById('acAuth'), dash = document.getElementById('acDash'), recoverBox = document.getElementById('recoverForm');

    if (qs('redirect') === 'checkout' && !S.session()) {
      document.getElementById('acTitle').textContent = 'Sign in to check out';
      document.getElementById('acSub').textContent = 'Placing an order needs an account — it takes a few seconds, and your cart is waiting for you.';
    }

    function showDash() {
      var sess = S.session();
      recoverBox.classList.add('hide'); authBox.classList.add('hide'); dash.classList.remove('hide');
      document.getElementById('acTitle').textContent = 'My account';
      document.getElementById('acEyebrow').textContent = 'Welcome back';
      document.getElementById('acSub').textContent = 'Your orders, your saved address, your wishlist.';
      document.getElementById('acName').textContent = (sess.user.user_metadata && sess.user.user_metadata.name) || 'My account';
      document.getElementById('acEmail').textContent = sess.user.email;
      drawOrders(); drawAddress(); drawWishlist(); drawClaimBanner();
    }
    function showAuth() { recoverBox.classList.add('hide'); dash.classList.add('hide'); authBox.classList.remove('hide'); }

    function drawClaimBanner() {
      var box = document.getElementById('acClaimBanner');
      S.findMyGuestOrders().then(function (orders) {
        if (!orders.length) { box.classList.add('hide'); return; }
        box.classList.remove('hide');
        box.innerHTML = '<p style="font-size:.88rem;margin-bottom:10px">We found ' + orders.length + ' order' + (orders.length === 1 ? '' : 's') + ' placed as a guest with this email (' +
          orders.map(function (o) { return o.id; }).join(', ') + '). Link ' + (orders.length === 1 ? 'it' : 'them') + ' to your account?</p>' +
          '<button class="btn btn-sm btn-gold" id="acClaimBtn">Link to my account</button>';
        document.getElementById('acClaimBtn').addEventListener('click', function (e) {
          var btn = e.target; btn.disabled = true; btn.textContent = 'Linking…';
          Promise.all(orders.map(function (o) { return S.claimGuestOrder(o.id); })).then(function () {
            window.toast('Orders linked to your account'); box.classList.add('hide'); drawOrders();
          }).catch(function () { window.toast('Could not link those orders', 'err'); btn.disabled = false; btn.textContent = 'Link to my account'; });
        });
      }).catch(function () { box.classList.add('hide'); });
    }

    function drawOrders() {
      var box = document.getElementById('acOrders');
      box.innerHTML = '<p style="color:var(--muted)">Loading your orders…</p>';
      S.getMyOrders().then(function (orders) {
        if (!orders.length) { box.innerHTML = '<p style="color:var(--muted)">No orders yet. <a href="shop.html" style="color:var(--gold-deep)">Start shopping →</a></p>'; return; }
        box.innerHTML = orders.map(function (o) {
          return '<div style="border-bottom:1px solid var(--line);padding:16px 0"><div class="between" style="flex-wrap:wrap;gap:8px">' +
            '<div><b>' + o.id + '</b><br><small style="color:var(--muted)">' + new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + o.items.length + ' item' + (o.items.length === 1 ? '' : 's') + '</small></div>' +
            '<div style="text-align:right"><span class="pill" style="text-transform:capitalize">' + o.status + '</span><br><b style="margin-top:4px;display:inline-block">' + S.money(o.totals.total) + '</b></div></div>' +
            '<a href="track-order.html" style="font-size:.82rem;color:var(--gold-deep)">Track this order →</a></div>';
        }).join('');
      }).catch(function () { box.innerHTML = '<p style="color:var(--danger)">Could not load your orders — please try again.</p>'; });
    }

    function drawAddress() {
      var p = S.getProfile(), f = document.getElementById('acAddrForm');
      ['name', 'phone', 'address', 'city', 'state', 'pincode'].forEach(function (k) {
        var el = f.querySelector('[name="' + k + '"]'); if (el && p[k]) el.value = p[k];
      });
    }

    function drawWishlist() {
      var ids = S.wishlist(), items = ids.map(function (id) { return S.product(id); }).filter(Boolean);
      var g = document.getElementById('acWishGrid');
      g.innerHTML = items.length ? '' : '<p style="color:var(--muted)">Nothing saved yet. Tap the heart on any product to keep it here.</p>';
      if (items.length) window.renderGrid(g, items);
    }

    /* sign in / create account tabs (reuses the site's existing .tabs/.tabpanel wiring) */
    window.initTabs();

    /* checkout redirects here (?redirect=checkout) when a guest tries to
       place an order — once they're actually signed in, send them right
       back instead of dropping them on the account dashboard */
    function afterAuthSuccess() {
      if (qs('redirect') === 'checkout') { location.href = 'checkout.html'; return; }
      showDash();
    }

    document.getElementById('signinForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, email = f.email.value.trim(), pw = f.password.value;
      var err = document.getElementById('signinErr'); err.textContent = '';
      var btn = f.querySelector('button[type="submit"]'), t = btn.textContent;
      btn.disabled = true; btn.textContent = 'Signing in…';
      S.login(email, pw).then(function (ok) {
        btn.disabled = false; btn.textContent = t;
        if (ok) { window.toast('Welcome back'); afterAuthSuccess(); }
        else err.textContent = 'Wrong email or password.';
      }).catch(function () { btn.disabled = false; btn.textContent = t; err.textContent = 'Something went wrong — please try again.'; });
    });

    document.getElementById('signupForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, name = f.name.value.trim(), email = f.email.value.trim(), pw = f.password.value;
      var err = document.getElementById('signupErr'); err.textContent = '';
      if (!name) { err.textContent = 'Please enter your name.'; return; }
      if (pw.length < 6) { err.textContent = 'Use at least 6 characters.'; return; }
      var btn = f.querySelector('button[type="submit"]'), t = btn.textContent;
      btn.disabled = true; btn.textContent = 'Creating account…';
      S.signUp(name, email, pw).then(function (res) {
        btn.disabled = false; btn.textContent = t;
        if (res.session) {
          return S.initSession().then(function () { window.toast('Account created'); afterAuthSuccess(); });
        }
        window.toast('Check your email to confirm your account, then sign in.');
        document.querySelector('[data-tab="signin"]').click();
      }).catch(function (err2) {
        btn.disabled = false; btn.textContent = t;
        err.textContent = err2.message || 'Could not create your account.';
      });
    });

    document.getElementById('acSignOut').addEventListener('click', function () {
      S.logout().then(function () { window.toast('Signed out'); location.reload(); });
    });

    document.getElementById('acAddrForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, profile = {};
      ['name', 'phone', 'address', 'city', 'state', 'pincode'].forEach(function (k) { profile[k] = f[k].value.trim(); });
      var btn = f.querySelector('button[type="submit"]'), t = btn.textContent;
      btn.disabled = true; btn.textContent = 'Saving…';
      S.updateProfile(profile).then(function () {
        btn.disabled = false; btn.textContent = t; window.toast('Address saved');
      }).catch(function () { btn.disabled = false; btn.textContent = t; window.toast('Could not save your address', 'err'); });
    });

    /* forgot password */
    var forgotForm = document.getElementById('forgotPwForm');
    document.getElementById('forgotPwLink').addEventListener('click', function () {
      document.getElementById('signinForm').classList.remove('on');
      forgotForm.classList.add('on');
    });
    document.getElementById('forgotPwBack').addEventListener('click', function () {
      forgotForm.classList.remove('on');
      document.getElementById('signinForm').classList.add('on');
    });
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('fpEmail').value.trim();
      var msg = document.getElementById('forgotPwMsg');
      var btn = forgotForm.querySelector('button[type="submit"]'), t = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending…';
      S.requestPasswordReset(email).then(function () {
        btn.disabled = false; btn.textContent = t;
        msg.style.color = 'var(--success)';
        msg.textContent = 'Check your email for a reset link.';
      }).catch(function () {
        btn.disabled = false; btn.textContent = t;
        msg.style.color = 'var(--danger)';
        msg.textContent = 'Could not send the reset email — please try again.';
      });
    });

    /* password-recovery redirect lands here with a special auth event,
       not a normal signed-in session — show a "set new password" form
       instead of the dashboard until they've actually set one */
    S.onAuthEvent(function (event) {
      if (event !== 'PASSWORD_RECOVERY') return;
      authBox.classList.add('hide'); dash.classList.add('hide'); recoverBox.classList.remove('hide');
    });
    document.getElementById('recoverForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = document.getElementById('rcPw').value;
      var msg = document.getElementById('recoverMsg');
      var btn = e.target.querySelector('button[type="submit"]'), t = btn.textContent;
      btn.disabled = true; btn.textContent = 'Saving…';
      S.changePassword(pw).then(function (ok) {
        btn.disabled = false; btn.textContent = t;
        if (!ok) { msg.style.color = 'var(--danger)'; msg.textContent = 'Could not update your password.'; return; }
        window.toast('Password updated — you\'re signed in');
        S.initSession().then(showDash);
      });
    });

    if (S.session()) showDash(); else showAuth();
  };
})();
