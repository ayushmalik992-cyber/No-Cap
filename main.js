(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x) { return x < 0 ? 0 : (x > 1 ? 1 : x); };
  var eIn = function (t) { return t * t; };
  var eOut = function (t) { return 1 - (1 - t) * (1 - t); };
  var eIO = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var rupee = function (n) { return '₹' + n; };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Shared: fade a stack of headlines in and out over [start, end] ranges
     ------------------------------------------------------------------ */
  function fadeHeads(els, defs, seg) {
    var best = 0, bestO = -1;
    defs.forEach(function (h, i) {
      var inn = h[0] < 0 ? 1 : seg(h[0] - 0.03, h[0]);
      var out = 1 - seg(h[1] - 0.03, h[1]);
      var o = Math.min(inn, out);
      var el = els[i];
      el.style.opacity = o.toFixed(3);
      el.style.transform = 'translateY(' + ((1 - o) * 14).toFixed(1) + 'px)';
      el.setAttribute('aria-hidden', o < 0.5 ? 'true' : 'false');
      if (o > bestO) { bestO = o; best = i; }
    });
    return best;
  }

  function fadeCta(el, ct) {
    el.style.opacity = ct.toFixed(3);
    el.style.transform = 'translateY(' + ((1 - ct) * 12).toFixed(1) + 'px)';
    el.style.pointerEvents = ct > 0.5 ? 'auto' : 'none';
    el.inert = ct <= 0.5;
  }

  /* ==================================================================
     OPENER: shrinking packet + cracking price tag
     ================================================================== */
  var OP_HEADS = [[-1, 0.16], [0.16, 0.45], [0.45, 0.8], [0.8, 2]];
  var op = {
    stage: $('#openerStage'),
    heads: $$('#openerStage [data-heads] .head'),
    count: $('#openerStage [data-count]'),
    meter: $('#opMeter'), unit: $('#opUnit'),
    pack: $('#opPack'), wrinkle: $('#opWrinkle'), sticker: $('#opSticker'), wt: $('#opWt'),
    string: $('#opString'), tag: $('#opTag'), halves: $$('#opTag [data-half]'), crack: $('#opCrack'),
    olds: $$('#opTag .face--old'), news: $$('#opTag .face--new'),
    shelf: $('#opShelf'), callL: $('#opCallL'), callR: $('#opCallR'),
    callWt: $('#opCallWt'), callWas: $('#opCallWas'), callBar: $('#opCallBar'), callDelta: $('#opCallDelta'),
    callUnit: $('#opCallUnit'), callUnitBar: $('#opCallUnitBar'), callPct: $('#opCallPct'),
    delta: $('#opDelta'), stats: $$('#opStats .stat'),
    cta: $('#opCta'), hint: $('#opHint'), bar: $('#opBar'),
    sepX: 58, sepScale: 0.76
  };

  // Crimped packet seams never change, so build them once.
  function zig(y0, yIn, yOut) {
    var s = 'M24,' + y0 + ' L24,' + yIn;
    for (var x = 24, i = 0; x <= 276; x += 6, i++) s += ' L' + x + ',' + (i % 2 ? yOut : yIn);
    return s + ' L276,' + yIn + ' L276,' + y0 + ' Z';
  }
  $('#crimpTop').setAttribute('d', zig(42, 22, 15));
  $('#crimpBot').setAttribute('d', zig(328, 346, 352));
  var ridges = '';
  for (var rx = 30; rx <= 270; rx += 6) ridges += 'M' + rx + ',23V41M' + rx + ',329V345';
  $('#crimpRidges').setAttribute('d', ridges);

  // Scale the illustration to the stage, and keep the split tag halves on-screen on phones.
  function fitOpener() {
    var h = op.stage.clientHeight;
    var used = 48 + 54 + $('[data-heads]', op.stage).offsetHeight + op.meter.offsetHeight + op.cta.offsetHeight;
    var s = Math.max(0.5, Math.min(1, (h - used) / 560, (window.innerWidth - 16) / 360));
    op.stage.style.setProperty('--art-scale', s.toFixed(3));
    var T = Math.min(340, window.innerWidth * 0.84);
    var W = Math.min(640, (window.innerWidth - 24) / s);
    op.sepScale = Math.min(0.76, (W - 16) / (2 * T));
    op.sepX = Math.min(58, (W - op.sepScale * T) / 2 / T * 100);
  }

  function renderOpener(p) {
    var seg = function (a, b) { return clamp((p - a) / (b - a)); };
    var idx = fadeHeads(op.heads, OP_HEADS, seg);
    op.count.textContent = '0' + (idx + 1);

    var d = eIO(seg(0.17, 0.42));
    var w = Math.round(250 - 65 * d);
    var gone = seg(0.47, 0.57);
    var swingFade = 1 - seg(0.4, 0.5);
    var swing = -4 * Math.cos(p * 48) * swingFade;
    var lift = eOut(seg(0.44, 0.55));
    var shake = (!reduceMotion && p > 0.47 && p < 0.53) ? Math.sin(p * 900) * 4 : 0;
    var sep = eIO(seg(0.53, 0.66));
    var heal = seg(0.56, 0.68);

    // Clip each half along the crack, then "heal" each into a full tag as they separate.
    var cx = [52, 46, 54, 47, 50], cy = [0, 25, 50, 75, 100];
    var lp = ['0% 0%'], rp = [];
    cx.forEach(function (c, i) { lp.push((c + (100 - c) * heal).toFixed(2) + '% ' + cy[i] + '%'); });
    lp.push('0% 100%');
    for (var i = cx.length - 1; i >= 0; i--) rp.push((cx[i] * (1 - heal)).toFixed(2) + '% ' + cy[i] + '%');
    rp = rp.reverse();
    var rpoly = [rp[0], '100% 0%', '100% 100%'].concat(rp.slice(1).reverse());
    var sc = 1 - (1 - op.sepScale) * sep;
    var tx = op.sepX * sep;

    op.halves[0].style.clipPath = 'polygon(' + lp.join(',') + ')';
    op.halves[0].style.transform = 'translateX(' + (-tx).toFixed(2) + '%) rotate(' + (-5 * sep).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
    op.halves[1].style.clipPath = 'polygon(' + rpoly.join(',') + ')';
    op.halves[1].style.transform = 'translateX(' + tx.toFixed(2) + '%) rotate(' + (5 * sep).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';

    var mOp = seg(0.16, 0.2) * (1 - seg(0.44, 0.48));
    var pop = seg(0.33, 0.37);

    op.wt.textContent = w + 'g';
    op.unit.textContent = '₹' + (10000 / w).toFixed(1);
    op.unit.classList.toggle('is-alert', d > 0.5);
    op.meter.style.opacity = mOp.toFixed(3);
    op.pack.style.opacity = (1 - gone).toFixed(3);
    op.pack.style.transform = 'translateY(' + (-70 * gone).toFixed(1) + 'px) scale(' + (1 - 0.16 * d).toFixed(3) + ',' + (1 - 0.28 * d).toFixed(3) + ')';
    op.wrinkle.style.opacity = (d * 0.95).toFixed(3);
    op.sticker.style.opacity = pop.toFixed(3);
    op.sticker.style.transform = 'rotate(14deg) scale(' + (pop > 0 ? 0.6 + 0.4 * eOut(pop) : 0.6).toFixed(3) + ')';
    op.string.style.opacity = (1 - seg(0.42, 0.47)).toFixed(3);
    op.tag.style.transform = 'translate(calc(-50% + ' + shake.toFixed(1) + 'px),' + (-340 * lift).toFixed(1) + 'px) rotate(' + swing.toFixed(2) + 'deg)';
    op.crack.style.opacity = (seg(0.47, 0.5) * (1 - seg(0.53, 0.56))).toFixed(3);
    var oldO = (1 - seg(0.56, 0.61)).toFixed(3), newO = seg(0.61, 0.67).toFixed(3);
    op.olds.forEach(function (el) { el.style.opacity = oldO; });
    op.news.forEach(function (el) { el.style.opacity = newO; });

    // Shelf and annotations frame the first two beats, then clear out for the price split.
    var shelfOut = seg(0.4, 0.5);
    op.shelf.style.opacity = (1 - shelfOut).toFixed(3);
    op.shelf.style.transform = 'translateY(' + (shelfOut * 28).toFixed(1) + 'px)';
    var cOut = seg(0.42, 0.47);
    var unit = 10000 / w;
    op.callL.style.opacity = op.callR.style.opacity = (1 - cOut).toFixed(3);
    op.callL.style.transform = 'translateX(' + (-30 * cOut).toFixed(1) + 'px)';
    op.callR.style.transform = 'translateX(' + (30 * cOut).toFixed(1) + 'px)';
    op.callWt.textContent = w + 'g';
    op.callWt.classList.toggle('is-alert', d > 0.5);
    op.callWas.style.opacity = d > 0.02 ? '1' : '0';
    op.callBar.style.width = (w / 250 * 100).toFixed(1) + '%';
    op.callBar.classList.toggle('is-alert', d > 0.5);
    op.callDelta.textContent = d > 0.02 ? '−' + (250 - w) + 'g · same MRP' : 'Last year’s pack';
    op.callDelta.classList.toggle('is-alert', d > 0.5);
    op.callUnit.textContent = '₹' + unit.toFixed(1);
    op.callUnit.classList.toggle('is-alert', d > 0.5);
    op.callUnitBar.style.width = (unit / 54.1 * 100).toFixed(1) + '%';
    op.callUnitBar.classList.toggle('is-alert', d > 0.5);
    var pct = Math.round(unit / 40 * 100 - 100);
    op.callPct.textContent = pct > 0 ? '+' + pct + '% for the same ₹100' : 'MRP ₹100 · unchanged';
    op.callPct.classList.toggle('is-alert', d > 0.5);

    // End state: the gap between the two tags, then the takeaway stats.
    var dp = seg(0.64, 0.7);
    op.delta.style.opacity = dp.toFixed(3);
    op.delta.style.transform = 'scale(' + (dp > 0 ? 0.4 + 0.6 * eOut(dp) : 0.4).toFixed(3) + ') rotate(' + (-12 * (1 - dp)).toFixed(1) + 'deg)';
    op.stats.forEach(function (el, i) {
      var t = eOut(seg(0.7 + i * 0.03, 0.77 + i * 0.03));
      el.style.opacity = t.toFixed(3);
      el.style.transform = 'translateY(' + ((1 - t) * 18).toFixed(1) + 'px)';
    });

    fadeCta(op.cta, seg(0.84, 0.92));
    op.hint.style.opacity = (1 - seg(0, 0.04)).toFixed(3);
    op.bar.style.width = (p * 100).toFixed(2) + '%';
  }

  /* ==================================================================
     HOOK: fee drips + scan beam + OVERCHARGED stamp
     ================================================================== */
  var HK_HEADS = [[-1, 0.1], [0.1, 0.6], [0.6, 0.78], [0.78, 2]];
  var DROPS = [
    { a: 5, b: 5, la: 'Platform fee', lb: 'Platform fee', line: 'Platform fee', flag: false },
    { a: 20, b: 20, la: 'Rain surge', lb: 'Rain surge', line: 'Rain surge', flag: false },
    { a: 18, b: 9, la: 'Handling', lb: 'Handling', line: 'Handling fee', flag: true },
    { a: 15, b: 0, la: 'Low-battery surge', line: 'Surge (device)', flag: true },
    { a: 19, b: 0, la: 'Insurance ✓', line: 'Insurance ✓', flag: true },
    { a: 34, b: 0, la: 'Cart markup', line: null, flag: true }
  ];
  var DROP_ICON = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M6 1 C6 1 1.5 6.5 1.5 9 A4.5 4.5 0 0 0 10.5 9 C10.5 6.5 6 1 6 1 Z"/></svg>';

  var hk = {
    heads: $$('#hookStage [data-heads] .head'),
    beam: $('#hkBeam'), stamp: $('#hkStamp'), diff: $('#hkDiff'),
    cta: $('#hkCta'), hint: $('#hkHint'), bar: $('#hkBar'),
    sides: {}
  };

  ['a', 'b'].forEach(function (which) {
    var col = $('.phone-col[data-side="' + which + '"]');
    var dropsHost = $('[data-drops]', col), linesHost = $('[data-lines]', col);
    var items = [];
    DROPS.forEach(function (d, i) {
      var amt = d[which];
      if (!amt) return;
      var drop = document.createElement('div');
      drop.className = 'drop';
      drop.innerHTML = DROP_ICON + (which === 'a' ? d.la : d.lb) + ' +₹' + amt;
      dropsHost.appendChild(drop);
      var line = null;
      if (d.line) {
        line = document.createElement('div');
        line.className = 'pl';
        line.style.opacity = '0';
        line.innerHTML = '<span>' + d.line + '</span><span>₹' + amt + '</span>';
        linesHost.appendChild(line);
      }
      items.push({ i: i, d: d, amt: amt, drop: drop, line: line });
    });
    hk.sides[which] = {
      items: items,
      cart: $('[data-cart]', col), cartAmt: $('[data-cart-amt]', col), total: $('[data-total]', col)
    };
  });

  // Scale both phones together so the whole scene fits short viewports.
  function fitHook() {
    var stage = $('#hookStage'), phones = $('.phones', stage), fit = $('.phones-fit', stage);
    var nat = phones.offsetHeight;
    fit.style.setProperty('--phones-h', nat + 'px');
    var used = 48 + 52 + $('[data-heads]', stage).offsetHeight + hk.cta.offsetHeight;
    var s = Math.max(0.55, Math.min(1, (stage.clientHeight - used) / nat, (window.innerWidth - 24) / phones.offsetWidth));
    stage.style.setProperty('--phones-scale', s.toFixed(3));
  }

  function renderHook(p) {
    var seg = function (a, b) { return clamp((p - a) / (b - a)); };
    fadeHeads(hk.heads, HK_HEADS, seg);
    var flagOn = seg(0.64, 0.7) > 0.5;

    var side = function (which) {
      var s = hk.sides[which], total = 420, mark = 0;
      s.items.forEach(function (it) {
        var st = 0.12 + it.i * 0.075;
        var t = seg(st, st + 0.07);
        var land = seg(st + 0.06, st + 0.08);
        var y = -380 + 410 * eIn(t);
        var o = t <= 0 || t >= 1 ? 0 : (t > 0.85 ? (1 - t) / 0.15 : 1);
        it.drop.style.opacity = o.toFixed(3);
        it.drop.style.transform = 'translate(-50%,' + y.toFixed(1) + 'px)';
        total += it.amt * land;
        if (it.line) {
          it.line.style.opacity = land.toFixed(3);
          it.line.style.transform = 'translateY(' + ((1 - land) * -8).toFixed(1) + 'px)';
          it.line.classList.toggle('is-flagged', which === 'a' && it.d.flag && flagOn);
        } else {
          mark = land;
        }
      });
      s.cartAmt.textContent = mark > 0.5 ? '₹454' : '₹420';
      s.cart.classList.toggle('is-flagged', which === 'a' && mark > 0.5 && flagOn);
      s.total.textContent = '₹' + Math.round(total);
      return total;
    };
    var A = side('a'), B = side('b');

    var bt = seg(0.6, 0.7);
    var st2 = seg(0.78, 0.84);
    hk.diff.textContent = '+₹' + Math.round(A - B);
    hk.beam.style.left = (bt * 100).toFixed(2) + '%';
    hk.beam.style.opacity = bt > 0 && bt < 1 ? '1' : '0';
    hk.stamp.style.opacity = st2.toFixed(3);
    hk.stamp.style.transform = 'translate(-50%,-50%) rotate(-10deg) scale(' + (1.7 - 0.7 * eOut(st2)).toFixed(3) + ')';
    fadeCta(hk.cta, seg(0.86, 0.92));
    hk.hint.style.opacity = (1 - seg(0, 0.04)).toFixed(3);
    hk.bar.style.width = (p * 100).toFixed(2) + '%';
  }

  /* ------------------------------------------------------------------
     Scroll progress: 0 when the track's top hits the viewport top,
     1 when its bottom meets the bottom of the sticky stage.
     ------------------------------------------------------------------ */
  var scrollies = [
    { el: $('#opener'), stage: op.stage, p: -1, render: renderOpener },
    { el: $('#hook'), stage: $('#hookStage'), p: -1, render: renderHook }
  ];
  function measure(force) {
    scrollies.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var sh = s.stage ? s.stage.offsetHeight : window.innerHeight;
      var span = r.height - sh;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      if (force === true || Math.abs(p - s.p) > 0.0005) { s.p = p; s.render(p); }
    });
  }
  var raf = null;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; measure(); navOnScroll(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { fitOpener(); fitHook(); measure(true); });

  /* ==================================================================
     NAV + TICKER + REVEAL
     ================================================================== */
  var nav = $('#nav'), navToggle = $('.nav__toggle'), lastY = window.scrollY;
  function navOnScroll() {
    var y = window.scrollY;
    var open = nav.classList.contains('nav--open');
    nav.classList.toggle('nav--hidden', !open && y > lastY && y > 120);
    lastY = y;
  }
  function setMenu(open) {
    nav.classList.toggle('nav--open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  }
  navToggle.addEventListener('click', function () { setMenu(!nav.classList.contains('nav--open')); });
  $$('#navLinks a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var track = $('#tickerTrack');
  $$('.ticker__item', track).forEach(function (item) {
    var c = item.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(c);
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ==================================================================
     SIMULATOR
     ================================================================== */
  var GROUPS = [
    ['Device', 'phone', [['flagship', 'Flagship phone'], ['mid', 'Mid-range Android']]],
    ['Battery', 'battery', [['low', '9% battery'], ['high', '85% battery']]],
    ['History', 'buyer', [['frequent', 'Frequent buyer'], ['new', 'New session']]]
  ];
  var REASONS = {
    items: ['Personalised item markup', 'Same products, higher shelf price on this profile.', 'Price discrimination'],
    delivery: ['Selective fee waiver', 'Delivery waived only for the other session.', 'Drip pricing'],
    handling: ['Account-based handling fee', 'Identical order, different handling charge.', 'Drip pricing'],
    surge: ['Unexplained surge', 'Both share the same weather; the gap tracks battery level.', 'Drip pricing'],
    addon: ['Pre-ticked add-on', 'Insurance added to the cart without consent.', 'Basket sneaking']
  };
  var FLAG_ICON = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2 L16.5 15.5 H1.5 Z"/><path d="M9 7v3.5M9 12.6v.2"/></svg>';

  function defaults() {
    return { a: { phone: 'flagship', battery: 'low', buyer: 'frequent' }, b: { phone: 'mid', battery: 'high', buyer: 'new' } };
  }
  var state = Object.assign(defaults(), { rain: true, pdf: 'idle', q: '', cat: 'All', platform: 'Grocery', zone: 8 });

  function bill(p, rain) {
    var items = Math.round(420 * (1 + (p.phone === 'flagship' ? 0.05 : 0) + (p.battery === 'low' ? 0.03 : 0)));
    return [
      { key: 'items', label: 'Items (6)', amt: items },
      { key: 'delivery', label: 'Delivery fee', amt: p.buyer === 'new' ? 0 : 25 },
      { key: 'handling', label: 'Handling fee', amt: p.buyer === 'frequent' ? 18 : 9 },
      { key: 'surge', label: 'Surge fee', amt: (rain ? 20 : 0) + (p.battery === 'low' ? 15 : 0) },
      { key: 'platform', label: 'Platform fee', amt: 5 },
      { key: 'addon', label: 'Insurance (pre-ticked)', amt: p.buyer === 'frequent' ? 19 : 0 }
    ];
  }

  function tween(el, to, fmt) {
    fmt = fmt || rupee;
    var has = el.dataset.v !== undefined, from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (!has || reduceMotion || from === to) { el.textContent = fmt(to); return; }
    cancelAnimationFrame(el._raf);
    var t0 = performance.now(), dur = 480;
    var step = function (now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  var sim = {};
  ['a', 'b'].forEach(function (key) {
    var card = $('[data-profile="' + key + '"]');
    $('[data-groups]', card).innerHTML = GROUPS.map(function (g) {
      return '<div class="group" role="group" aria-label="' + g[0] + '"><div class="group__label">' + g[0] + '</div><div class="opts">' +
        g[2].map(function (o) {
          return '<button type="button" class="chip chip--opt" data-key="' + key + '" data-field="' + g[1] + '" data-value="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    var linesHost = $('[data-lines]', card);
    linesHost.innerHTML = bill(state[key], state.rain).map(function (l) {
      return '<div class="row"><span>' + l.label + '</span><span class="amt"></span></div>';
    }).join('');
    sim[key] = { card: card, rows: $$('.row', linesHost), total: $('[data-total]', card), buttons: $$('[data-field]', card) };
  });

  var verdictEl = $('#verdict');
  var vd = { lead: $('[data-lead]', verdictEl), num: $('[data-num]', verdictEl), sub: $('[data-sub]', verdictEl), flags: $('[data-flags]', verdictEl) };
  var rainBtn = $('#rainBtn'), pdfBtn = $('#pdfBtn'), pdfNote = $('#pdfNote'), findingsEl = $('#findings'), stampEl = $('#stamp');
  var lastFlagsKey = null;

  function renderSim() {
    var billA = bill(state.a, state.rain), billB = bill(state.b, state.rain);
    var sum = function (b) { return b.reduce(function (t, l) { return t + l.amt; }, 0); };
    var tA = sum(billA), tB = sum(billB);

    [['a', billA, billB, tA], ['b', billB, billA, tB]].forEach(function (s) {
      var ui = sim[s[0]], mine = s[1], other = s[2];
      ui.buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(state[s[0]][btn.dataset.field] === btn.dataset.value));
      });
      mine.forEach(function (l, i) {
        var row = ui.rows[i], amtEl = row.lastChild;
        var hot = l.amt > other[i].amt || (l.key === 'addon' && l.amt > 0);
        row.classList.toggle('is-hot', hot);
        var txt = rupee(l.amt);
        if (amtEl.textContent && amtEl.textContent !== txt && !reduceMotion) {
          amtEl.classList.remove('is-bump'); void amtEl.offsetWidth; amtEl.classList.add('is-bump');
        }
        amtEl.textContent = txt;
      });
      tween(ui.total, s[3]);
    });

    var hiA = tA >= tB, hi = hiA ? billA : billB, lo = hiA ? billB : billA;
    var flags = [];
    hi.forEach(function (l, i) {
      var r = REASONS[l.key];
      if (!r) return;
      if (l.amt > lo[i].amt || (l.key === 'addon' && l.amt > 0)) flags.push({ title: r[0], why: r[1], law: r[2] });
    });
    var diff = Math.abs(tA - tB);
    var pct = Math.round(diff / Math.min(tA, tB) * 100);
    var none = flags.length === 0;

    verdictEl.classList.toggle('is-fair', diff === 0);
    vd.lead.textContent = diff === 0 ? 'Bills match' : 'Profile ' + (hiA ? 'A' : 'B') + ' is paying more';
    tween(vd.num, diff, function (n) { return n === 0 ? '₹0' : '+₹' + n; });
    vd.sub.textContent = diff === 0 ? 'No personalised pricing detected.' : pct + '% more for the identical cart';

    // Only rebuild the flag lists when they actually change, so the entry animation means something.
    var flagsKey = flags.map(function (f) { return f.title; }).join('|');
    if (flagsKey !== lastFlagsKey) {
      lastFlagsKey = flagsKey;
      vd.flags.innerHTML = none
        ? '<div class="verdict__none">No discrepancies. Both profiles see the same bill.</div>'
        : flags.map(function (f, i) {
          return '<div class="flag" style="animation-delay:' + (i * 50) + 'ms">' + FLAG_ICON + '<div class="flag__text"><span class="flag__title">' + f.title + '</span><span class="flag__why">' + f.why + '</span></div></div>';
        }).join('');
      findingsEl.innerHTML = none
        ? '<div class="findings__none">Nothing to report. Change a profile in the simulator to create a discrepancy.</div>'
        : flags.map(function (f, i) {
          return '<div class="finding" style="animation-delay:' + (i * 50) + 'ms"><span class="finding__title">' + f.title + '</span><span class="finding__law">' + f.law + '</span></div>';
        }).join('');
    }

    rainBtn.setAttribute('aria-pressed', String(state.rain));
    $('[data-label]', rainBtn).textContent = state.rain ? 'Raining: on' : 'Raining: off';

    var d = new Date();
    stampEl.textContent = d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' · Ref NC-' + (tA * 7 + tB);

    pdfBtn.disabled = none;
    pdfBtn.classList.toggle('is-busy', state.pdf === 'busy');
    pdfBtn.classList.toggle('is-done', state.pdf === 'done');
    pdfBtn.textContent = state.pdf === 'done' ? 'Complaint PDF generated' : (state.pdf === 'busy' ? 'Generating…' : 'Generate complaint PDF');
    pdfNote.hidden = state.pdf !== 'done';
  }

  var pdfTimer = null;
  function resetPdf() { clearTimeout(pdfTimer); state.pdf = 'idle'; }

  $('#sim').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-field]');
    if (!btn) return;
    state[btn.dataset.key][btn.dataset.field] = btn.dataset.value;
    resetPdf();
    renderSim();
  });
  rainBtn.addEventListener('click', function () { state.rain = !state.rain; resetPdf(); renderSim(); });
  $('#resetBtn').addEventListener('click', function () {
    Object.assign(state, defaults(), { rain: true });
    resetPdf();
    renderSim();
  });
  pdfBtn.addEventListener('click', function () {
    if (pdfBtn.disabled || state.pdf !== 'idle') return;
    state.pdf = 'busy';
    renderSim();
    pdfTimer = setTimeout(function () { state.pdf = 'done'; renderSim(); }, reduceMotion ? 0 : 900);
  });

  /* ==================================================================
     SHRINKFLATION WALL
     ================================================================== */
  var PRODUCTS = [
    { name: 'Cream biscuits, family pack', cat: 'Snacks', was: 250, now: 185, price: 100, u: 'g' },
    { name: 'Salted potato chips', cat: 'Snacks', was: 60, now: 48, price: 20, u: 'g' },
    { name: 'Instant noodles, 4-pack', cat: 'Staples', was: 280, now: 256, price: 56, u: 'g' },
    { name: 'Refined sunflower oil pouch', cat: 'Staples', was: 1000, now: 870, price: 185, u: 'ml' },
    { name: 'Detergent powder', cat: 'Home', was: 1000, now: 900, price: 110, u: 'g' },
    { name: 'Dishwash bar', cat: 'Home', was: 200, now: 155, price: 25, u: 'g' },
    { name: 'Bathing soap, 4-pack', cat: 'Personal care', was: 500, now: 400, price: 160, u: 'g' },
    { name: 'Toothpaste', cat: 'Personal care', was: 200, now: 150, price: 110, u: 'g' },
    { name: 'Milk chocolate bar', cat: 'Snacks', was: 55, now: 45, price: 40, u: 'g' }
  ];
  var CATS = ['All', 'Snacks', 'Staples', 'Home', 'Personal care'];
  var catsEl = $('#cats'), productsEl = $('#products'), noProducts = $('#noProducts');

  catsEl.innerHTML = CATS.map(function (c) {
    return '<button type="button" class="chip" data-cat="' + c + '" aria-pressed="false">' + c + '</button>';
  }).join('');
  catsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    state.cat = b.dataset.cat;
    renderProducts();
  });
  $('#search').addEventListener('input', function (e) { state.q = e.target.value; renderProducts(); });

  function renderProducts() {
    $$('[data-cat]', catsEl).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)); });
    var q = state.q.trim().toLowerCase();
    var list = PRODUCTS.map(function (p) {
      return Object.assign({}, p, { sev: Math.round((p.was - p.now) / p.was * 100) });
    }).filter(function (p) {
      return (state.cat === 'All' || p.cat === state.cat) && (!q || (p.name + ' ' + p.cat).toLowerCase().indexOf(q) !== -1);
    }).sort(function (x, y) { return y.sev - x.sev; });

    productsEl.innerHTML = list.map(function (p, i) {
      var tier = p.sev >= 20 ? 'hi' : (p.sev >= 12 ? 'mid' : 'lo');
      var before = p.price / p.was * 100, after = p.price / p.now * 100;
      return '<article class="card product" style="animation-delay:' + (i * 40) + 'ms">' +
        '<div class="product__top"><div class="product__id"><span class="product__meta">#' + (i + 1) + ' · ' + p.cat + '</span><span class="product__name">' + p.name + '</span></div>' +
        '<span class="badge badge--' + tier + '">Severity ' + p.sev + '</span></div>' +
        '<div class="cmp">' +
        '<div class="cmp__row"><span>Then</span><div class="track"><div class="fill" style="width:100%"></div></div><span>' + p.was + p.u + '</span></div>' +
        '<div class="cmp__row"><span>Now</span><div class="track"><div class="fill fill--now" style="width:100%" data-w="' + (p.now / p.was * 100).toFixed(1) + '"></div></div><span>' + p.now + p.u + '</span></div>' +
        '</div>' +
        '<div class="product__foot"><div><span class="k">MRP</span><span class="v">₹' + p.price + ' <small>flat</small></span></div>' +
        '<div><span class="k">Per 100' + p.u + '</span><span class="v">₹' + before.toFixed(1) + ' → ₹' + after.toFixed(1) + '</span></div></div>' +
        '</article>';
    }).join('');
    noProducts.hidden = list.length !== 0;

    // Let the "Now" bars shrink from full width so the loss is visible.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        $$('[data-w]', productsEl).forEach(function (f) { f.style.width = f.dataset.w + '%'; });
      });
    });
  }

  /* ==================================================================
     HEATMAP
     ================================================================== */
  var PLATFORMS = [['Grocery', 'Quick-commerce'], ['Cab', 'Cabs'], ['Food', 'Food delivery']];
  var SEEDS = { Grocery: 1, Cab: 2, Food: 3 };
  var ROWS = ['North', 'West', 'Central', 'East'];
  var FEE_TYPES = {
    Grocery: ['Handling fee', 'Small-cart fee', 'Rain fee', 'Platform fee'],
    Cab: ['Surge fee', 'Booking fee', 'Airport fee', 'Peak-hour fee'],
    Food: ['Packaging fee', 'Platform fee', 'Rain fee', 'Long-distance fee']
  };
  var platformsEl = $('#platforms'), zonesEl = $('#zones'), zonePanel = $('#zonePanel');
  var zp = {};
  $$('[data-z]', zonePanel).forEach(function (el) { zp[el.dataset.z] = el; });

  platformsEl.innerHTML = PLATFORMS.map(function (p) {
    return '<button type="button" class="chip" data-platform="' + p[0] + '" aria-pressed="false">' + p[1] + '</button>';
  }).join('');
  platformsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-platform]');
    if (!b) return;
    state.platform = b.dataset.platform;
    buildZones();
  });
  zonesEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-zone]');
    if (!b) return;
    state.zone = +b.dataset.zone;
    renderZone();
  });

  var zoneData = [];
  function buildZones() {
    $$('[data-platform]', platformsEl).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)); });
    var seed = SEEDS[state.platform];
    zoneData = [];
    for (var i = 0; i < 24; i++) {
      var v = (i * 17 + seed * 29 + (i % 5) * seed * 7) % 49;
      zoneData.push({ name: ROWS[Math.floor(i / 6)] + ' ' + (i % 6 + 1), fee: v, lvl: Math.min(4, Math.floor(v / 10)) });
    }
    zonesEl.innerHTML = zoneData.map(function (z, i) {
      return '<button type="button" class="zone h' + z.lvl + '" data-zone="' + i + '" aria-pressed="false" aria-label="' + z.name + ', ₹' + z.fee + ' average hidden fee" style="animation-delay:' + (i * 12) + 'ms">' +
        '<span class="zone__name">' + z.name + '</span><span class="zone__fee">₹' + z.fee + '</span></button>';
    }).join('');
    renderZone();
  }

  function renderZone() {
    $$('[data-zone]', zonesEl).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.zone === state.zone)); });
    var seed = SEEDS[state.platform], z = zoneData[state.zone];
    zp.platform.textContent = state.platform;
    zp.name.textContent = z.name;
    zp.fee.textContent = '₹' + z.fee;
    zp.top.textContent = FEE_TYPES[state.platform][(state.zone + seed) % 4];
    zp.reports.textContent = 12 + ((state.zone * 7 + seed * 13) % 86);
    var tier = z.fee >= 30 ? 'peak' : (z.fee >= 15 ? 'elevated' : 'normal');
    zp.status.textContent = { peak: 'Peak fees active', elevated: 'Elevated', normal: 'Normal' }[tier];
    zp.status.className = 'status--' + tier;
  }

  /* ------------------------------------------------------------------ */
  fitOpener();
  fitHook();
  measure(true);
  renderSim();
  renderProducts();
  buildZones();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitOpener(); fitHook(); measure(true); });
})();
