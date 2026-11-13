/* 회수율 포트폴리오 계산기: 상태·도우미·화면(보기 묶음) */
(function () {
  'use strict';
  var E = HS_ENGINE, CH = HS_CHARTS, ST = HS_STORE, CFG = HS_CONFIG, DATA = HS_DATA, esc = CH.esc;
  var BLOG = {}; DATA.stocks.forEach(function (s) { BLOG[s.t] = s; });
  var S = ST.load();
  var UI = {
    view: 'port', heat: 'y', filter: 'mine', detail: null, form: null, cmp: null, horizon: 10, moneyN: 10, sim: null,
    goal: { y: '', at: 0, g: '', cap: '', mode: 'trade', uni: {}, lock: {} }, goalRes: null,
    buy: { cash: '', src: 'saved', frac: false }, shock: 0, q: { state: 'base', ts: 0, msg: '' }, shared: null, toast: null, renaming: null
  };
  var HS = window.HS = { S: S, UI: UI, V: {}, act: {}, chg: {} };

  /* ───── 자료 찾기 ───── */
  function db(t) { return S.custom[t] || BLOG[t] || null; }
  function pf() { return S.portfolios.filter(function (p) { return p.id === S.active; })[0] || S.portfolios[0]; }
  function priceSrc(t) { return S.manual[t] > 0 ? 'manual' : (S.prices[t] && S.prices[t].p > 0 ? 'live' : 'base'); }
  function priceOf(t) { var k = priceSrc(t); return k === 'manual' ? S.manual[t] : k === 'live' ? S.prices[t].p : (db(t) ? db(t).basePrice : 0); }
  function M(t, price) { var s = db(t); if (!s) return null; var g = S.gov[t]; return E.stock(s, price != null ? price : priceOf(t), g != null && g !== '' ? g / 100 : undefined); }
  function rowsOf(hs) { return hs.filter(function (h) { return db(h.t) && h.qty > 0; }).map(function (h) { return { t: h.t, m: M(h.t), qty: h.qty, cost: h.cost }; }); }
  function basis() { return S.settings.basis || 'lo'; }
  function dep() { return (S.settings.deposit != null && S.settings.deposit !== '' ? +S.settings.deposit : DATA.deposit.rate) / 100; }
  function depLabel() { return S.settings.deposit != null && S.settings.deposit !== '' ? '직접 입력' : DATA.deposit.label; }
  function universe() { var seen = {}, out = []; pf().holdings.forEach(function (h) { if (db(h.t) && !seen[h.t]) { seen[h.t] = 1; out.push(h.t); } }); S.watch.forEach(function (t) { if (db(t) && !seen[t]) { seen[t] = 1; out.push(t); } }); return out; }
  function allTickers() { return DATA.stocks.map(function (s) { return s.t; }).concat(Object.keys(S.custom).filter(function (t) { return !BLOG[t]; })); }
  function save() { ST.save(S); }

  /* ───── 글자 만들기 ───── */
  var minus = function (s) { return String(s).replace(/-/g, '−'); };
  function pct(x, d) { if (x == null || !isFinite(x)) return '—'; var v = x * 100; if (Math.abs(v) >= 100) return minus(Math.round(v).toLocaleString('en-US')) + '%'; return minus(v.toFixed(d == null ? 1 : d)) + '%'; }
  function rng(lo, hi, d) { var a = pct(lo, d), b = pct(hi, d); return a === b ? a : a.replace('%', '') + '~' + b; }
  function pp(x) { return (x >= 0 ? '+' : '') + minus((x * 100).toFixed(1)) + '%p'; }
  function usd(v) { return '$' + (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function money(v) {
    if (v == null || !isFinite(v)) return '—';
    var neg = v < 0 ? '−' : ''; v = Math.abs(v);
    if (S.settings.cur === 'KRW') {
      var w = v * (S.settings.fx || 1400);
      if (w >= 1e8) return neg + (w / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '억 원';
      if (w >= 1e4) return neg + Math.round(w / 1e4).toLocaleString('ko-KR') + '만 원';
      return neg + Math.round(w).toLocaleString('ko-KR') + '원';
    }
    return neg + '$' + v.toLocaleString('en-US', v >= 1000 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function qtyTxt(q) { return (+q).toLocaleString('en-US', { maximumFractionDigits: 4 }); }
  function yearsTxt(a, b) {
    if (a == null && b == null) return '회수 못 함';
    if (b == null) return '약 ' + a.toFixed(0) + '년~회수 못 함';
    var sa = a.toFixed(0), sb = b.toFixed(0); return '약 ' + (sa === sb ? sa : sa + '~' + sb) + '년';
  }
  function gText(m) { return m.hasG ? rng(m.gLo, m.gHi) : '—'; }
  function gDetail(m) {
    var s = m.s; if (m.gUser) return '내 가정';
    if (s.kind === 'etf') return 'ETF는 성장률을 쓰지 않습니다';
    if (s.kind === 'custom') return m.hasG ? '직접 입력' : '성장률 입력 없음';
    var a = s.gA != null ? '최근 4년 연평균 ' + pct(s.gA) : '최근 4년 ' + (s.gALabel || '—');
    var b = s.gB != null ? '애널리스트 전망 ' + pct(s.gB) : '애널리스트 ' + (s.gBLabel || '—');
    return a + ', ' + b;
  }
  function parts(m) { return m.sd >= 0 ? '배당 ' + pct(m.dy) + ' + 자사주 ' + pct(m.sd) : '배당 ' + pct(m.dy) + ' − 주식 수 증가 ' + pct(-m.sd); }
  function yNTxt(m, n) { if (!m.grows) return m.y <= 0 ? '산출 불가' : (m.hasG ? pct(m.y) : '산출 불가'); return rng(E.yAfter(m.y, m.gLo, n), E.yAfter(m.y, m.gHi, n)); }
  function paybackTxt(m) { if (!m.grows) return '산출 불가'; return yearsTxt(E.payback(m.y, m.gHi), E.payback(m.y, m.gLo)); }
  function pfYN(P, n) { return rng(E.pfYAfter(P, n, 'lo'), E.pfYAfter(P, n, 'hi')); }
  function pfPay(P) { if (!(P.y > 0)) return '산출 불가'; return yearsTxt(E.pfPayback(P, 'hi'), E.pfPayback(P, 'lo')); }
  function verdict(y) { var gap = (y - dep()) * 100; return Math.abs(gap) <= 0.5 ? '정기예금과 비슷' : (gap > 0 ? '정기예금보다 높음' : '정기예금보다 낮음'); }
  function basisName(b) { return { lo: '낮은 쪽', mid: '가운데', hi: '높은 쪽' }[b || basis()]; }
  function dateTxt(ts) { var d = new Date(ts), z = function (n) { return ('0' + n).slice(-2); }; return (d.getMonth() + 1) + '.' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
  function today() { var d = new Date(), z = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }

  /* ───── 작은 부품 ───── */
  function chip(t, kind) { return '<span class="chip' + (kind ? ' ' + kind : '') + '">' + esc(t) + '</span>'; }
  function kpi(label, val, sub, cls) { return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><div class="kpi-l">' + esc(label) + '</div><div class="kpi-v">' + val + '</div>' + (sub ? '<div class="kpi-s">' + sub + '</div>' : '') + '</div>'; }
  function panel(title, body, o) { o = o || {}; return '<section class="panel' + (o.cls ? ' ' + o.cls : '') + '"><div class="panel-h"><h2>' + esc(title) + '</h2>' + (o.tools || '') + '</div>' + (o.sub ? '<p class="panel-sub">' + o.sub + '</p>' : '') + body + '</section>'; }
  function note(html) { return '<div class="note">' + html + '</div>'; }
  function seg(name, opts, cur) { return '<div class="seg" role="group">' + opts.map(function (o) { return '<button type="button" data-act="' + name + '" data-v="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function tname(t, sub) { var s = db(t); return '<button type="button" class="tname" data-act="detail" data-t="' + esc(t) + '"><b>' + esc(s ? s.name : t) + '</b><span>' + esc(t) + (sub ? ' · ' + esc(sub) : '') + '</span></button>'; }
  function picker(act, placeholder, exclude) {
    exclude = exclude || {};
    var grp = function (label, list) { list = list.filter(function (t) { return !exclude[t]; }); return list.length ? '<optgroup label="' + label + '">' + list.map(function (t) { return '<option value="' + esc(t) + '">' + esc(db(t).name + ' (' + t + ')') + '</option>'; }).join('') + '</optgroup>' : ''; };
    var cust = Object.keys(S.custom).filter(function (t) { return !BLOG[t]; });
    return '<select data-chg="' + act + '" aria-label="' + esc(placeholder) + '"><option value="">' + esc(placeholder) + '</option>' + grp('블로그에서 분석한 종목', DATA.stocks.map(function (s) { return s.t; })) + grp('직접 입력한 종목', cust) + '<option value="__new">종목을 직접 입력하기</option></select>';
  }
  function priceCell(t) {
    var k = priceSrc(t), s = db(t), tip = k === 'live' ? '실시간 시세 ' + dateTxt(S.prices[t].ts) : k === 'manual' ? '직접 입력한 주가' : (s.kind === 'custom' ? '입력한 주가' : '카드 기준일 ' + s.baseDate + ' 종가');
    return '<span title="' + esc(tip) + '">' + usd(priceOf(t)) + '<i class="src ' + k + '">' + (k === 'live' ? '실시간' : k === 'manual' ? '직접' : '기준일') + '</i></span>';
  }
  function fixedNote(P) {
    if (!(P.fixedW > 0.0005)) return '';
    var names = P.items.filter(function (it) { return !it.m.grows; }).map(function (it) { return it.m.s.name; });
    return note('비중 ' + pct(P.fixedW, 0) + '(' + esc(names.join(', ')) + ')는 회수율이 0 이하이거나 성장률을 정할 수 없어, 앞으로의 숫자를 계산할 때 <b>지금 회수율 그대로</b> 두었습니다. 종목 화면에서 “내 가정 성장률”을 넣으면 그 값으로 계산합니다.');
  }
  function highNote(P) {
    var hs = P.items.filter(function (it) { return it.m.grows && it.m.highG; });
    if (!hs.length) return '';
    return note('성장률이 연 25%를 넘는 종목(' + esc(hs.map(function (it) { return it.m.s.name + ' ' + pct(it.m.gHi, 0); }).join(', ')) + ')이 있습니다. 앞으로의 숫자는 그 속도가 계속 이어진다고 본 값입니다. 높은 성장률은 대개 시간이 지나며 낮아지니 “지금 속도가 이어진다면”의 숫자로 읽어 주세요.');
  }
  function autoSnap(p, P) {
    if (!(P.V > 0)) return; var d = today(), list = S.snaps[p.id] = S.snaps[p.id] || [];
    var rec = { d: d, v: Math.round(P.V * 100) / 100, y: +P.y.toFixed(6), gl: P.gLo, gh: P.gHi };
    if (list.length && list[list.length - 1].d === d) list[list.length - 1] = rec; else list.push(rec);
    if (list.length > 730) list.splice(0, list.length - 730);
    save();
  }

  /* ═════ 1. 포트폴리오 ═════ */
  HS.V.port = function () {
    var p = pf(), R = rowsOf(p.holdings), P = E.portfolio(R);
    if (!R.length) return emptyState();
    autoSnap(p, P);
    var d = dep(), mx = Math.max(P.y, d, 1e-9), con = E.concentration(P);
    var say = P.y > 0
      ? '지금 이 포트폴리오는 <b class="y">연 ' + pct(P.y) + '</b>를 돌려주는 예금과 같습니다.' + (P.gLo != null ? ' 담은 회사들의 이익은 해마다 <b class="g">' + rng(P.gLo, P.gHi) + '</b>씩 커지는 중입니다.' : '')
      : '지금 이 포트폴리오는 돌려받는 몫보다 주식 수가 늘어나는 몫이 커서 회수율이 <b class="y">' + pct(P.y) + '</b>입니다.' + (P.gLo != null ? ' 담은 회사들의 이익은 해마다 <b class="g">' + rng(P.gLo, P.gHi) + '</b>씩 커지는 중입니다.' : '');
    var hero = '<section class="book"><div class="book-top"><span class="book-name">' + esc(p.name) + '</span><span>' + R.length + '종목</span></div>' +
      '<p class="book-say">' + say + '</p><div class="book-grid"><div class="cmpbars">' +
      '<div class="cb"><span>회수율</span><div class="cb-t"><i class="b1" style="width:' + (Math.max(P.y, 0) / mx * 100).toFixed(1) + '%"></i></div><b>' + pct(P.y) + '</b></div>' +
      '<div class="cb"><span>정기예금</span><div class="cb-t"><i class="b2" style="width:' + (d / mx * 100).toFixed(1) + '%"></i></div><b>' + pct(d) + '</b></div>' +
      '<p class="cb-foot">' + (P.sd >= 0 ? '배당 ' + pct(P.dy) + ' + 자사주 ' + pct(P.sd) : '배당 ' + pct(P.dy) + ' − 주식 수 증가 ' + pct(-P.sd)) + ' ' + chip(verdict(P.y), 'blue') + '<br>비교 금리는 한국은행 은행 정기예금 평균(' + esc(depLabel()) + ')입니다.</p></div>' +
      '<div class="kpis">' + kpi('평가액', money(P.V)) + kpi('한 해 배당금(세전)', money(P.div)) + kpi('10년 후 회수율', pfYN(P, 10), '추정') + kpi('원금 회수 기간', pfPay(P), '추정') + '</div></div></section>';

    var heat = UI.heat, items = P.items.map(function (it) {
      var m = it.m, t = m.s.t, col, sub;
      if (heat === 'g') { var g = E.gOf(m, basis()); col = g == null ? '#e9edf2' : CH.seq((g + 0.05) / 0.35, CH.C.navy); sub = g == null ? '성장률 —' : pct(g); }
      else if (heat === 'd') { var q = S.prices[t], ch = q && q.pc ? q.p / q.pc - 1 : null; col = ch == null ? '#e9edf2' : CH.updown(ch); sub = ch == null ? '시세 없음' : (ch >= 0 ? '+' : '') + pct(ch, 2); }
      else { col = m.y <= 0 ? '#e9edf2' : CH.seq(m.y / 0.05, CH.C.blue); sub = pct(m.y); }
      return { label: t, sub: sub, value: it.w, color: col, title: m.s.name + ' · 비중 ' + pct(it.w) + ' · ' + sub };
    });
    var legend = heat === 'd' ? '칸 크기는 비중, 색은 전 거래일 종가 대비 등락입니다(오르면 빨강, 내리면 파랑).' : heat === 'g' ? '칸 크기는 비중, 색이 짙을수록 성장률(' + basisName() + ')이 높습니다.' : '칸 크기는 비중, 색이 짙을수록 회수율이 높습니다. 회색은 회수율 0 이하입니다.';
    var sorted = P.items.slice().sort(function (a, b) { return b.w - a.w; });
    var wb = CH.bars(sorted.map(function (it) { return { label: it.m.s.name, sub: it.m.s.t, value: it.w, text: pct(it.w), color: CH.C.navy }; }));

    var rows = sorted.map(function (it) {
      var m = it.m, t = m.s.t;
      return '<tr><td>' + tname(t, m.s.sector) + '</td><td class="num"><input class="qty" type="number" min="0" step="any" value="' + it.qty + '" data-chg="qty" data-t="' + esc(t) + '" aria-label="' + esc(m.s.name) + ' 수량"></td><td class="num">' + priceCell(t) +
        '</td><td class="num">' + money(it.value) + '</td><td class="num">' + pct(it.w) + '</td><td class="num"><b class="yv">' + pct(m.y) + '</b><small>' + parts(m) + '</small></td><td class="num"><b class="gv">' + gText(m) + '</b></td><td class="num">' + yNTxt(m, 10) +
        '</td><td><button type="button" class="x" data-act="delHolding" data-t="' + esc(t) + '" aria-label="' + esc(m.s.name) + ' 빼기">빼기</button></td></tr>';
    }).join('');
    var held = {}; p.holdings.forEach(function (h) { held[h.t] = 1; });
    var table = '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">수량</th><th class="num">주가</th><th class="num">평가액</th><th class="num">비중</th><th class="num">회수율</th><th class="num">성장률</th><th class="num">10년 후 회수율</th><th></th></tr></thead><tbody>' + rows +
      '</tbody></table></div><div class="addrow">' + picker('addHolding', '종목 더하기', held) + '<span class="hint">수량을 고치면 바로 저장됩니다.</span></div>';
    return hero + fixedNote(P) + highNote(P) + '<div class="two">' + panel('비중', wb, { sub: '가장 큰 종목 ' + pct(con.top1) + ', 상위 3종목 ' + pct(con.top3) }) +
      panel('히트맵', CH.treemap(items, 560, 300) + '<p class="cap">' + legend + '</p>', { tools: seg('heat', [['y', '회수율'], ['g', '성장률'], ['d', '오늘 등락']], heat) }) + '</div>' +
      panel('보유 종목', table);
  };
  function emptyState() {
    return '<section class="book empty"><p class="book-say">주식을 <b class="y">이자가 커지는 예금</b>처럼 모아서 보는 계산기입니다.</p>' +
      '<p class="lead">가진 종목과 수량을 넣으면 포트폴리오 전체의 회수율과 성장률, 3·5·7년 뒤의 모습, 목표에 맞추는 비중까지 계산합니다. 넣은 내용은 이 브라우저에만 저장됩니다.</p>' +
      '<div class="addrow big">' + picker('addHolding', '첫 종목 고르기', {}) + '<button type="button" class="btn ghost" data-act="sample">예시 포트폴리오로 둘러보기</button></div>' +
      '<p class="hint">예시는 화면을 보여 드리려고 만든 가상의 구성이며 추천이 아닙니다.</p></section>';
  }

  /* ═════ 2. 종목 ═════ */
  HS.V.stocks = function () {
    var held = {}; pf().holdings.forEach(function (h) { held[h.t] = 1; });
    var watch = {}; S.watch.forEach(function (t) { watch[t] = 1; });
    var all = allTickers(), list = UI.filter === 'mine' ? all.filter(function (t) { return held[t] || watch[t]; }) : UI.filter === 'custom' ? all.filter(function (t) { return db(t).kind === 'custom'; }) : all;
    if (UI.filter === 'mine' && !list.length) { list = all; UI.filter = 'all'; }
    var rows = list.map(function (t) {
      var m = M(t);
      return '<tr' + (UI.detail === t ? ' class="sel"' : '') + '><td>' + tname(t, m.s.sector) + (held[t] ? chip('보유', 'blue') : '') + (watch[t] ? chip('관심') : '') + '</td><td class="num">' + priceCell(t) + '</td><td class="num"><b class="yv">' + pct(m.y) + '</b></td><td class="num"><b class="gv">' + gText(m) +
        '</b></td><td class="num">' + (m.stamina != null ? m.stamina.toFixed(1) + '배' : '—') + '</td><td class="num">' + yNTxt(m, 3) + '</td><td class="num">' + yNTxt(m, 5) + '</td><td class="num">' + yNTxt(m, 7) + '</td><td class="num">' + paybackTxt(m) +
        '</td><td class="acts"><button type="button" class="x" data-act="watch" data-t="' + esc(t) + '">' + (watch[t] ? '관심 빼기' : '관심') + '</button></td></tr>';
    }).join('');
    var tbl = '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">주가</th><th class="num">회수율</th><th class="num">성장률</th><th class="num">회수 체력</th><th class="num">3년 후</th><th class="num">5년 후</th><th class="num">7년 후</th><th class="num">원금 회수 기간</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    var tools = seg('filter', [['mine', '보유·관심'], ['all', '전체'], ['custom', '직접 입력']], UI.filter) + '<button type="button" class="btn sm" data-act="newCustom">종목 직접 입력</button>';
    return (UI.form ? customForm() : '') + (UI.detail && db(UI.detail) ? detailCard(UI.detail) : '') +
      panel('종목별 회수율과 성장률', tbl, { tools: tools, sub: '종목 이름을 누르면 카드가 열립니다. 블로그에서 분석한 종목은 발행한 회수율 카드와 같은 숫자에 지금 주가를 넣어 다시 계산합니다.' });
  };
  function detailCard(t) {
    var m = M(t), s = m.s, d = dep(), mx = Math.max(m.y, d, 1e-9), k = priceSrc(t);
    var held = pf().holdings.some(function (h) { return h.t === t; }), watched = S.watch.indexOf(t) >= 0;
    var meta = k === 'live' ? '실시간 시세 ' + dateTxt(S.prices[t].ts) : k === 'manual' ? '직접 입력한 주가' : (s.kind === 'custom' ? '입력한 주가' : '카드 기준일 ' + s.baseDate.replace(/-/g, '.') + ' 종가');
    var row = function (a, b, c) { return '<div class="cr"><span>' + a + '</span><b>' + b + '</b>' + (c ? '<small>' + c + '</small>' : '') + '</div>'; };
    var body = '<div class="card-h"><div><h2>' + esc(s.name) + ' <span>' + esc(t) + '</span></h2><p>주가 ' + usd(m.price) + ' · ' + esc(meta) + (s.basis ? ' · ' + esc(s.basis) : '') + '</p></div><button type="button" class="x light" data-act="closeDetail">닫기</button></div>' +
      '<div class="card-b"><div class="axes"><div class="ax y"><span>회수율</span><b>' + pct(m.y) + '</b><small>' + parts(m) + '</small>' + chip(verdict(m.y), 'blue') + '</div><div class="ax g"><span>성장률</span><b>' + gText(m) + '</b><small>' + esc(gDetail(m)) + '</small></div></div>' +
      '<div class="cmpbars"><div class="cb"><span>회수율</span><div class="cb-t"><i class="b1" style="width:' + (Math.max(m.y, 0) / mx * 100).toFixed(1) + '%"></i></div><b>' + pct(m.y) + '</b></div><div class="cb"><span>정기예금</span><div class="cb-t"><i class="b2" style="width:' + (d / mx * 100).toFixed(1) + '%"></i></div><b>' + pct(d) + '</b></div></div>' +
      '<div class="crs">' + row('회수 체력', m.stamina != null ? m.stamina.toFixed(1) + '배' : '산출 불가', m.stamina != null ? '' : m.staminaWhy) + (s.payout ? row('주주환원율 5년 추이', esc(s.payout), s.trend || '') : '') +
      row('3년 후 회수율', yNTxt(m, 3), '추정') + row('5년 후 회수율', yNTxt(m, 5), '추정') + row('7년 후 회수율', yNTxt(m, 7), '추정') + row('10년 후 회수율', yNTxt(m, 10), '추정') + row('원금 회수 기간', paybackTxt(m), m.grows ? '추정' : (m.y <= 0 ? '지금 회수율이 0 이하' : '성장률을 정할 수 없음')) + '</div>' +
      (m.grows && m.highG ? note('성장률(연 ' + pct(m.gHi, 0) + ')이 계속 이어진다고 본 숫자입니다. 10년이면 이익이 약 ' + Math.round(Math.pow(1 + m.gHi, 10)).toLocaleString('en-US') + '배가 됩니다. “지금 속도가 이어진다면”의 숫자로 읽어 주세요.') : '') +
      (s.whtNote ? note(esc(s.whtNote)) : '') +
      '<div class="card-f"><label>주가 직접 입력($)<input type="number" min="0" step="any" placeholder="자동" value="' + (S.manual[t] || '') + '" data-chg="manual" data-t="' + esc(t) + '"></label>' +
      '<label>내 가정 성장률(%)<input type="number" step="any" placeholder="' + (s.kind === 'etf' ? '없음' : '카드 값') + '" value="' + (S.gov[t] != null ? S.gov[t] : '') + '" data-chg="gov" data-t="' + esc(t) + '"></label>' +
      '<div class="card-btns">' + (held ? '' : '<button type="button" class="btn sm" data-act="holdFromDetail" data-t="' + esc(t) + '">포트폴리오에 넣기</button>') + '<button type="button" class="btn sm ghost" data-act="watch" data-t="' + esc(t) + '">' + (watched ? '관심 종목에서 빼기' : '관심 종목에 넣기') + '</button>' +
      (s.post ? '<a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(CFG.blogBase + s.post) + '">' + (s.kind === 'etf' ? 'ETF분석 글 보기' : '기업분석 글 보기') + '</a>' : '') +
      (s.kind === 'custom' ? '<button type="button" class="btn sm ghost" data-act="editCustom" data-t="' + esc(t) + '">숫자 고치기</button><button type="button" class="btn sm ghost" data-act="delCustom" data-t="' + esc(t) + '">지우기</button>' : '') + '</div></div></div>';
    return '<section class="card" id="detail">' + body + '</section>';
  }
  var SECTORS = ['정보기술', '커뮤니케이션', '경기소비재', '필수소비재', '금융', '헬스케어', '산업재', '에너지', '소재', '유틸리티', '부동산', 'ETF(시장 전체)', '기타'];
  function customForm() {
    var f = UI.form, inp = function (k, label, ph, type, extra) { return '<label>' + label + '<input ' + (type === 'text' ? 'type="text"' : 'type="number" step="any"') + ' data-f="' + k + '" value="' + esc(f[k] != null ? f[k] : '') + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '></label>'; };
    return '<section class="panel form" id="cform"><div class="panel-h"><h2>' + (f.edit ? '직접 입력한 종목 고치기' : '종목 직접 입력') + '</h2></div>' +
      '<p class="panel-sub">블로그에서 아직 다루지 않은 종목은 숫자를 직접 넣어 계산합니다. 숫자를 구하는 법은 <a target="_blank" rel="noopener" href="' + esc(CFG.blogBase + CFG.methodPost) + '">회수율 계산 기준</a> 글에 있습니다.</p><div class="fgrid">' +
      inp('t', '티커', 'KO', 'text', f.edit ? ' readonly' : ' maxlength="10"') + inp('name', '이름', '코카콜라', 'text') + inp('price', '주가($)', '70.00') + inp('dps', '최근 12개월 주당배당($)', '2.04') +
      inp('sd', '주식수 감소율(%, 늘었으면 −)', '0.3') + inp('gLo', '성장률 낮은 쪽(%, 선택)', '4') + inp('gHi', '성장률 높은 쪽(%, 선택)', '7') +
      '<label>업종<select data-f="sector">' + SECTORS.map(function (x) { return '<option' + (x === (f.sector || '기타') ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label></div>' +
      (f.err ? '<p class="err">' + esc(f.err) + '</p>' : '') + '<div class="card-btns"><button type="button" class="btn" data-act="saveCustom">저장</button><button type="button" class="btn ghost" data-act="cancelCustom">취소</button></div></section>';
  }

  /* ═════ 3. 비교 ═════ */
  HS.V.compare = function () {
    var cand = universe(), rest = allTickers().filter(function (t) { return cand.indexOf(t) < 0; });
    if (!UI.cmp) UI.cmp = (cand.length ? cand : rest).slice(0, 3);
    UI.cmp = UI.cmp.filter(function (t) { return db(t); });
    var sel = UI.cmp, chips = cand.concat(rest).map(function (t) { var on = sel.indexOf(t) >= 0; return '<button type="button" class="pick' + (on ? ' on' : '') + '" data-act="cmp" data-t="' + esc(t) + '" aria-pressed="' + on + '">' + esc(db(t).name) + '</button>'; }).join('');
    var head = panel('비교할 종목 고르기', '<div class="picks">' + chips + '</div>', { sub: '네 종목까지 고를 수 있습니다. 보유·관심 종목이 앞에 나옵니다.' });
    if (sel.length < 2) return head + '<p class="lead pad">두 종목 이상 고르면 비교표와 그래프가 나옵니다.</p>';
    var ms = sel.map(function (t) { return M(t); }), b = basis();
    var line = function (label, f) { return '<tr><th>' + label + '</th>' + ms.map(function (m) { return '<td class="num">' + f(m) + '</td>'; }).join('') + '</tr>'; };
    var tbl = '<div class="tw"><table class="tbl cmp"><thead><tr><th></th>' + ms.map(function (m, i) { return '<th class="num"><i class="dot" style="background:' + CH.SERIES[i] + '"></i>' + esc(m.s.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      line('주가', function (m) { return priceCell(m.s.t); }) + line('회수율', function (m) { return '<b class="yv">' + pct(m.y) + '</b>'; }) + line('배당수익률', function (m) { return pct(m.dy); }) + line('주식수 감소율', function (m) { return pct(m.sd); }) +
      line('성장률', function (m) { return '<b class="gv">' + gText(m) + '</b><small>' + esc(gDetail(m)) + '</small>'; }) + line('회수 체력', function (m) { return m.stamina != null ? m.stamina.toFixed(1) + '배' : '산출 불가'; }) + line('주주환원율 5년 추이', function (m) { return esc(m.s.payout || '—'); }) +
      line('3년 후 회수율', function (m) { return yNTxt(m, 3); }) + line('5년 후 회수율', function (m) { return yNTxt(m, 5); }) + line('7년 후 회수율', function (m) { return yNTxt(m, 7); }) + line('10년 후 회수율', function (m) { return yNTxt(m, 10); }) +
      line('원금 회수 기간', paybackTxt) + line('업종', function (m) { return esc(m.s.sector || '—'); }) + line('숫자 기준일', function (m) { return esc(m.s.kind === 'custom' ? '직접 입력' : m.s.baseDate); }) + '</tbody></table></div>';
    var cap = Math.max(0.12, dep() * 4), clipped = false, series = ms.map(function (m, i) {
      var g = E.gOf(m, b), pts = []; for (var n = 0; n <= 10; n++) { var v = E.yAfter(m.y, g, n); if (v > cap) clipped = true; pts.push([n, v]); }
      return { name: m.s.name, color: CH.SERIES[i], pts: pts, endLabel: m.s.t };
    });
    var cross = [];
    ms.forEach(function (a, i) { ms.forEach(function (c, j) { if (i === j || !a.grows || !c.grows) return; var ga = E.gOf(a, b), gc = E.gOf(c, b); if (a.y < c.y && ga > gc) { var n = Math.log(c.y / a.y) / Math.log((1 + ga) / (1 + gc)); if (n > 0 && n < 60) cross.push(esc(a.s.name) + '의 회수율이 ' + esc(c.s.name) + '을(를) 넘는 때는 약 ' + n.toFixed(0) + '년 뒤입니다.'); } }); });
    var chart = CH.line({ w: 760, h: 320, series: series, yMax: cap, hlines: [{ y: dep(), label: '정기예금 ' + pct(dep()) }], yFmt: function (v) { return pct(v, 0); }, xFmt: function (v) { return v === 0 ? '지금' : v + '년'; }, label: '종목별 회수율이 커지는 모습' });
    return head + panel('나란히 보기', tbl) + panel('회수율이 커지는 모습', chart + '<p class="cap">성장률은 범위의 ' + basisName() + ' 값으로 그렸습니다. 회수율이 0 이하이거나 성장률이 없는 종목은 평평한 선입니다.' + (clipped ? ' ' + pct(cap, 0) + '를 넘는 구간은 위쪽에서 잘렸습니다.' : '') + '</p>' + (cross.length ? '<ul class="plain">' + cross.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>' : ''));
  };

  /* ═════ 4. 돈으로 보기 ═════ */
  HS.V.money = function () {
    var p = pf(), R = rowsOf(p.holdings), P = E.portfolio(R); if (!R.length) return needHoldings();
    var N = UI.moneyN, tax = (S.settings.tax != null ? +S.settings.tax : 15) / 100, d = dep(), b = basis();
    var buyback = P.V * P.sd, divNet = P.div * (1 - tax);
    var cumLo = P.V * E.pfCum(P, N, 'lo'), cumHi = P.V * E.pfCum(P, N, 'hi'), depCum = P.V * d * N;
    var allCost = R.every(function (r) { return r.cost > 0; }), costSum = 0, retSum = 0;
    var rows = P.items.slice().sort(function (a, c) { return c.value - a.value; }).map(function (it) {
      var m = it.m, t = m.s.t, c = it.cost > 0 ? it.cost : null, pl = c ? (m.price / c - 1) : null, yoc = c ? m.y * m.price / c : null;
      if (c) { costSum += c * it.qty; retSum += it.value * m.y; }
      return '<tr><td>' + tname(t) + '</td><td class="num">' + qtyTxt(it.qty) + '</td><td class="num"><input class="qty" type="number" min="0" step="any" placeholder="선택" value="' + (c || '') + '" data-chg="cost" data-t="' + esc(t) + '" aria-label="' + esc(m.s.name) + ' 평균 매수가"></td><td class="num">' + money(it.value) +
        '</td><td class="num">' + (pl == null ? '—' : (pl >= 0 ? '+' : '') + pct(pl) + '<small>' + money((m.price - c) * it.qty) + '</small>') + '</td><td class="num">' + money(it.qty * (m.s.dps || 0)) + '</td><td class="num">' + pct(m.y) + '</td><td class="num">' + (yoc == null ? '—' : '<b class="yv">' + pct(yoc) + '</b>') + '</td></tr>';
    }).join('');
    var series = [], lo = [], hi = [], mid = [], dl = [], band = [], step = N <= 10 ? 0.5 : 1;
    for (var t = 0; t <= N + 1e-9; t += step) { var a = P.V * E.pfCum(P, t, 'lo'), c2 = P.V * E.pfCum(P, t, 'hi'); band.push([t, Math.min(a, c2), Math.max(a, c2)]); mid.push([t, P.V * E.pfCum(P, t, b)]); dl.push([t, P.V * d * t]); }
    var fxk = S.settings.cur === 'KRW' ? (S.settings.fx || 1400) : 1;
    series.push({ name: '포트폴리오', color: CH.C.blue, pts: mid, band: band, endLabel: '포트폴리오' }, { name: '정기예금', color: CH.C.sub, pts: dl, dash: '6 5', endLabel: '정기예금 이자', below: true });
    var chart = CH.line({ w: 760, h: 320, L: S.settings.cur === 'KRW' ? 96 : 78, series: series, hlines: cumHi >= P.V * 0.6 ? [{ y: P.V, label: '원금 ' + money(P.V), color: CH.C.navy }] : [], yFmt: function (v) { return money(v); }, xFmt: function (v) { return v === 0 ? '지금' : v + '년'; }, label: '쌓이는 회수액' });
    return '<div class="kpirow">' + kpi('평가액', money(P.V)) + kpi('한 해 배당금', money(P.div), '원천징수 ' + (tax * 100).toFixed(0) + '% 뒤 ' + money(divNet) + ', 한 달 평균 ' + money(divNet / 12)) +
      kpi('자사주로 돌아오는 몫', money(buyback), '통장에 들어오는 현금이 아니라 내 지분이 커지는 몫') + kpi('같은 돈을 정기예금에 넣으면', money(P.V * d), '한 해 이자(세전), 금리 ' + pct(d)) + '</div>' +
      panel(N + '년 동안 쌓이는 회수액', '<div class="kpirow slim">' + kpi('포트폴리오', minus(money(Math.min(cumLo, cumHi))) + (Math.abs(cumHi - cumLo) > 1 ? '~' + money(Math.max(cumLo, cumHi)) : ''), '배당과 자사주 몫의 합, 추정') + kpi('정기예금 이자', money(depCum), '금리가 그대로일 때, 이자를 다시 넣지 않은 단순 합') + kpi('원금 회수 기간', pfPay(P), '추정') + '</div>' + chart +
        '<p class="cap">파란 띠는 성장률 범위(낮은 쪽~높은 쪽), 선은 ' + basisName() + ' 값입니다. 받은 돈을 다시 투자하지 않았다고 본 단순 합이고, 달러로 받는 돈과 원화 예금 이자를 나란히 놓은 비교라 환율 변동은 넣지 않았습니다.</p>',
        { tools: seg('moneyN', [[3, '3년'], [5, '5년'], [7, '7년'], [10, '10년'], [20, '20년']], N) }) + fixedNote(P) + highNote(P) +
      panel('종목별 금액', '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">수량</th><th class="num">평균 매수가($)</th><th class="num">평가액</th><th class="num">평가손익</th><th class="num">한 해 배당금</th><th class="num">회수율</th><th class="num">내 매수가 기준 회수율</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="cap">평균 매수가를 넣으면 평가손익과 “내 매수가 기준 회수율”(지금 돌려받는 몫 ÷ 내가 산 값)이 나옵니다.' + (allCost && costSum > 0 ? ' 포트폴리오 전체로는 <b>' + pct(retSum / costSum) + '</b>입니다.' : '') + ' 배당금은 세전이며, 미국 주식 배당에는 보통 현지에서 15%가 원천징수됩니다.</p>');
  };
  function needHoldings() { return '<section class="book empty"><p class="book-say">먼저 포트폴리오에 종목을 넣어 주세요.</p><div class="addrow big">' + picker('addHolding', '종목 고르기', {}) + '<button type="button" class="btn ghost" data-act="sample">예시 포트폴리오로 둘러보기</button></div></section>'; }

  /* ═════ 5. 3·5·7년 뒤 ═════ */
  HS.V.future = function () {
    var p = pf(), R = rowsOf(p.holdings), P = E.portfolio(R); if (!R.length) return needHoldings();
    var N = UI.horizon, d = dep(), b = basis(), maxN = Math.max(10, N);
    var band = [], mid = [], yEndLo = E.pfYAfter(P, maxN, 'lo'), cap = Math.max(yEndLo * 2.5, d * 3, P.y * 3, 0.08), clipped = false;
    for (var n = 0; n <= maxN; n++) { var lo = E.pfYAfter(P, n, 'lo'), hi = E.pfYAfter(P, n, 'hi'); if (hi > cap) clipped = true; band.push([n, Math.min(lo, hi), Math.min(Math.max(lo, hi), cap)]); mid.push([n, E.pfYAfter(P, n, b)]); }
    var passes = function (bs) { if (E.pfYAfter(P, 0, bs) >= d) return 0; if (E.pfYAfter(P, 60, bs) < d) return null; var a = 0, c = 60; for (var i = 0; i < 50; i++) { var m = (a + c) / 2; if (E.pfYAfter(P, m, bs) >= d) c = m; else a = m; } return c; };
    var pa = passes('hi'), pb = passes('lo'), passTxt = pa === 0 && pb === 0 ? '지금도 넘습니다' : pa == null ? '60년 안에는 넘지 않습니다' : pb == null ? '빠르면 약 ' + pa.toFixed(0) + '년 뒤' : yearsTxt(pa, pb) + ' 뒤';
    var chart = CH.line({ w: 760, h: 320, series: [{ name: '포트폴리오 회수율', color: CH.C.blue, pts: mid, band: band, endLabel: '포트폴리오 회수율' }], yMax: cap, hlines: [{ y: d, label: '정기예금 ' + pct(d) }], marks: [{ x: N, label: N + '년 후' }], yFmt: function (v) { return pct(v, 1); }, xFmt: function (v) { return v === 0 ? '지금' : v + '년'; }, label: '포트폴리오 회수율이 커지는 모습' });
    var ns = [3, 5, 7, 10]; if (ns.indexOf(N) < 0) ns = ns.concat([N]).sort(function (x, y) { return x - y; });
    var th = ns.map(function (n) { return '<th class="num' + (n === N ? ' hot' : '') + '">' + n + '년 후</th>'; }).join('');
    var rows = '<tr class="total"><td><b>포트폴리오 전체</b></td><td class="num">100%</td><td class="num"><b class="yv">' + pct(P.y) + '</b></td><td class="num"><b class="gv">' + (P.gLo != null ? rng(P.gLo, P.gHi) : '—') + '</b></td>' + ns.map(function (n) { return '<td class="num' + (n === N ? ' hot' : '') + '"><b>' + pfYN(P, n) + '</b></td>'; }).join('') + '<td class="num">' + pfPay(P) + '</td></tr>' +
      P.items.slice().sort(function (a, c) { return c.w - a.w; }).map(function (it) { var m = it.m; return '<tr><td>' + tname(m.s.t) + '</td><td class="num">' + pct(it.w) + '</td><td class="num">' + pct(m.y) + '</td><td class="num">' + gText(m) + '</td>' + ns.map(function (n) { return '<td class="num' + (n === N ? ' hot' : '') + '">' + yNTxt(m, n) + '</td>'; }).join('') + '<td class="num">' + paybackTxt(m) + '</td></tr>'; }).join('');
    var gMult = P.gLo != null ? '이익은 약 ' + Math.pow(1 + P.gLo, N).toFixed(1) + (P.gHi - P.gLo > 0.0005 ? '~' + Math.pow(1 + P.gHi, N).toFixed(1) : '') + '배' : '';
    return '<div class="kpirow">' + kpi('지금 회수율', '<span class="yv">' + pct(P.y) + '</span>', P.sd >= 0 ? '배당 ' + pct(P.dy) + ' + 자사주 ' + pct(P.sd) : '배당 ' + pct(P.dy) + ' − 주식 수 증가 ' + pct(-P.sd)) + kpi(N + '년 후 회수율', '<span class="yv">' + pfYN(P, N) + '</span>', '지금 넣은 원금 대비, 추정', 'hot') +
      kpi('성장률', '<span class="gv">' + (P.gLo != null ? rng(P.gLo, P.gHi) : '—') + '</span>', (P.gCover < 0.9995 ? '성장률이 있는 비중 ' + pct(P.gCover, 0) + ' 기준. ' : '') + gMult) + kpi('정기예금 금리를 넘는 때', passTxt, '정기예금 ' + pct(d) + ' 기준') + '</div>' +
      panel('몇 년 뒤를 볼까요', chart + '<p class="cap">파란 띠는 성장률 범위(낮은 쪽~높은 쪽), 선은 ' + basisName() + ' 값입니다. 회사가 번 돈 가운데 돌려주는 비율이 그대로라고 보고, 종목마다 따로 키운 뒤 비중대로 더했습니다.' + (clipped ? ' 띠의 위쪽은 ' + pct(cap, 0) + '에서 잘랐습니다.' : '') + '</p>',
        { tools: seg('horizon', [[3, '3년'], [5, '5년'], [7, '7년'], [10, '10년'], [15, '15년'], [20, '20년']], N) }) + fixedNote(P) + highNote(P) +
      panel('종목별로 보기', '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">비중</th><th class="num">지금 회수율</th><th class="num">성장률</th>' + th + '<th class="num">원금 회수 기간</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="cap">앞으로의 숫자는 모두 추정입니다. 확인된 숫자는 지금 회수율뿐입니다.</p>');
  };

  /* 다른 파일(app2.js)이 쓰는 것 */
  HS.x = { db: db, pf: pf, M: M, rowsOf: rowsOf, basis: basis, dep: dep, depLabel: depLabel, universe: universe, allTickers: allTickers, save: save, pct: pct, rng: rng, pp: pp, usd: usd, money: money, qtyTxt: qtyTxt, yearsTxt: yearsTxt, gText: gText, parts: parts, yNTxt: yNTxt,
    paybackTxt: paybackTxt, pfYN: pfYN, pfPay: pfPay, verdict: verdict, basisName: basisName, dateTxt: dateTxt, today: today, chip: chip, kpi: kpi, panel: panel, note: note, seg: seg, tname: tname, picker: picker, priceOf: priceOf, priceSrc: priceSrc, priceCell: priceCell, fixedNote: fixedNote, highNote: highNote, needHoldings: needHoldings, minus: minus, BLOG: BLOG, SECTORS: SECTORS };
})();
