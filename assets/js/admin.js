/* ============================================================
   THE MEMORA — Admin panel controller
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var view = 'dashboard';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(m, t) { window.toast ? window.toast(m, t) : alert(m); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
  function save(msg) {
    return S.save().then(function (ok) {
      if (ok) { if (msg) toast(msg); } else toast('Could not save — check your connection and try again.', 'err');
      return ok;
    });
  }

  /* ---------- Orders + leads (Tier 2 — fetched on demand, cached here) ---------- */
  var ordersCache = [], ordersLoaded = false;
  var leadsCache = [], leadsLoaded = false;
  function refreshOrders() {
    S.listOrders().then(function (list) { ordersCache = list; ordersLoaded = true; render(); })
      .catch(function (err) { console.error(err); toast('Could not load orders', 'err'); });
  }
  function refreshLeads() {
    S.listLeads().then(function (list) { leadsCache = list; leadsLoaded = true; render(); })
      .catch(function (err) { console.error(err); toast('Could not load enquiries', 'err'); });
  }

  function compress(file, max, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, m = max || 1000;
        if (w > m || h > m) { var r = Math.min(m / w, m / h); w = Math.round(w * r); h = Math.round(h * r); }
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { cb(fr.result); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  function showLogin() { $('#adApp').classList.add('hide'); $('#adLogin').classList.remove('hide'); }
  function showApp() {
    $('#adLogin').classList.add('hide'); $('#adApp').classList.remove('hide');
    render(); refreshOrders(); refreshLeads();
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#loginForm button[type="submit"]'), btnText = btn.textContent;
    btn.disabled = true; btn.textContent = 'Signing in…';
    S.login($('#loginEmail').value.trim(), $('#loginPw').value).then(function (ok) {
      btn.disabled = false; btn.textContent = btnText;
      if (ok) { showApp(); toast('Welcome back'); }
      else { $('#loginErr').textContent = 'Wrong email or password. Try again.'; }
    }).catch(function () {
      btn.disabled = false; btn.textContent = btnText;
      $('#loginErr').textContent = 'Could not reach Supabase. Check assets/js/config.js.';
    });
  });
  $('#logoutBtn').addEventListener('click', function () { S.logout().then(function () { location.reload(); }); });

  document.addEventListener('click', function (e) {
    var n = e.target.closest('[data-view]');
    if (n) {
      view = n.dataset.view; $('.ad-side').classList.remove('open'); render(); window.scrollTo(0, 0);
      if (view === 'orders' && !ordersLoaded) refreshOrders();
      if (view === 'dashboard' && !leadsLoaded) refreshLeads();
    }
    if (e.target.closest('#adBurger')) $('.ad-side').classList.toggle('open');
  });

  function render() {
    var db = S.db();
    $$('.ad-nav').forEach(function (n) { n.classList.toggle('on', n.dataset.view === view); });
    $('#navProducts').textContent = db.products.length;
    $('#navOrders').textContent = ordersLoaded ? ordersCache.length : '…';
    $('#navPosts').textContent = (db.blog || []).length;
    var fn = { dashboard: vDash, products: vProducts, categories: vCats, offers: vOffers, banners: vBanners, orders: vOrders, blog: vBlog, reviews: vReviews, faqs: vFaqs, settings: vSettings, backup: vBackup }[view];
    $('#adBody').innerHTML = fn ? fn(db) : '';
  }

  /* ---------- Dashboard ---------- */
  function leadSubject(l) { return l.kind === 'corporate' ? 'Corporate gifting enquiry' : l.kind === 'newsletter' ? 'Newsletter sign-up' : 'Contact form enquiry'; }
  function leadSummary(l) {
    return Object.keys(l.payload || {}).map(function (k) { return k + ': ' + l.payload[k]; }).join(' · ');
  }
  function vDash(db) {
    var orders = ordersCache;
    var rev = orders.reduce(function (a, o) { return a + (o.totals ? o.totals.total : 0); }, 0);
    var low = db.products.filter(function (p) { return p.stock > 0 && p.stock < 20; });
    var out = db.products.filter(function (p) { return p.stock <= 0; });
    var enquiries = leadsCache.filter(function (l) { return l.kind !== 'newsletter'; });
    var news = leadsCache.filter(function (l) { return l.kind === 'newsletter'; });
    var byCat = {};
    db.products.forEach(function (p) { byCat[p.category] = (byCat[p.category] || 0) + 1; });
    var maxCat = Math.max.apply(null, Object.keys(byCat).map(function (k) { return byCat[k]; }).concat([1]));

    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Dashboard</h1><p>Everything on the site is edited from here.</p></div>' +
      '<button class="ad-btn" data-view="products">+ Add a product</button></div>' +
      '<div class="ad-stats">' +
      [['Products live', db.products.filter(function (p) { return p.active !== false; }).length],
       ['Orders', ordersLoaded ? orders.length : '…'], ['Order value', ordersLoaded ? S.money(rev) : '…'],
       ['Coupons active', db.coupons.filter(function (c) { return c.active !== false; }).length],
       ['Enquiries', leadsLoaded ? enquiries.length : '…'], ['Newsletter', leadsLoaded ? news.length : '…']]
      .map(function (s) { return '<div class="ad-card ad-stat"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>'; }).join('') + '</div>' +
      '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:16px" class="ad-grid-resp">' +
      '<div class="ad-card"><h3 style="margin-bottom:14px">Recent orders</h3>' +
        (!ordersLoaded ? '<p>Loading…</p>' : orders.length ? '<table class="ad-table"><tbody>' + orders.slice(0, 6).map(function (o) {
          return '<tr><td><b>' + o.id + '</b><br><small style="color:var(--ad-mut)">' + esc(o.customer.name) + '</small></td>' +
            '<td class="hide-sm">' + new Date(o.created_at).toLocaleDateString('en-IN') + '</td>' +
            '<td><span class="pill ' + (o.status === 'delivered' ? 'ok' : '') + '">' + o.status + '</span></td>' +
            '<td style="text-align:right"><b>' + S.money(o.totals.total) + '</b></td></tr>';
        }).join('') + '</tbody></table><button class="ad-btn ghost sm" data-view="orders" style="margin-top:14px">View all orders</button>'
          : '<p>No orders yet. Orders placed on the site show up here automatically.</p>') + '</div>' +
      '<div class="ad-card"><h3 style="margin-bottom:14px">Catalogue by category</h3>' +
        Object.keys(byCat).map(function (k) {
          return '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px"><span>' + esc(S.categoryName(k)) + '</span><b>' + byCat[k] + '</b></div>' +
            '<div style="height:6px;background:rgba(232,214,168,.1);border-radius:99px"><i style="display:block;height:100%;width:' + (byCat[k] / maxCat * 100) + '%;background:linear-gradient(90deg,var(--gold-deep),var(--gold));border-radius:99px"></i></div></div>';
        }).join('') + '</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px" class="ad-grid-resp">' +
      '<div class="ad-card"><h3 style="margin-bottom:12px">Stock alerts</h3>' +
        (out.length || low.length ?
          out.map(function (p) { return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(232,214,168,.08);font-size:.86rem"><span>' + esc(p.name) + '</span><span class="pill off">Sold out</span></div>'; }).join('') +
          low.map(function (p) { return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(232,214,168,.08);font-size:.86rem"><span>' + esc(p.name) + '</span><span class="pill">' + p.stock + ' left</span></div>'; }).join('')
          : '<p>Everything is well stocked.</p>') + '</div>' +
      '<div class="ad-card"><h3 style="margin-bottom:12px">Latest enquiries</h3>' +
        (!leadsLoaded ? '<p>Loading…</p>' : enquiries.length ? enquiries.slice(0, 5).map(function (l) {
          return '<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid rgba(232,214,168,.08)"><div style="flex:1;min-width:0"><b style="font-size:.84rem">' + esc(leadSubject(l)) + '</b><br>' +
            '<small style="color:var(--ad-mut);white-space:pre-line">' + esc(leadSummary(l)).slice(0, 160) + '…</small></div>' +
            '<button class="ad-btn danger sm" style="flex-shrink:0" onclick="Admin.delLead(' + l.id + ')">Delete</button></div>';
        }).join('') : '<p>Contact and corporate form submissions appear here.</p>') + '</div></div>';
  }

  /* ---------- Products ---------- */
  var pFilter = '', pCat = '';
  function vProducts(db) {
    var list = db.products.filter(function (p) {
      return (!pCat || p.category === pCat) && (!pFilter || (p.name + p.id).toLowerCase().indexOf(pFilter.toLowerCase()) > -1);
    });
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Products</h1><p>' + db.products.length + ' products · edit prices, photos, stock and offers.</p></div>' +
      '<button class="ad-btn" onclick="Admin.editProduct()">+ New product</button></div>' +
      '<div class="ad-card" style="margin-bottom:16px"><div class="ad-grid2">' +
      '<div class="ad-f"><label class="ad-lab">Search</label><input class="ad-in" id="pSearch" value="' + esc(pFilter) + '" placeholder="Product name…"></div>' +
      '<div class="ad-f"><label class="ad-lab">Category</label><select class="ad-sel" id="pCatF"><option value="">All categories</option>' +
      db.categories.map(function (c) { return '<option value="' + c.id + '"' + (pCat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="ad-card" style="overflow-x:auto"><table class="ad-table"><thead><tr>' +
      '<th></th><th>Product</th><th class="hide-sm">Category</th><th>Price</th><th class="hide-sm">MRP</th><th>Stock</th><th class="hide-sm">Badge</th><th>Live</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (p) {
        return '<tr><td><img src="' + esc(p.images[0]) + '" alt=""></td>' +
          '<td><b>' + esc(p.name) + '</b><br><small style="color:var(--ad-mut)">' + esc(p.id) + '</small></td>' +
          '<td class="hide-sm">' + esc(S.categoryName(p.category)) + '</td>' +
          '<td><b>' + S.money(p.price) + '</b></td>' +
          '<td class="hide-sm"><s style="color:var(--ad-mut)">' + S.money(p.mrp) + '</s></td>' +
          '<td>' + (p.stock <= 0 ? '<span class="pill off">0</span>' : p.stock) + '</td>' +
          '<td class="hide-sm">' + (p.badge ? '<span class="pill">' + esc(p.badge) + '</span>' : '—') + '</td>' +
          '<td><span class="pill ' + (p.active !== false ? 'ok' : 'off') + '" style="cursor:pointer" onclick="Admin.toggleActive(\'' + p.id + '\')">' + (p.active !== false ? 'Live' : 'Hidden') + '</span></td>' +
          '<td style="white-space:nowrap;text-align:right">' +
            '<button class="ad-btn ghost sm" onclick="Admin.editProduct(\'' + p.id + '\')">Edit</button> ' +
            '<button class="ad-btn ghost sm" onclick="Admin.dupProduct(\'' + p.id + '\')">Copy</button> ' +
            '<button class="ad-btn danger sm" onclick="Admin.delProduct(\'' + p.id + '\')">Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="9" style="padding:30px;text-align:center;color:var(--ad-mut)">No products match that filter.</td></tr>') +
      '</tbody></table></div>';
  }
  document.addEventListener('input', function (e) {
    if (e.target.id === 'pSearch') {
      pFilter = e.target.value; var s = e.target.selectionStart; render();
      var n = $('#pSearch'); if (n) { n.focus(); n.setSelectionRange(s, s); }
    }
  });
  document.addEventListener('change', function (e) { if (e.target.id === 'pCatF') { pCat = e.target.value; render(); } });

  /* ---------- Product modal ---------- */
  var editing = null;
  function editProduct(id) {
    var db = S.db();
    var p = id ? JSON.parse(JSON.stringify(db.products.filter(function (x) { return x.id === id; })[0])) : {
      id: '', name: '', category: db.categories[0] ? db.categories[0].id : '', occasions: [], price: 999, mrp: 1299,
      badge: '', rating: 4.8, reviews: 0, stock: 50, colors: ['Gold'], materials: [], short: '', description: '',
      images: [], sku: '', includes: ['Signature Memora rigid gift box', 'Hand-tied satin ribbon and wax seal', 'Personalised message card'], active: true, featured: false
    };
    editing = p;
    $('#modalBody').innerHTML =
      '<div class="ad-top" style="margin-bottom:18px"><h2 style="font-size:1.4rem">' + (id ? 'Edit product' : 'New product') + '</h2>' +
      '<button class="ad-btn ghost sm" onclick="Admin.closeModal()">Close</button></div>' +
      '<div class="ad-f"><label class="ad-lab">Product name</label><input class="ad-in" id="fName" value="' + esc(p.name) + '"></div>' +
      '<div class="ad-grid3">' +
        '<div class="ad-f"><label class="ad-lab">Selling price</label><input class="ad-in" id="fPrice" type="number" min="0" value="' + p.price + '"></div>' +
        '<div class="ad-f"><label class="ad-lab">MRP / struck price</label><input class="ad-in" id="fMrp" type="number" min="0" value="' + p.mrp + '"></div>' +
        '<div class="ad-f"><label class="ad-lab">Stock</label><input class="ad-in" id="fStock" type="number" min="0" value="' + p.stock + '"></div>' +
      '</div><div class="ad-grid3">' +
        '<div class="ad-f"><label class="ad-lab">Category</label><select class="ad-sel" id="fCat">' +
          db.categories.map(function (c) { return '<option value="' + c.id + '"' + (p.category === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="ad-f"><label class="ad-lab">Badge</label><select class="ad-sel" id="fBadge">' +
          ['', 'bestseller', 'new', 'premium', 'seasonal'].map(function (b) { return '<option value="' + b + '"' + (p.badge === b ? ' selected' : '') + '>' + (b || 'None') + '</option>'; }).join('') + '</select></div>' +
        '<div class="ad-f"><label class="ad-lab">SKU</label><input class="ad-in" id="fSku" value="' + esc(p.sku) + '"></div>' +
      '</div>' +
      '<div class="ad-f"><label class="ad-lab">Occasions</label><div style="display:flex;flex-wrap:wrap;gap:8px">' +
        db.occasions.map(function (o) {
          return '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;padding:6px 12px;border:1px solid var(--ad-line);border-radius:99px;cursor:pointer">' +
            '<input type="checkbox" data-occ="' + o.id + '" ' + ((p.occasions || []).indexOf(o.id) > -1 ? 'checked' : '') + ' style="accent-color:var(--gold)">' + esc(o.name) + '</label>';
        }).join('') + '</div></div>' +
      '<div class="ad-f"><label class="ad-lab">Short description</label><textarea class="ad-ta" id="fShort" style="min-height:64px">' + esc(p.short) + '</textarea></div>' +
      '<div class="ad-f"><label class="ad-lab">Full description</label><textarea class="ad-ta" id="fDesc">' + esc(p.description) + '</textarea></div>' +
      '<div class="ad-grid3">' +
        '<div class="ad-f"><label class="ad-lab">Finishes (comma separated)</label><input class="ad-in" id="fColors" value="' + esc((p.colors || []).join(', ')) + '"></div>' +
        '<div class="ad-f"><label class="ad-lab">Materials (comma separated)</label><input class="ad-in" id="fMats" value="' + esc((p.materials || []).join(', ')) + '"></div>' +
        '<div class="ad-f"><label class="ad-lab">Rating (0-5)</label><input class="ad-in" id="fRating" type="number" step="0.1" min="0" max="5" value="' + p.rating + '"></div>' +
      '</div>' +
      '<div class="ad-f"><label class="ad-lab">What is inside (one per line)</label><textarea class="ad-ta" id="fIncludes">' + esc((p.includes || []).join('\n')) + '</textarea></div>' +
      '<div class="ad-f"><label class="ad-lab">Photos - the first one is the main image</label>' +
        '<div class="drop" id="dropZone">Click to upload photos, or drag them here.<br><small>Large images are resized automatically. JPG / PNG / WEBP.</small></div>' +
        '<input type="file" id="fileIn" accept="image/*" multiple hidden>' +
        '<div style="display:flex;gap:8px;margin-top:10px"><input class="ad-in" id="fUrl" placeholder="...or paste an image URL"><button class="ad-btn ghost" onclick="Admin.addUrl()">Add</button></div>' +
        '<div class="ad-imgs" id="imgList"></div></div>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin:16px 0">' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:.86rem"><input type="checkbox" id="fActive" ' + (p.active !== false ? 'checked' : '') + ' style="accent-color:var(--gold)"> Live on site</label>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:.86rem"><input type="checkbox" id="fFeat" ' + (p.featured ? 'checked' : '') + ' style="accent-color:var(--gold)"> Featured</label>' +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid var(--ad-line);padding-top:18px">' +
        '<button class="ad-btn" onclick="Admin.saveProduct(' + (id ? "'" + id + "'" : 'null') + ')">Save product</button>' +
        '<button class="ad-btn ghost" onclick="Admin.closeModal()">Cancel</button></div>';
    drawImgs();
    $('#dropZone').onclick = function () { $('#fileIn').click(); };
    $('#fileIn').onchange = function (e) { handleFiles(e.target.files); };
    ['dragover', 'dragenter'].forEach(function (ev) { $('#dropZone').addEventListener(ev, function (e) { e.preventDefault(); $('#dropZone').classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { $('#dropZone').addEventListener(ev, function (e) { e.preventDefault(); $('#dropZone').classList.remove('over'); }); });
    $('#dropZone').addEventListener('drop', function (e) { handleFiles(e.dataTransfer.files); });
    $('#adModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function handleFiles(files) {
    Array.prototype.slice.call(files).forEach(function (f) {
      if (!/^image\//.test(f.type)) return;
      compress(f, 1000, function (d) { editing.images.push(d); drawImgs(); });
    });
  }
  function drawImgs() {
    $('#imgList').innerHTML = editing.images.map(function (im, i) {
      return '<div class="ad-img"><img src="' + im + '" alt=""><button onclick="Admin.rmImg(' + i + ')">x</button>' +
        (i === 0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:var(--gold);color:#1B2415;font-size:.55rem;text-align:center;letter-spacing:.1em">MAIN</span>' : '') + '</div>';
    }).join('') || '<small style="color:var(--ad-mut)">No photos yet.</small>';
  }

  /* ---------- Categories ---------- */
  function vCats(db) {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Categories &amp; occasions</h1><p>These drive the menu, the filters and the homepage tiles.</p></div></div>' +
      '<div class="ad-card" style="margin-bottom:16px"><div class="ad-top"><h3>Categories</h3><button class="ad-btn sm" onclick="Admin.addCat()">+ Add category</button></div>' +
      '<div style="overflow-x:auto"><table class="ad-table"><thead><tr><th></th><th>Name</th><th class="hide-sm">Slug</th><th>Tagline</th><th></th></tr></thead><tbody>' +
      db.categories.map(function (c, i) {
        return '<tr><td><img src="' + esc(c.image) + '" alt=""></td>' +
          '<td><input class="ad-in" value="' + esc(c.name) + '" onchange="Admin.setCat(' + i + ',\'name\',this.value)"></td>' +
          '<td class="hide-sm"><code style="font-size:.76rem;color:var(--ad-mut)">' + esc(c.id) + '</code></td>' +
          '<td><input class="ad-in" value="' + esc(c.tag) + '" onchange="Admin.setCat(' + i + ',\'tag\',this.value)"></td>' +
          '<td style="white-space:nowrap"><button class="ad-btn ghost sm" onclick="Admin.catImg(' + i + ')">Photo</button> ' +
          '<button class="ad-btn danger sm" onclick="Admin.delCat(' + i + ')">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="ad-card"><div class="ad-top"><h3>Occasions</h3><button class="ad-btn sm" onclick="Admin.addOcc()">+ Add occasion</button></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:9px">' + db.occasions.map(function (o, i) {
        return '<span class="pill" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px">' + esc(o.name) +
          '<button onclick="Admin.delOcc(' + i + ')" style="color:#E9A79E">x</button></span>';
      }).join('') + '</div></div>';
  }

  /* ---------- Offers ---------- */
  function vOffers(db) {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Offers &amp; coupons</h1><p>Codes customers can apply in the cart and at checkout.</p></div>' +
      '<button class="ad-btn" onclick="Admin.addCoupon()">+ New coupon</button></div>' +
      '<div class="ad-card" style="overflow-x:auto"><table class="ad-table"><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min order</th><th>Description</th><th>Status</th><th></th></tr></thead><tbody>' +
      db.coupons.map(function (c, i) {
        return '<tr><td><input class="ad-in" value="' + esc(c.code) + '" onchange="Admin.setCoupon(' + i + ',\'code\',this.value.toUpperCase())" style="text-transform:uppercase;font-weight:600"></td>' +
          '<td><select class="ad-sel" onchange="Admin.setCoupon(' + i + ',\'type\',this.value)">' +
            [['percent', '% off'], ['flat', 'Flat off'], ['shipping', 'Free shipping']].map(function (t) { return '<option value="' + t[0] + '"' + (c.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></td>' +
          '<td><input class="ad-in" type="number" value="' + c.value + '" onchange="Admin.setCoupon(' + i + ',\'value\',+this.value)" style="width:90px"></td>' +
          '<td><input class="ad-in" type="number" value="' + (c.min || 0) + '" onchange="Admin.setCoupon(' + i + ',\'min\',+this.value)" style="width:110px"></td>' +
          '<td><input class="ad-in" value="' + esc(c.note || '') + '" onchange="Admin.setCoupon(' + i + ',\'note\',this.value)"></td>' +
          '<td><span class="pill ' + (c.active !== false ? 'ok' : 'off') + '" style="cursor:pointer" onclick="Admin.setCoupon(' + i + ',\'active\',' + (c.active === false) + ')">' + (c.active !== false ? 'Active' : 'Paused') + '</span></td>' +
          '<td><button class="ad-btn danger sm" onclick="Admin.delCoupon(' + i + ')">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="ad-card" style="margin-top:16px"><h3 style="margin-bottom:12px">Announcement bar</h3>' +
      '<p style="margin-bottom:12px">One line per message. These scroll across the top of every page.</p>' +
      '<textarea class="ad-ta" id="annBox" style="min-height:120px">' + esc((db.settings.announcements || []).join('\n')) + '</textarea>' +
      '<button class="ad-btn sm" style="margin-top:12px" onclick="Admin.saveAnn()">Save announcements</button></div>';
  }

  /* ---------- Banners ---------- */
  function vBanners(db) {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Homepage banners</h1><p>The rotating hero slides on the homepage.</p></div>' +
      '<button class="ad-btn" onclick="Admin.addHero()">+ Add slide</button></div>' +
      db.hero.map(function (h, i) {
        return '<div class="ad-card" style="margin-bottom:14px"><div class="ad-top" style="margin-bottom:14px"><h3>Slide ' + (i + 1) + '</h3>' +
          '<div style="display:flex;gap:8px">' +
          '<button class="ad-btn ghost sm" onclick="Admin.moveHero(' + i + ',-1)"' + (i === 0 ? ' disabled' : '') + ' title="Move up">↑</button>' +
          '<button class="ad-btn ghost sm" onclick="Admin.moveHero(' + i + ',1)"' + (i === db.hero.length - 1 ? ' disabled' : '') + ' title="Move down">↓</button>' +
          '<button class="ad-btn ghost sm" onclick="Admin.heroImg(' + i + ')">Change photo</button>' +
          '<button class="ad-btn danger sm" onclick="Admin.delHero(' + i + ')">Delete</button></div></div>' +
          '<div style="display:grid;grid-template-columns:190px 1fr;gap:16px" class="ad-grid-resp">' +
          '<img src="' + esc(h.image) + '" style="width:100%;border-radius:10px;object-fit:cover;aspect-ratio:16/10" alt="">' +
          '<div><div class="ad-grid2">' +
          '<div class="ad-f"><label class="ad-lab">Eyebrow</label><input class="ad-in" value="' + esc(h.eyebrow) + '" onchange="Admin.setHero(' + i + ',\'eyebrow\',this.value)"></div>' +
          '<div class="ad-f"><label class="ad-lab">Headline (HTML allowed)</label><input class="ad-in" value="' + esc(h.title) + '" onchange="Admin.setHero(' + i + ',\'title\',this.value)"></div></div>' +
          '<div class="ad-f"><label class="ad-lab">Sub-headline</label><input class="ad-in" value="' + esc(h.sub) + '" onchange="Admin.setHero(' + i + ',\'sub\',this.value)"></div>' +
          '<div class="ad-grid2">' +
          '<div class="ad-f"><label class="ad-lab">Button 1 text</label><input class="ad-in" value="' + esc(h.cta) + '" onchange="Admin.setHero(' + i + ',\'cta\',this.value)"></div>' +
          '<div class="ad-f"><label class="ad-lab">Button 1 link</label><input class="ad-in" value="' + esc(h.link) + '" onchange="Admin.setHero(' + i + ',\'link\',this.value)"></div>' +
          '<div class="ad-f"><label class="ad-lab">Button 2 text</label><input class="ad-in" value="' + esc(h.cta2) + '" onchange="Admin.setHero(' + i + ',\'cta2\',this.value)"></div>' +
          '<div class="ad-f"><label class="ad-lab">Button 2 link</label><input class="ad-in" value="' + esc(h.link2) + '" onchange="Admin.setHero(' + i + ',\'link2\',this.value)"></div>' +
          '</div></div></div></div>';
      }).join('');
  }

  /* ---------- Orders ---------- */
  function paymentBadge(x) {
    var ps = x.payment_status || (x.payment === 'cod' ? 'cod' : 'pending');
    var label = { paid: 'Paid', pending: 'Awaiting payment', failed: 'Payment failed', cod: 'COD' }[ps] || ps;
    var cls = ps === 'paid' ? 'ok' : ps === 'failed' ? 'off' : '';
    return (x.payment === 'cod' ? 'COD' : 'Prepaid') + '<br><span class="pill ' + cls + '" style="margin-top:4px">' + label + '</span>';
  }
  function vOrders(db) {
    if (!ordersLoaded) return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Orders</h1><p>Every order placed on the site lands here.</p></div></div><div class="ad-card"><p>Loading…</p></div>';
    var o = ordersCache;
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Orders</h1><p>Every order placed on the site lands here.</p></div>' +
      (o.length ? '<button class="ad-btn ghost" onclick="Admin.exportOrders()">Download CSV</button>' : '') + '</div>' +
      (o.length ? '<div class="ad-card" style="overflow-x:auto"><table class="ad-table"><thead><tr><th>Order</th><th>Customer</th><th class="hide-sm">Items</th><th>Total</th><th class="hide-sm">Payment</th><th>Status</th><th></th></tr></thead><tbody>' +
        o.map(function (x, i) {
          return '<tr><td><b>' + x.id + '</b><br><small style="color:var(--ad-mut)">' + new Date(x.created_at).toLocaleDateString('en-IN') + '</small></td>' +
            '<td>' + esc(x.customer.name) + '<br><small style="color:var(--ad-mut)">' + esc(x.customer.phone) + '</small></td>' +
            '<td class="hide-sm">' + x.items.length + '</td><td><b>' + S.money(x.totals.total) + '</b></td>' +
            '<td class="hide-sm" style="font-size:.82rem">' + paymentBadge(x) + '</td>' +
            '<td><select class="ad-sel" style="width:130px" onchange="Admin.setOrder(\'' + x.id + '\',this.value)">' +
              ['placed', 'packed', 'shipped', 'delivered', 'cancelled'].map(function (s) { return '<option value="' + s + '"' + (x.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
            '<td style="white-space:nowrap"><button class="ad-btn ghost sm" onclick="Admin.viewOrder(' + i + ')">View</button> ' +
              '<button class="ad-btn danger sm" onclick="Admin.delOrder(\'' + x.id + '\')">Delete</button></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="ad-card"><p>No orders yet. Place a test order on the site and it will appear here shortly.</p></div>');
  }

  /* ---------- Blog ---------- */
  function vBlog(db) {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Journal</h1><p>Blog posts shown on the Journal page.</p></div>' +
      '<button class="ad-btn" onclick="Admin.addPost()">+ New article</button></div>' +
      '<div class="ad-card" style="overflow-x:auto"><table class="ad-table"><thead><tr><th></th><th>Title &amp; summary</th><th class="hide-sm">Category</th><th class="hide-sm">Date</th><th></th></tr></thead><tbody>' +
      db.blog.map(function (b, i) {
        return '<tr><td><img src="' + esc(b.image) + '" alt="" style="width:66px;height:42px"></td>' +
          '<td><input class="ad-in" value="' + esc(b.title) + '" onchange="Admin.setPost(' + i + ',\'title\',this.value)"><br>' +
          '<input class="ad-in" value="' + esc(b.excerpt) + '" onchange="Admin.setPost(' + i + ',\'excerpt\',this.value)" style="margin-top:6px;font-size:.8rem"></td>' +
          '<td class="hide-sm"><input class="ad-in" value="' + esc(b.category) + '" onchange="Admin.setPost(' + i + ',\'category\',this.value)" style="width:120px"></td>' +
          '<td class="hide-sm"><input class="ad-in" type="date" value="' + esc(b.date) + '" onchange="Admin.setPost(' + i + ',\'date\',this.value)"></td>' +
          '<td style="white-space:nowrap"><button class="ad-btn ghost sm" onclick="Admin.postImg(' + i + ')">Photo</button> ' +
          '<button class="ad-btn danger sm" onclick="Admin.delPost(' + i + ')">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function vReviews(db) {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Testimonials</h1><p>Shown on the homepage.</p></div>' +
      '<button class="ad-btn" onclick="Admin.addTesti()">+ Add testimonial</button></div>' +
      '<div class="ad-card" style="overflow-x:auto"><table class="ad-table"><thead><tr><th>Name</th><th>City</th><th>Quote</th><th>Rating</th><th></th></tr></thead><tbody>' +
      db.testimonials.map(function (t, i) {
        return '<tr><td><input class="ad-in" value="' + esc(t.name) + '" onchange="Admin.setTesti(' + i + ',\'name\',this.value)" style="width:130px"></td>' +
          '<td><input class="ad-in" value="' + esc(t.city) + '" onchange="Admin.setTesti(' + i + ',\'city\',this.value)" style="width:120px"></td>' +
          '<td><textarea class="ad-ta" style="min-height:60px" onchange="Admin.setTesti(' + i + ',\'text\',this.value)">' + esc(t.text) + '</textarea></td>' +
          '<td><input class="ad-in" type="number" min="1" max="5" value="' + t.rating + '" onchange="Admin.setTesti(' + i + ',\'rating\',+this.value)" style="width:66px"></td>' +
          '<td><button class="ad-btn danger sm" onclick="Admin.delTesti(' + i + ')">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function vFaqs(db) {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">FAQs</h1><p>Shown on the FAQ page and the homepage.</p></div>' +
      '<button class="ad-btn" onclick="Admin.addFaq()">+ Add question</button></div>' +
      db.faqs.map(function (f, i) {
        return '<div class="ad-card" style="margin-bottom:12px">' +
          '<div class="ad-f"><label class="ad-lab">Question</label><input class="ad-in" value="' + esc(f.q) + '" onchange="Admin.setFaq(' + i + ',\'q\',this.value)"></div>' +
          '<div class="ad-f"><label class="ad-lab">Answer</label><textarea class="ad-ta" onchange="Admin.setFaq(' + i + ',\'a\',this.value)">' + esc(f.a) + '</textarea></div>' +
          '<button class="ad-btn danger sm" onclick="Admin.delFaq(' + i + ')">Delete</button></div>';
      }).join('');
  }

  function vSettings(db) {
    var s = db.settings;
    function f(k, label, type, hint) {
      return '<div class="ad-f"><label class="ad-lab">' + label + '</label><input class="ad-in" type="' + (type || 'text') + '" value="' + esc(s[k]) + '" onchange="Admin.setS(\'' + k + '\',this.value)">' +
        (hint ? '<small class="ad-hint">' + hint + '</small>' : '') + '</div>';
    }
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Site settings</h1><p>Brand details, contact info and shipping rules.</p></div></div>' +
      '<div class="ad-card" style="margin-bottom:16px"><h3 style="margin-bottom:16px">Brand</h3><div class="ad-grid2">' +
      f('brand', 'Brand name') + f('tagline', 'Tagline') + '</div>' +
      '<div class="ad-f"><label class="ad-lab">Logo</label><div style="display:flex;gap:14px;align-items:center">' +
      '<img src="' + esc(s.logo) + '" style="width:58px;height:58px;border-radius:50%;object-fit:cover;background:#0d1209" alt="">' +
      '<button class="ad-btn ghost sm" onclick="Admin.logoUpload()">Upload new logo</button></div></div></div>' +
      '<div class="ad-card" style="margin-bottom:16px"><h3 style="margin-bottom:16px">Contact</h3><div class="ad-grid2">' +
      f('whatsapp', 'WhatsApp number', 'text', 'Digits only with country code, e.g. 919876543210') +
      f('phone', 'Display phone number') + f('email', 'Email address', 'email') + f('address', 'Studio address') + '</div>' +
      '<div class="ad-grid2">' + f('instagram', 'Instagram URL') + f('facebook', 'Facebook URL') + f('pinterest', 'Pinterest URL') + f('youtube', 'YouTube URL') + '</div></div>' +
      '<div class="ad-card" style="margin-bottom:16px"><h3 style="margin-bottom:16px">Pricing &amp; shipping</h3><div class="ad-grid3">' +
      '<div class="ad-f"><label class="ad-lab">Currency symbol</label><input class="ad-in" value="' + esc(s.currency) + '" onchange="Admin.setS(\'currency\',this.value)"></div>' +
      '<div class="ad-f"><label class="ad-lab">Free shipping above</label><input class="ad-in" type="number" value="' + s.freeShipThreshold + '" onchange="Admin.setS(\'freeShipThreshold\',+this.value)"></div>' +
      '<div class="ad-f"><label class="ad-lab">Flat shipping charge</label><input class="ad-in" type="number" value="' + s.shippingFlat + '" onchange="Admin.setS(\'shippingFlat\',+this.value)"></div>' +
      '<div class="ad-f"><label class="ad-lab">COD handling fee</label><input class="ad-in" type="number" value="' + s.codFee + '" onchange="Admin.setS(\'codFee\',+this.value)"></div>' +
      '<div class="ad-f"><label class="ad-lab">Tax on top (%)</label><input class="ad-in" type="number" value="' + s.taxRate + '" onchange="Admin.setS(\'taxRate\',+this.value)"><small class="ad-hint">Leave 0 if prices already include tax.</small></div>' +
      '<div class="ad-f"><label class="ad-lab">Order number prefix</label><input class="ad-in" value="' + esc(s.orderPrefix) + '" onchange="Admin.setS(\'orderPrefix\',this.value)"></div>' +
      '</div></div>' +
      '<div class="ad-card"><h3 style="margin-bottom:16px">Admin password</h3>' +
      '<div class="ad-grid2"><div class="ad-f"><label class="ad-lab">New password</label><input class="ad-in" id="newPw" type="text" placeholder="Choose something strong"></div>' +
      '<div class="ad-f" style="display:flex;align-items:flex-end"><button class="ad-btn" onclick="Admin.changePw()">Update password</button></div></div>' +
      '<small class="ad-hint">This changes the password for the Supabase account you are currently signed in with.</small></div>';
  }

  function vBackup() {
    return '<div class="ad-top"><div><h1 style="font-size:1.9rem">Backup &amp; publish</h1><p>Edits here save straight to Supabase and are live for every visitor immediately — there is nothing to publish.</p></div></div>' +
      '<div class="ad-card" style="margin-bottom:16px"><h3 style="margin-bottom:10px">Keep a backup</h3>' +
      '<p style="margin-bottom:16px">Download a point-in-time snapshot of the live catalogue, in case you ever need to roll back after a mistake.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="ad-btn" onclick="Admin.dlDataJS()">Download catalogue backup (.js)</button>' +
      '<button class="ad-btn ghost" onclick="Admin.dlJSON()">Download JSON backup</button></div></div>' +
      '<div class="ad-card"><h3 style="margin-bottom:10px">Restore a backup</h3>' +
      '<p style="margin-bottom:14px">Load a JSON backup file. This overwrites the live catalogue for every visitor — use it to roll back, not casually.</p>' +
      '<input type="file" id="restoreIn" accept=".json,application/json" class="ad-in"></div>';
  }
  document.addEventListener('change', function (e) {
    if (e.target.id === 'restoreIn' && e.target.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try {
          S.importJSON(fr.result).then(function (ok) {
            if (ok) { toast('Backup restored'); render(); } else toast('Could not save the restored backup', 'err');
          });
        } catch (err) { toast(err.message, 'err'); }
      };
      fr.readAsText(e.target.files[0]);
    }
  });

  function download(name, text, type) {
    var b = new Blob([text], { type: type || 'text/plain' }), u = URL.createObjectURL(b);
    var a = document.createElement('a'); a.href = u; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
  }
  function pickImage(cb, max) {
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = function () { if (i.files[0]) compress(i.files[0], max || 1400, cb); };
    i.click();
  }

  window.Admin = {
    editProduct: editProduct,
    closeModal: function () { $('#adModal').classList.remove('open'); document.body.style.overflow = ''; },
    rmImg: function (i) { editing.images.splice(i, 1); drawImgs(); },
    addUrl: function () { var v = $('#fUrl').value.trim(); if (v) { editing.images.push(v); $('#fUrl').value = ''; drawImgs(); } },
    saveProduct: function (id) {
      var name = $('#fName').value.trim();
      if (!name) { toast('Give the product a name', 'err'); return; }
      if (!editing.images.length) { toast('Add at least one photo', 'err'); return; }
      var p = editing;
      p.name = name;
      p.id = id || slug(name) || ('p' + Date.now());
      p.price = +$('#fPrice').value || 0;
      p.mrp = +$('#fMrp').value || p.price;
      p.stock = +$('#fStock').value || 0;
      p.category = $('#fCat').value;
      p.badge = $('#fBadge').value;
      p.sku = $('#fSku').value.trim() || ('TM-' + p.id.toUpperCase().replace(/-/g, '').slice(0, 10));
      p.occasions = $$('[data-occ]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.occ; });
      p.short = $('#fShort').value.trim();
      p.description = $('#fDesc').value.trim() || p.short;
      p.colors = $('#fColors').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      p.materials = $('#fMats').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      p.rating = Math.min(5, Math.max(0, +$('#fRating').value || 4.8));
      p.includes = $('#fIncludes').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      p.active = $('#fActive').checked;
      p.featured = $('#fFeat').checked;
      if (!id) { var db = S.db(); if (db.products.some(function (x) { return x.id === p.id; })) p.id += '-' + Date.now().toString().slice(-4); }
      S.upsertProduct(p);
      this.closeModal(); toast(id ? 'Product updated' : 'Product added'); render();
    },
    dupProduct: function (id) {
      var p = S.product(id); p.id = p.id + '-copy-' + Date.now().toString().slice(-4); p.name = p.name + ' (copy)';
      S.upsertProduct(p); toast('Duplicated'); render();
    },
    delProduct: function (id) { if (confirm('Delete this product permanently?')) { S.deleteProduct(id); toast('Deleted'); render(); } },
    toggleActive: function (id) { var p = S.product(id); p.active = p.active === false; S.upsertProduct(p); render(); },
    addCat: function () {
      var n = prompt('Category name?'); if (!n) return;
      var db = S.db(); db.categories.push({ id: slug(n), name: n, tag: '', image: db.categories[0].image }); save('Category added'); render();
    },
    setCat: function (i, k, v) { S.db().categories[i][k] = v; save('Saved'); },
    delCat: function (i) { if (confirm('Delete this category?')) { S.db().categories.splice(i, 1); save('Deleted'); render(); } },
    catImg: function (i) { pickImage(function (d) { S.db().categories[i].image = d; save('Photo updated'); render(); }); },
    addOcc: function () { var n = prompt('Occasion name?'); if (!n) return; S.db().occasions.push({ id: slug(n), name: n }); save('Added'); render(); },
    delOcc: function (i) { S.db().occasions.splice(i, 1); save('Removed'); render(); },
    addCoupon: function () { S.db().coupons.unshift({ code: 'NEWCODE', type: 'percent', value: 10, min: 0, active: true, note: '10% off' }); save('Coupon added'); render(); },
    setCoupon: function (i, k, v) { S.db().coupons[i][k] = v; save('Saved'); if (k === 'active' || k === 'type') render(); },
    delCoupon: function (i) { S.db().coupons.splice(i, 1); save('Deleted'); render(); },
    saveAnn: function () { S.db().settings.announcements = $('#annBox').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); save('Announcements saved'); },
    addHero: function () { var db = S.db(); db.hero.push({ eyebrow: 'New', title: 'Your headline here', sub: 'A short supporting line.', cta: 'Shop now', link: 'shop.html', cta2: 'Learn more', link2: 'about.html', image: db.hero[0].image }); save('Slide added'); render(); },
    setHero: function (i, k, v) { S.db().hero[i][k] = v; save('Saved'); },
    moveHero: function (i, dir) {
      var hero = S.db().hero, j = i + dir;
      if (j < 0 || j >= hero.length) return;
      var tmp = hero[i]; hero[i] = hero[j]; hero[j] = tmp;
      save('Slide order updated'); render();
    },
    delHero: function (i) { if (S.db().hero.length < 2) { toast('Keep at least one slide', 'err'); return; } S.db().hero.splice(i, 1); save('Deleted'); render(); },
    heroImg: function (i) { pickImage(function (d) { S.db().hero[i].image = d; save('Banner updated'); render(); }, 1800); },
    setOrder: function (id, st) {
      S.updateOrder(id, { status: st }).then(function (ok) {
        if (ok) {
          var o = ordersCache.filter(function (x) { return x.id === id; })[0];
          if (o) o.status = st;
          toast('Order marked ' + st);
        } else toast('Could not update the order', 'err');
      });
    },
    delOrder: function (id) {
      if (!confirm('Delete order ' + id + ' permanently?')) return;
      S.deleteOrder(id).then(function (ok) {
        if (ok) { ordersCache = ordersCache.filter(function (x) { return x.id !== id; }); toast('Order deleted'); render(); }
        else toast('Could not delete the order', 'err');
      });
    },
    delLead: function (id) {
      if (!confirm('Delete this enquiry permanently?')) return;
      S.deleteLead(id).then(function (ok) {
        if (ok) { leadsCache = leadsCache.filter(function (x) { return x.id !== id; }); toast('Deleted'); render(); }
        else toast('Could not delete', 'err');
      });
    },
    viewOrder: function (i) {
      var o = ordersCache[i];
      $('#modalBody').innerHTML = '<div class="ad-top" style="margin-bottom:16px"><h2 style="font-size:1.4rem">Order ' + o.id + '</h2>' +
        '<button class="ad-btn ghost sm" onclick="Admin.closeModal()">Close</button></div>' +
        '<div class="ad-grid2"><div class="ad-card"><h3 style="font-size:1.05rem;margin-bottom:10px">Customer</h3>' +
        ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode'].map(function (k) {
          return '<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut);text-transform:capitalize">' + k + '</span><b style="text-align:right">' + esc(o.customer[k] || '-') + '</b></div>';
        }).join('') + '</div>' +
        '<div class="ad-card"><h3 style="font-size:1.05rem;margin-bottom:10px">Payment</h3>' +
        '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut)">Method</span><b>' + (o.payment === 'cod' ? 'Cash on delivery' : 'Prepaid') + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut)">Payment status</span>' + paymentBadge(o).replace('<br>', ' ') + '</div>' +
        (o.razorpay_payment_id ? '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut)">Razorpay payment ID</span><b style="font-size:.78rem">' + esc(o.razorpay_payment_id) + '</b></div>' : '') +
        '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut)">Subtotal</span><b>' + S.money(o.totals.sub) + '</b></div>' +
        (o.totals.discount ? '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut)">Discount</span><b>-' + S.money(o.totals.discount) + '</b></div>' : '') +
        '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:.86rem"><span style="color:var(--ad-mut)">Shipping</span><b>' + S.money(o.totals.shipping) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid var(--ad-line);margin-top:6px"><b>Total</b><b style="color:var(--gold-light)">' + S.money(o.totals.total) + '</b></div>' +
        (o.gift ? '<p style="margin-top:10px;font-size:.84rem">Gift order - no invoice inside.<br>Card message: "' + esc(o.note) + '"</p>' : '') + '</div></div>' +
        '<div class="ad-card" style="margin-top:14px"><h3 style="font-size:1.05rem;margin-bottom:10px">Items</h3><table class="ad-table"><tbody>' +
        o.items.map(function (it) {
          return '<tr><td><img src="' + esc(it.image) + '" alt=""></td><td>' + esc(it.name) + (it.variant ? '<br><small style="color:var(--ad-mut)">' + esc(it.variant) + '</small>' : '') + '</td>' +
            '<td>x ' + it.qty + '</td><td style="text-align:right"><b>' + S.money(it.price * it.qty) + '</b></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">' +
        '<a class="ad-btn" href="' + S.waLink(S.orderMessage(o)) + '" target="_blank" rel="noopener">Open in WhatsApp</a>' +
        '<button class="ad-btn ghost" onclick="Admin.closeModal()">Close</button></div>';
      $('#adModal').classList.add('open'); document.body.style.overflow = 'hidden';
    },
    exportOrders: function () {
      var o = ordersCache;
      /* checkout is anonymous, so every one of these fields can be anything an attacker chooses —
         guard against CSV/formula injection (a cell starting with =, +, -, @ or a control char
         can execute as a formula when the file is opened in Excel/Sheets). */
      function csvSafe(v) {
        var s = String(v == null ? '' : v);
        return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
      }
      var rows = [['Order ID', 'Date', 'Status', 'Name', 'Phone', 'Email', 'Address', 'City', 'State', 'PIN', 'Payment', 'Items', 'Total']];
      o.forEach(function (x) {
        rows.push([x.id, new Date(x.created_at).toLocaleString('en-IN'), x.status, x.customer.name, x.customer.phone, x.customer.email,
          x.customer.address, x.customer.city, x.customer.state, x.customer.pincode, x.payment,
          x.items.map(function (i) { return i.name + ' x' + i.qty; }).join(' | '), x.totals.total]);
      });
      download('memora-orders-' + Date.now() + '.csv', rows.map(function (r) { return r.map(function (c) { return '"' + csvSafe(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n'), 'text/csv');
    },
    addPost: function () {
      var db = S.db();
      db.blog.unshift({ slug: 'new-article-' + Date.now().toString().slice(-4), title: 'New article title', category: 'Gifting Guide', excerpt: 'A one-line summary of the article.', image: db.blog[0].image, date: new Date().toISOString().slice(0, 10), read: '4 min read', author: 'Team Memora' });
      save('Article added'); render();
    },
    setPost: function (i, k, v) { S.db().blog[i][k] = v; save('Saved'); },
    delPost: function (i) { if (confirm('Delete this article?')) { S.db().blog.splice(i, 1); save('Deleted'); render(); } },
    postImg: function (i) { pickImage(function (d) { S.db().blog[i].image = d; save('Photo updated'); render(); }, 1400); },
    addTesti: function () { S.db().testimonials.unshift({ name: 'New customer', city: 'City', text: 'What they said about the gift.', rating: 5 }); save('Added'); render(); },
    setTesti: function (i, k, v) { S.db().testimonials[i][k] = v; save('Saved'); },
    delTesti: function (i) { S.db().testimonials.splice(i, 1); save('Deleted'); render(); },
    addFaq: function () { S.db().faqs.push({ q: 'New question?', a: 'The answer.' }); save('Added'); render(); },
    setFaq: function (i, k, v) { S.db().faqs[i][k] = v; save('Saved'); },
    delFaq: function (i) { S.db().faqs.splice(i, 1); save('Deleted'); render(); },
    setS: function (k, v) { S.db().settings[k] = v; save('Saved'); },
    logoUpload: function () { pickImage(function (d) { S.db().settings.logo = d; save('Logo updated'); render(); }, 400); },
    changePw: function () {
      var v = $('#newPw').value.trim();
      if (v.length < 6) { toast('Use at least 6 characters', 'err'); return; }
      S.changePassword(v).then(function (ok) {
        if (ok) { toast('Password updated'); $('#newPw').value = ''; } else toast('Could not update the password', 'err');
      });
    },
    dlDataJS: function () { download('memora-catalogue-backup.js', S.exportDataJS(), 'application/javascript'); toast('Saved a point-in-time backup'); },
    dlJSON: function () { download('memora-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportJSON(), 'application/json'); }
  };

  Promise.all([S.ready(), S.initSession()]).then(function (r) {
    var session = r[1];
    if (!session) { showLogin(); return; }
    return S.isCurrentUserAdmin().then(function (isAdmin) {
      if (isAdmin) { showApp(); return; }
      /* a real customer account, not the admin — RLS already blocks every
         write/read this panel would try, but bounce them out cleanly
         instead of showing a shell full of permission errors */
      S.logout().then(function () {
        showLogin();
        $('#loginErr').textContent = 'That account does not have admin access.';
      });
    });
  }).catch(function (err) {
    console.error(err);
    showLogin();
    $('#loginErr').textContent = 'Could not reach Supabase — check assets/js/config.js.';
  });
})();
