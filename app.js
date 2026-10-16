/* 구마모토 2박 3일 경로 지도 - 애니메이션/카드 로직 (빌드 없음, Leaflet 1.9.4) */
(function () {
  'use strict';

  var T = window.TRIP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

  function toMin(s) { var a = s.split(':'); return (+a[0]) * 60 + (+a[1]); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(m) { m = Math.round(m); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nm(stop) { return stop.ko + '(' + stop.jp + ')'; }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  /* ---------- 데이터 정리 ---------- */
  var DAYCOLOR = ['#E85D4E', '#7FA82E', '#4F86E8'];
  T.days.forEach(function (d, di) {
    var seen = {}; var count = 0;
    d.nodes.forEach(function (n, i) {
      n.s = T.stops[n.stop];
      n.a = toMin(n.arr); n.d = toMin(n.dep);
      n.photos = (n.photos || []).map(function (p) { return typeof p === 'string' ? { k: p } : p; });
      n.photos.forEach(function (p) { if (p.from) p.fm = toMin(p.from); });
      (n.marks || []).forEach(function (m) { m.m = toMin(m.at); });
      if (n.legIn) { n.legIn.from = n.legIn.from == null ? i - 1 : n.legIn.from; n.legIn.da = toMin(n.legIn.dep); n.legIn.aa = toMin(n.legIn.arr); }
      if (!seen[n.stop]) { seen[n.stop] = ++count; }
      n.num = seen[n.stop];
    });
  });

  /* ---------- 지도 ---------- */
  var map = L.map('map', { zoomControl: false, zoomSnap: 0.25, minZoom: 7, maxZoom: 18 });
  L.control.zoom({ position: 'topright', zoomInTitle: '확대', zoomOutTitle: '축소' }).addTo(map);
  map.setView([32.84, 130.85], 10);
  /* CARTO basemaps는 2025년 이후 API 키 없이 쓰면 "API KEY REQUIRED" 워터마크가 찍힙니다.
     data.js의 TRIP.cartoKey에 무료 키를 넣으면 CARTO light_all/dark_all을, 비워 두면 OpenStreetMap 표준 타일을 씁니다. */
  var KEY = (T.cartoKey || '').trim();
  var ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  var ATTR = ATTR_OSM + (KEY ? ' &copy; <a href="https://carto.com/attributions">CARTO</a>' : '');
  function carto(kind) {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/' + kind + '/{z}/{x}/{y}{r}.png?api_key=' + encodeURIComponent(KEY), { subdomains: 'abcd', maxZoom: 20, attribution: ATTR });
  }
  var tiles = KEY
    ? { light: carto('light_all'), dark: carto('dark_all') }
    : { light: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: ATTR }) };
  tiles.dark = tiles.dark || tiles.light;
  var curTile = null;
  var tilePane = map.getPane('tilePane');
  var sunF = 0;
  function refreshFilter() {
    var parts = [];
    if (!KEY && darkMQ.matches) parts.push('invert(1) hue-rotate(180deg) saturate(.55) brightness(.9) contrast(.92)');
    if (sunF > 0) parts.push('brightness(' + (1 - (darkMQ.matches ? 0.12 : 0.3) * sunF).toFixed(3) + ') sepia(' + (0.28 * sunF).toFixed(3) + ') hue-rotate(' + (-16 * sunF).toFixed(1) + 'deg) saturate(' + (1 + 0.1 * sunF).toFixed(3) + ')');
    tilePane.style.filter = parts.join(' ');
  }
  function applyTheme() {
    var next = darkMQ.matches ? tiles.dark : tiles.light;
    if (curTile !== next) { if (curTile) map.removeLayer(curTile); curTile = next.addTo(map); }
    refreshFilter();
  }
  applyTheme();
  (darkMQ.addEventListener ? darkMQ.addEventListener('change', applyTheme) : darkMQ.addListener(applyTheme));

  /* ---------- 레이어 구성 ---------- */
  var groups = [], legs = [], markers = [];
  var usedLL = {};
  function pinIcon(num, color, label, shift) {
    return L.divIcon({
      className: 'pinwrap',
      html: '<span class="pin" style="--c:' + color + '"><b>' + num + '</b></span><span class="pin-label">' + esc(label) + '</span>',
      iconSize: [30, 30], iconAnchor: [15 - shift, 15 + shift]
    });
  }
  function pathLen(pts) {
    var cum = [0];
    for (var i = 1; i < pts.length; i++) {
      var dy = pts[i][0] - pts[i - 1][0], dx = (pts[i][1] - pts[i - 1][1]) * Math.cos(pts[i][0] * Math.PI / 180);
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return cum;
  }
  T.days.forEach(function (d, di) {
    var g = L.layerGroup(); groups.push(g); legs.push({}); markers.push({});
    d.nodes.forEach(function (n, i) {
      if (n.legIn) {
        var from = d.nodes[n.legIn.from];
        var pts = [from.s.ll];
        (n.legIn.via || []).forEach(function (w) {
          var wp = T.waypoints[w]; pts.push(wp.ll);
          L.circleMarker(wp.ll, { radius: 5, color: d.color, weight: 2, fillColor: '#fff', fillOpacity: 1 })
            .bindTooltip(wp.ko + '(' + wp.jp + ')', { className: 'wp-tip' }).addTo(g);
        });
        pts.push(n.s.ll);
        var dashed = !!n.legIn.dashed;
        var base = L.polyline(pts, { color: d.color, weight: 3, opacity: 0.32, dashArray: dashed ? '3 9' : null, interactive: false }).addTo(g);
        var prog = L.polyline(pts, { color: d.color, weight: 5, opacity: 0.95, lineCap: 'round', dashArray: dashed ? '10 10' : null, className: 'route-prog', interactive: false }).addTo(g);
        var cum = pathLen(pts);
        legs[di][i] = { pts: pts, cum: cum, total: cum[cum.length - 1], base: base, prog: prog, f: -1 };
      }
    });
    d.nodes.forEach(function (n, i) {
      if (markers[di][n.stop]) return;
      var key = n.s.ll.join(',');
      var shift = usedLL[key] || 0; usedLL[key] = shift + 1;
      var label = n.s.ko + (n.s.areaNote ? ' (' + n.s.areaNote + ')' : '');
      var m = L.marker(n.s.ll, { icon: pinIcon(n.num, d.color, label, shift * 14), title: nm(n.s) + (n.s.areaNote ? ' - ' + n.s.areaNote : ''), keyboard: true, riseOnHover: true });
      m.on('click', function () { openNode(di, i); });
      m.addTo(g);
      markers[di][n.stop] = { m: m, first: i, ghost: null };
    });
  });

  function setLegF(leg, f) {
    if (leg.f === f) return; leg.f = f;
    if (f >= 1) { leg.prog.setLatLngs(leg.pts); return; }
    if (f <= 0) { leg.prog.setLatLngs([]); return; }
    leg.prog.setLatLngs(partial(leg, f));
  }
  function partial(leg, f) {
    var target = leg.total * f, out = [leg.pts[0]];
    for (var i = 1; i < leg.pts.length; i++) {
      if (leg.cum[i] <= target) { out.push(leg.pts[i]); continue; }
      var t = (target - leg.cum[i - 1]) / (leg.cum[i] - leg.cum[i - 1] || 1);
      out.push([leg.pts[i - 1][0] + (leg.pts[i][0] - leg.pts[i - 1][0]) * t, leg.pts[i - 1][1] + (leg.pts[i][1] - leg.pts[i - 1][1]) * t]);
      break;
    }
    return out;
  }
  function pointOn(leg, f) { var p = partial(leg, f); return p[p.length - 1]; }

  var dot = L.marker([0, 0], { icon: L.divIcon({ className: 'dotwrap', html: '<span class="dot"></span>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false, keyboard: false, zIndexOffset: 2000 });
  function setDotColor(c) { var el = dot.getElement(); if (el) el.firstChild.style.setProperty('--c', c); }

  /* ---------- 상태 ---------- */
  var S = { tab: 'all', segs: [], total: 0, p: 0, playing: false, idle: true, done: false, speed: 1, seg: -1, follow: true, cur: null, lock: {}, last: null };
  var reduced = reduceMQ.matches;
  function applyReduced() {
    reduced = reduceMQ.matches;
    document.body.classList.toggle('reduced', reduced);
    if (reduced) { pause(); S.idle = true; renderIdle(); }
    else { $('#hud-status').textContent = '재생 버튼을 눌러 시작하세요'; }
  }
  function tabDays() { return S.tab === 'all' ? [0, 1, 2] : [S.tab]; }

  function buildTimeline() {
    var segs = [], t = 0, legSegs = [];
    function push(o) { o.start = t; t += o.dur; o.end = t; segs.push(o); return o; }
    tabDays().forEach(function (di) {
      var d = T.days[di];
      push({ k: 'day', di: di, dur: 1.7 });
      d.nodes.forEach(function (n, i) {
        if (n.preJump) push({ k: 'jump', di: di, i: i, dur: 1.5 });
        if (n.legIn) { var ls = push({ k: 'leg', di: di, i: i, dur: n.legIn.dur || 3 }); ls.leg = legs[di][i]; legSegs.push(ls); }
        push({ k: 'dwell', di: di, i: i, dur: n.hold || 3.6 });
      });
    });
    S.segs = segs; S.total = t; S.legSegs = legSegs;
    S.reveal = {};
    segs.forEach(function (sg) { if (sg.k === 'dwell') { var key = sg.di + ':' + T.days[sg.di].nodes[sg.i].stop; if (S.reveal[key] == null) S.reveal[key] = sg.start; } });
  }

  /* ---------- 표시 갱신 ---------- */
  function setGroups() {
    var on = tabDays();
    groups.forEach(function (g, di) {
      var has = map.hasLayer(g);
      if (on.indexOf(di) >= 0 && !has) g.addTo(map);
      if (on.indexOf(di) < 0 && has) map.removeLayer(g);
    });
  }
  function eachMarker(fn) {
    tabDays().forEach(function (di) { Object.keys(markers[di]).forEach(function (k) { fn(markers[di][k], di, k); }); });
  }
  function setGhost(mk, ghost) {
    var el = mk.m.getElement(); if (!el) return;
    if (mk.ghost === ghost && mk.el === el) return;
    mk.ghost = ghost; mk.el = el; el.classList.toggle('ghost', ghost);
  }
  function setActiveMarker(di, stopId) {
    markers.forEach(function (mm) { Object.keys(mm).forEach(function (k) { var el = mm[k].m.getElement(); if (el) el.classList.remove('is-active'); }); });
    if (di == null) return;
    var mk = markers[di][stopId]; var el = mk && mk.m.getElement(); if (el) el.classList.add('is-active');
  }
  function dayBounds(dis) {
    var pts = [];
    dis.forEach(function (di) {
      T.days[di].nodes.forEach(function (n) { pts.push(n.s.ll); });
      Object.keys(legs[di]).forEach(function (i) { legs[di][i].pts.forEach(function (p) { pts.push(p); }); });
    });
    return L.latLngBounds(pts);
  }
  function mapPad() {
    var small = window.innerWidth <= 900;
    return { paddingTopLeft: small ? [24, 70] : [50, 90], paddingBottomRight: small ? [24, 100] : [50, 110], maxZoom: 15 };
  }
  function fitDays(dis, animate) {
    var b = dayBounds(dis), o = mapPad();
    if (animate && !reduced) { o.duration = 1.2; map.flyToBounds(b, o); }
    else { o.animate = false; map.fitBounds(b, o); }
  }

  function renderIdle() {
    setGroups();
    S.idle = true; S.seg = -1;
    Object.keys(legs).forEach(function (di) { Object.keys(legs[di]).forEach(function (i) { setLegF(legs[di][i], 1); }); });
    eachMarker(function (mk) { setGhost(mk, false); });
    if (map.hasLayer(dot)) map.removeLayer(dot);
    sunF = 0; refreshFilter();
    setActiveMarker(null);
    $('#hud-time').textContent = '--:--';
    $('#hud-day').textContent = S.tab === 'all' ? '전체 일정' : T.days[S.tab].tab + ' · ' + T.days[S.tab].date;
    $('#hud-day').style.setProperty('--hc', S.tab === 'all' ? css('--ink-2') : T.days[S.tab].color);
    $('#hud-status').textContent = reduced ? '지점이나 목록을 눌러 카드를 보세요' : '재생 버튼을 눌러 시작하세요';
    $('#lbl-play').textContent = '재생'; $('#btn-play').setAttribute('aria-label', '재생'); $('#ico-play').setAttribute('d', 'M8 5.5v13l11-6.5z');
    $('#scrub').value = 0;
    showIntro();
    renderList();
  }

  function hudSet(di, min, status) {
    var d = T.days[di];
    $('#hud-day').textContent = d.tab + ' · ' + d.date;
    $('#hud-day').style.setProperty('--hc', d.color);
    $('#hud-time').textContent = fmt(min);
    $('#hud-status').textContent = status;
  }

  function tileFilter(di, min) {
    var f = 0;
    if (di === 0 && min >= toMin('17:42')) f = clamp((min - toMin('17:42')) / 50, 0, 1);
    f = Math.round(f * 100) / 100;
    if (f !== sunF) { sunF = f; refreshFilter(); }
  }

  function renderAt(p) {
    var segs = S.segs, idx = segs.length - 1;
    for (var k = 0; k < segs.length; k++) { if (p < segs[k].end) { idx = k; break; } }
    var sg = segs[idx], local = clamp((p - sg.start) / sg.dur, 0, 1);
    var d = T.days[sg.di], n = d.nodes[sg.i != null ? sg.i : 0];
    S.legSegs.forEach(function (ls) {
      setLegF(ls.leg, p >= ls.end ? 1 : (p <= ls.start ? 0 : ease((p - ls.start) / ls.dur)));
    });
    eachMarker(function (mk, di, key) { setGhost(mk, p < (S.reveal[di + ':' + key] == null ? Infinity : S.reveal[di + ':' + key])); });

    var ll, min, status;
    if (sg.k === 'day') {
      ll = d.nodes[0].s.ll; min = d.nodes[0].a; status = d.title;
    } else if (sg.k === 'dwell') {
      ll = n.s.ll; min = n.a + (n.d - n.a) * local; status = nm(n.s) + (n.s.areaNote ? ' (' + n.s.areaNote + ')' : '');
    } else if (sg.k === 'leg') {
      var e = ease(local); ll = pointOn(legs[sg.di][sg.i], e);
      min = n.legIn.da + (n.legIn.aa - n.legIn.da) * e;
      status = '이동 중 → ' + n.s.ko + ' · ' + n.legIn.tag;
    } else {
      var tn = d.nodes[n.preJump.to], pv = d.nodes[sg.i - 1], te = ease(local);
      ll = [pv.s.ll[0] + (tn.s.ll[0] - pv.s.ll[0]) * te, pv.s.ll[1] + (tn.s.ll[1] - pv.s.ll[1]) * te];
      min = tn.d; status = n.preJump.label;
    }
    if (!map.hasLayer(dot)) dot.addTo(map);
    dot.setLatLng(ll); setDotColor(d.color);
    hudSet(sg.di, min, status);
    tileFilter(sg.di, min);
    S.clock = min;
    $('#scrub').value = Math.round(p / S.total * 1000);
    if (idx !== S.seg) { S.seg = idx; enterSeg(sg); }
    if (S.cur) dynamic(min);
  }

  function enterSeg(sg) {
    var d = T.days[sg.di], n = d.nodes[sg.i != null ? sg.i : 0];
    var ban = $('#banner');
    ban.classList.toggle('show', sg.k === 'day');
    if (sg.k === 'day') {
      ban.style.setProperty('--bc', d.color);
      ban.innerHTML = esc(d.tab + ' · ' + d.date) + '<small>' + esc(d.title) + '</small>';
      setActiveMarker(null);
      fitDays([sg.di], true);
      return;
    }
    var fast = S.speed >= 4;
    function fly(ll, z) { if (!S.follow || reduced) return; if (fast) map.setView(ll, z, { animate: false }); else map.flyTo(ll, z, { duration: 1.1 / Math.sqrt(S.speed) }); }
    if (sg.k === 'dwell') {
      setActiveMarker(sg.di, n.stop);
      showCard(sg.di, sg.i, true);
      fly(n.s.ll, n.s.zoom || 15);
      if (n.s.zoom && !S.follow) { /* 카메라 고정 */ }
    } else if (sg.k === 'leg') {
      setActiveMarker(null);
      if (S.follow && !reduced) {
        var b = L.latLngBounds(legs[sg.di][sg.i].pts), o = mapPad(); o.maxZoom = 16;
        if (fast) { o.animate = false; map.fitBounds(b, o); } else { o.duration = 1.1 / Math.sqrt(S.speed); map.flyToBounds(b, o); }
      }
    } else if (sg.k === 'jump') {
      setActiveMarker(null);
      fly(d.nodes[n.preJump.to].s.ll, 14);
    }
  }

  /* ---------- 카드 ---------- */
  function photoHTML(k, alt, cls) {
    return '<img src="photos/' + k + '.jpg" alt="' + esc(alt) + '" decoding="async"' + (cls ? ' class="' + cls + '"' : '') + '>';
  }
  function credit(k) { var p = T.photos[k]; return '사진: ' + p.author + ', ' + p.lic + (p.illus ? ' (분위기 참고 사진)' : ''); }
  function svgArt(kind, label) {
    if (kind === 'luffy') {
      return '<svg viewBox="0 0 320 210" role="img" aria-label="' + esc(label) + '">' +
        '<ellipse cx="160" cy="176" rx="104" ry="9" fill="#000" opacity=".12"/>' +
        '<path d="M92 120c-2-62 134-62 136 0z" fill="#f0d27e" stroke="#26211b" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M94 106c40 16 92 16 132 0l2 15c-42 18-94 18-136 0z" fill="#c8352b" stroke="#26211b" stroke-width="4" stroke-linejoin="round"/>' +
        '<ellipse cx="160" cy="124" rx="118" ry="24" fill="#e9c46a" stroke="#26211b" stroke-width="4" opacity=".0"/>' +
        '<path d="M42 124c0-16 52-28 118-28s118 12 118 28-52 30-118 30S42 140 42 124z" fill="#e9c46a" stroke="#26211b" stroke-width="4" stroke-linejoin="round" transform="translate(0 6)"/>' +
        '<path d="M94 106c40 16 92 16 132 0l2 15c-42 18-94 18-136 0z" fill="#c8352b" stroke="#26211b" stroke-width="4" stroke-linejoin="round" transform="translate(0 6)"/>' +
        '<path d="M108 80c12-14 30-20 52-20" fill="none" stroke="#fff7d6" stroke-width="6" stroke-linecap="round" opacity=".7"/>' +
        '<text x="160" y="198" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor" font-family="inherit">' + esc(label) + '</text></svg>';
    }
    return '<svg viewBox="0 0 320 210" role="img" aria-label="' + esc(label) + '">' +
      '<ellipse cx="160" cy="170" rx="120" ry="8" fill="#000" opacity=".12"/>' +
      '<rect x="40" y="62" width="240" height="88" rx="16" fill="#e8e2d2" stroke="#26211b" stroke-width="4"/>' +
      '<rect x="40" y="108" width="240" height="14" fill="#4f86e8" stroke="#26211b" stroke-width="3"/>' +
      '<rect x="58" y="76" width="44" height="26" rx="5" fill="#cfe3f3" stroke="#26211b" stroke-width="3"/>' +
      '<rect x="112" y="76" width="44" height="26" rx="5" fill="#cfe3f3" stroke="#26211b" stroke-width="3"/>' +
      '<rect x="166" y="76" width="44" height="26" rx="5" fill="#cfe3f3" stroke="#26211b" stroke-width="3"/>' +
      '<rect x="220" y="76" width="44" height="26" rx="5" fill="#cfe3f3" stroke="#26211b" stroke-width="3"/>' +
      '<circle cx="86" cy="152" r="11" fill="#26211b"/><circle cx="234" cy="152" r="11" fill="#26211b"/>' +
      '<path d="M20 166h280" stroke="#26211b" stroke-width="4" stroke-linecap="round"/>' +
      '<text x="160" y="196" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor" font-family="inherit">' + esc(label) + '</text></svg>';
  }

  function showIntro() {
    var el = $('#card'); S.cur = null;
    var d = S.tab === 'all' ? null : T.days[S.tab];
    var html;
    if (d) {
      html = '<div class="card intro" style="--c:' + d.color + '"><p class="eyebrow">' + esc(d.tab + ' · ' + d.date) + '</p><p class="big">' + esc(d.title) + '</p>' +
        '<p>' + (reduced ? '움직임 줄이기 설정이 켜져 있어 애니메이션 대신 전체 경로를 표시합니다. 지도의 번호나 아래 목록을 누르면 장소 카드가 열립니다.' : '재생을 누르면 이동하는 점을 따라 장소마다 카드가 열립니다. 지도의 번호나 아래 목록을 눌러 바로 볼 수도 있습니다.') + '</p>' +
        '<p>교통비 ' + esc(d.cost) + '</p></div>';
    } else {
      html = '<div class="card intro" style="--c:var(--ink)"><p class="eyebrow">2026.10.17(토) ~ 10.19(월)</p><p class="big">구마모토 2박 3일, 세 갈래 길</p>' +
        '<p>' + (reduced ? '움직임 줄이기 설정이 켜져 있어 애니메이션 대신 전체 경로를 표시합니다. 지도의 번호나 아래 목록을 누르면 장소 카드가 열립니다.' : '재생을 누르면 1일차부터 3일차까지 차례로 달립니다. 지도는 일차마다 해당 구간으로 날아가고, 장소에 닿으면 카드가 열립니다.') + '</p>' +
        '<p>1일차 산책과 재즈, 2일차 아소 트레킹, 3일차 정원과 루피 동상 그리고 공항.</p></div>';
    }
    el.innerHTML = html;
  }

  function showCard(di, i, animated) {
    var d = T.days[di], n = d.nodes[i], el = $('#card');
    var key = di + ':' + i;
    S.cur = { di: di, i: i, key: key, photoIdx: 0 };
    S.lock = {};
    var name = '<span>' + esc(n.s.ko) + '</span><span class="jp">(' + esc(n.s.jp) + ')</span>';
    var media;
    if (n.photos.length) {
      var thumbs = '';
      if (n.photos.length > 1) {
        thumbs = '<div class="thumbs">' + n.photos.map(function (p, j) { return '<button type="button" data-ph="' + j + '" aria-pressed="' + (j === 0) + '" aria-label="사진 ' + (j + 1) + ' 보기">' + photoHTML(p.k, '', '') + '</button>'; }).join('') + '</div>';
      }
      media = '<div class="media"><div id="ph">' + photoHTML(n.photos[0].k, nm(n.s) + ' 사진') + '</div>' + thumbs + '<div class="stamp" aria-hidden="true">' + n.num + '</div></div><div class="cap" id="cap">' + esc(credit(n.photos[0].k)) + '</div>';
    } else {
      media = '<div class="media"><div class="ill">' + svgArt(n.svg, n.svgLabel) + '</div><div class="stamp" aria-hidden="true">' + n.num + '</div></div><div class="cap">직접 그린 일러스트이며 실제 사진이 아닙니다</div>';
    }
    var leg = '';
    if (n.legIn) {
      var l = n.legIn;
      leg = '<div class="leg' + (l.dashed ? ' dashed' : '') + '"><span class="tag">' + esc(l.tag) + '</span>' + esc(l.text) +
        (l.dep !== l.arr ? ' · ' + esc(l.dep) + ' → ' + esc(l.arr) : '') +
        (l.fare && l.fare !== '-' ? ' · <span class="fare">' + esc(l.fare) + '</span>' : '') + '</div>';
    }
    var marks = (n.marks || []).length ? '<div class="marks">' + n.marks.map(function (m) { return '<span class="mark" data-at="' + m.m + '">' + esc(m.text) + '</span>'; }).join('') + '</div>' : '';
    var notes = (n.notes || []).length ? '<ul class="notes">' + n.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
    var extra = '';
    if (n.extra) {
      extra = '<section class="extra"><h3>' + esc(n.extra.title) + '</h3><p>' + esc(n.extra.text) + '</p><div class="mini">' +
        n.extra.photos.map(function (k) { return '<figure>' + photoHTML(k, '저녁 분위기 참고 사진', '') + '<figcaption>' + esc(credit(k)) + '</figcaption></figure>'; }).join('') + '</div></section>';
    }
    var order = d.nodes.indexOf(n) + 1;
    var branch = n.branch ? ' · 하산 ' + n.branch : '';
    el.innerHTML = '<article class="card" style="--c:' + d.color + (animated ? '' : ';animation-duration:.25s') + '">' + media +
      '<div class="body"><p class="eyebrow">' + esc(d.tab + ' · ' + d.date + branch + ' · ' + order + '/' + d.nodes.length) + '</p><h2>' + name + '</h2>' +
      '<p class="when">' + esc(n.window) + '</p>' + leg + '<p class="memo">' + esc(n.memo) + '</p>' + marks + notes + extra + '</div></article>';
    $$('.thumbs button', el).forEach(function (b) {
      b.addEventListener('click', function () { S.lock[key] = true; setPhoto(+b.getAttribute('data-ph')); });
    });
    $$('#list .li').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-key') === key); });
    var on = $('#list .li.on'); if (on && on.scrollIntoView && false) on.scrollIntoView({ block: 'nearest' });
    $('.sheet').scrollTop = 0;
    dynamic(S.clock != null && !S.idle ? S.clock : n.a);
  }

  function setPhoto(j) {
    if (!S.cur) return;
    var n = T.days[S.cur.di].nodes[S.cur.i], p = n.photos[j];
    if (!p || S.cur.photoIdx === j) return;
    S.cur.photoIdx = j;
    $('#ph').innerHTML = photoHTML(p.k, nm(n.s) + ' 사진');
    $('#cap').textContent = credit(p.k);
    $$('.thumbs button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-ph') === j)); });
  }
  function dynamic(min) {
    if (!S.cur) return;
    var n = T.days[S.cur.di].nodes[S.cur.i];
    $$('.mark').forEach(function (m) { m.classList.toggle('on', min >= +m.getAttribute('data-at')); });
    if (n.photos.some(function (p) { return p.fm != null; }) && !S.lock[S.cur.key]) {
      var want = 0;
      n.photos.forEach(function (p, j) { if (p.fm == null || min >= p.fm) want = j; });
      if (want !== S.cur.photoIdx) setPhoto(want);
    }
  }

  /* ---------- 목록 / 비용 ---------- */
  function renderList() {
    var h = '';
    tabDays().forEach(function (di) {
      var d = T.days[di];
      h += '<h3 style="--c:' + d.color + '">' + esc(d.tab + ' · ' + d.date + ' ' + d.title) + '</h3>';
      d.nodes.forEach(function (n, i) {
        h += '<button type="button" class="li" style="--c:' + d.color + '" data-di="' + di + '" data-i="' + i + '" data-key="' + di + ':' + i + '"><time>' + esc(fmt(n.a) === fmt(n.d) ? fmt(n.a) : fmt(n.a) + '~') + '</time><span>' + esc(nm(n.s)) +
          (n.branch ? '<span class="br">' + n.branch + '</span>' : '') + '</span></button>';
      });
    });
    $('#list').innerHTML = h;
    $$('#list .li').forEach(function (b) { b.addEventListener('click', function () { openNode(+b.getAttribute('data-di'), +b.getAttribute('data-i')); }); });
  }
  function renderCost() {
    var cells = T.days.map(function (d) {
      return '<div class="cost-cell" style="--c:' + d.color + '"><b>' + d.tab + ' · ' + d.date + '</b><span>' + esc(d.cost) + '</span><em>' + esc(d.costNote) + '</em></div>';
    }).join('');
    var h = '<div class="cost-title">교통비 (1인)<small>입장료와 차지는 별도</small></div>' + cells +
      '<div class="cost-cell cost-sum"><b>합계</b><span>약 7,500엔</span><em>리무진·버스·JR·시덴</em></div>';
    $('#cost-d').innerHTML = h; $('#cost-m').innerHTML = h;
  }

  /* ---------- 동작 ---------- */
  function openNode(di, i) {
    if (S.tab !== 'all' && S.tab !== di) setTab(di);
    var n = T.days[di].nodes[i];
    if (S.idle) {
      setActiveMarker(di, n.stop); showCard(di, i, true); S.clock = n.a;
      $('#hud-day').textContent = T.days[di].tab + ' · ' + T.days[di].date;
      $('#hud-day').style.setProperty('--hc', T.days[di].color);
      $('#hud-time').textContent = fmt(n.a); $('#hud-status').textContent = nm(n.s);
      if (!reduced) { map.flyTo(n.s.ll, n.s.zoom || 15, { duration: 0.9 }); } else { map.setView(n.s.ll, n.s.zoom || 15, { animate: false }); }
      return;
    }
    var sg = null;
    S.segs.forEach(function (x) { if (x.k === 'dwell' && x.di === di && x.i === i && !sg) sg = x; });
    if (sg) { pause(); S.p = sg.start + 0.01; S.seg = -1; renderAt(S.p); }
  }

  function setTab(tab) {
    pause();
    S.tab = tab; S.p = 0; S.done = false; S.clock = null;
    $$('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === String(tab))); });
    setGroups(); buildTimeline();
    renderIdle();
    fitDays(tabDays(), true);
    $('#banner').classList.remove('show');
  }

  function setPlayUI() {
    var playing = S.playing;
    $('#lbl-play').textContent = playing ? '일시정지' : (S.done ? '다시 재생' : (S.idle ? '재생' : '계속'));
    $('#btn-play').setAttribute('aria-label', playing ? '일시정지' : '재생');
    $('#ico-play').setAttribute('d', playing ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5.5v13l11-6.5z');
  }
  function frame(ts) {
    if (!S.playing) { S.last = null; return; }
    if (S.last == null) S.last = ts;
    var dt = Math.min(0.1, (ts - S.last) / 1000); S.last = ts;
    S.p += dt * S.speed;
    if (S.p >= S.total) { S.p = S.total - 0.001; S.playing = false; S.done = true; renderAt(S.p); setPlayUI(); return; }
    renderAt(S.p);
    requestAnimationFrame(frame);
  }
  function play() {
    if (reduced) return;
    if (S.idle || S.done || S.p >= S.total - 0.01) { S.p = 0; S.seg = -1; S.done = false; S.cur = null; }
    S.idle = false; S.playing = true; S.last = null;
    if (!S.segs.length) buildTimeline();
    setGroups();
    renderAt(S.p); setPlayUI();
    requestAnimationFrame(frame);
  }
  function pause() { S.playing = false; setPlayUI(); }
  function replay() { if (reduced) return; S.idle = true; S.done = false; play(); }

  $('#btn-play').addEventListener('click', function () { if (S.playing) pause(); else play(); });
  $('#btn-replay').addEventListener('click', replay);
  $$('.sp').forEach(function (b) {
    b.addEventListener('click', function () {
      S.speed = +b.getAttribute('data-speed');
      $$('.sp').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    });
  });
  $('#follow').addEventListener('change', function (e) { S.follow = e.target.checked; });
  $('#scrub').addEventListener('input', function (e) {
    if (reduced) return;
    var was = S.playing; S.playing = false;
    if (S.idle) { S.idle = false; S.cur = null; setGroups(); }
    S.done = false; S.p = clamp(+e.target.value / 1000 * S.total, 0, S.total - 0.001);
    S.seg = -1; renderAt(S.p); setPlayUI();
    if (was) { S.playing = true; S.last = null; requestAnimationFrame(frame); setPlayUI(); }
  });
  $$('.tab').forEach(function (b) {
    b.addEventListener('click', function () { var t = b.getAttribute('data-tab'); setTab(t === 'all' ? 'all' : +t); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|BUTTON|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); $('#btn-play').click(); }
  });
  (reduceMQ.addEventListener ? reduceMQ.addEventListener('change', applyReduced) : reduceMQ.addListener(applyReduced));

  /* 시작 */
  renderCost();
  setGroups(); buildTimeline();
  document.body.classList.toggle('reduced', reduced);
  renderIdle();
  fitDays([0, 1, 2], false);
  window.addEventListener('resize', function () { map.invalidateSize(); });

  /* 검증용 훅 (콘솔에서 __trip.seek(...) 등) */
  window.__trip = { S: S, map: map, setTab: setTab, play: play, pause: pause };
})();
