/* 회수율 포트폴리오 계산기: 화면(조정·관리 묶음), 눌렀을 때 할 일, 시작 */
(function () {
  'use strict';
  var E = HS_ENGINE, CH = HS_CHARTS, ST = HS_STORE, CFG = HS_CONFIG, DATA = HS_DATA, esc = CH.esc;
  var HS = window.HS, S = HS.S, UI = HS.UI, x = HS.x, V = HS.V;
  var pct = x.pct, rng = x.rng, money = x.money, kpi = x.kpi, panel = x.panel, note = x.note, seg = x.seg, tname = x.tname, chip = x.chip;

  function current() { var p = x.pf(), R = x.rowsOf(p.holdings); return { p: p, R: R, P: E.portfolio(R) }; }

  /* ═════ 6. 조정 시뮬레이션 ═════ */
  function ensureSim() {
    var p = x.pf();
    if (!UI.sim || UI.sim.pid !== p.id) UI.sim = { pid: p.id, rows: p.holdings.filter(function (h) { return x.db(h.t); }).map(function (h) { return { t: h.t, qty: h.qty }; }) };
    return UI.sim;
  }
  function simPortfolio() { return E.portfolio(ensureSim().rows.filter(function (r) { return r.qty > 0 && x.db(r.t); }).map(function (r) { return { m: x.M(r.t), qty: r.qty }; })); }
  V.sim = function () {
    var c = current(); if (!c.R.length) return x.needHoldings();
    var sim = ensureSim(), P0 = c.P, P1 = simPortfolio(), q0 = {}, w0 = {}, w1 = {};
    c.p.holdings.forEach(function (h) { q0[h.t] = h.qty; }); P0.items.forEach(function (it) { w0[it.m.s.t] = it.w; }); P1.items.forEach(function (it) { w1[it.m.s.t] = it.w; });
    var net = 0, inSim = {};
    var rows = sim.rows.map(function (r) {
      inSim[r.t] = 1; var pr = x.priceOf(r.t), dq = r.qty - (q0[r.t] || 0), dv = dq * pr; net += dv;
      return '<tr><td>' + tname(r.t) + '</td><td class="num">' + x.qtyTxt(q0[r.t] || 0) + '</td><td class="num"><span class="stepper"><button type="button" data-act="simStep" data-t="' + esc(r.t) + '" data-d="-1" aria-label="한 주 줄이기">−</button><input class="qty" type="number" min="0" step="any" value="' + r.qty + '" data-chg="simQty" data-t="' + esc(r.t) + '" aria-label="' + esc(x.db(r.t).name) + ' 바꾼 수량"><button type="button" data-act="simStep" data-t="' + esc(r.t) + '" data-d="1" aria-label="한 주 늘리기">+</button></span></td><td class="num">' +
        pct(w0[r.t] || 0) + '</td><td class="num"><b>' + pct(w1[r.t] || 0) + '</b></td><td class="num">' + (Math.abs(dv) < 0.005 ? '—' : (dv > 0 ? '사기 ' : '팔기 ') + money(Math.abs(dv))) + '</td></tr>';
    }).join('');
    var c0 = E.concentration(P0), c1 = E.concentration(P1);
    var line = function (label, a, b, diff) { return '<tr><th>' + label + '</th><td class="num">' + a + '</td><td class="num"><b>' + b + '</b></td><td class="num">' + (diff || '') + '</td></tr>'; };
    var g0 = P0.gLo != null ? rng(P0.gLo, P0.gHi) : '—', g1 = P1.gLo != null ? rng(P1.gLo, P1.gHi) : '—';
    var cmp = '<div class="tw"><table class="tbl cmp"><thead><tr><th></th><th class="num">지금</th><th class="num">바꾼 뒤</th><th class="num">차이</th></tr></thead><tbody>' +
      line('평가액', money(P0.V), money(P1.V), Math.abs(net) < 0.005 ? '' : (net > 0 ? '더 넣는 돈 ' : '빼는 돈 ') + money(Math.abs(net))) +
      line('회수율', pct(P0.y), '<span class="yv">' + pct(P1.y) + '</span>', P1.V > 0 ? x.pp(P1.y - P0.y) : '') + line('배당 몫', pct(P0.dy), pct(P1.dy), P1.V > 0 ? x.pp(P1.dy - P0.dy) : '') + line('자사주 몫', pct(P0.sd), pct(P1.sd), P1.V > 0 ? x.pp(P1.sd - P0.sd) : '') +
      line('성장률', g0, '<span class="gv">' + g1 + '</span>', P0.gLo != null && P1.gLo != null ? x.pp((P1.gLo + P1.gHi) / 2 - (P0.gLo + P0.gHi) / 2) : '') +
      [3, 5, 7, 10].map(function (n) { return line(n + '년 후 회수율', x.pfYN(P0, n), P1.V > 0 ? x.pfYN(P1, n) : '—'); }).join('') +
      line('원금 회수 기간', x.pfPay(P0), P1.V > 0 ? x.pfPay(P1) : '—') + line('한 해 배당금(세전)', money(P0.div), money(P1.div), money(P1.div - P0.div).replace(/^(?!−)/, P1.div - P0.div > 0.005 ? '+' : '')) +
      line('가장 큰 종목 비중', pct(c0.top1), pct(c1.top1)) + line('상위 3종목 비중', pct(c0.top3), pct(c1.top3)) + '</tbody></table></div>';
    return panel('수량을 바꿔 보기', '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">지금 수량</th><th class="num">바꾼 수량</th><th class="num">지금 비중</th><th class="num">바꾼 비중</th><th class="num">사고파는 금액</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="addrow">' + x.picker('simAdd', '다른 종목 넣어 보기', inSim) + '<button type="button" class="btn sm ghost" data-act="simReset">처음으로 되돌리기</button></div>',
      { sub: '여기서 바꾼 수량은 저장하기 전까지 실제 포트폴리오에 영향을 주지 않습니다.' }) +
      panel('지금과 바꾼 뒤', cmp + (P1.V > 0 ? x.fixedNote(P1) : '') + '<div class="card-btns"><button type="button" class="btn" data-act="simSaveNew">새 포트폴리오로 저장</button><button type="button" class="btn ghost" data-act="simApply">지금 포트폴리오에 적용</button></div>');
  };

  /* ═════ 7. 목표 맞추기 ═════ */
  function goalUniverse() {
    var c = current(), G = UI.goal, held = {}, list = [];
    c.P.items.forEach(function (it) { held[it.m.s.t] = it.w; list.push(it.m.s.t); });
    S.watch.forEach(function (t) { if (x.db(t) && held[t] == null) list.push(t); });
    return { c: c, held: held, list: list, on: function (t) { return held[t] != null || G.uni[t] !== false; } };
  }
  function defaultCap(P) { var top = E.concentration(P).top1; return Math.max(40, Math.ceil(top * 20) * 5); }
  function runGoal() {
    var gu = goalUniverse(), G = UI.goal, P = gu.c.P, b = x.basis();
    var ty = G.y !== '' && isFinite(+G.y) ? +G.y / 100 : null, tg = G.g !== '' && isFinite(+G.g) ? +G.g / 100 : null;
    if (ty == null && tg == null) { UI.goalRes = { status: 'noinput' }; return; }
    var cap = (G.cap !== '' && +G.cap > 0 ? +G.cap : defaultCap(P)) / 100;
    var u = gu.list.filter(gu.on).map(function (t) { var m = x.M(t), g = E.gOf(m, b); return { t: t, m: m, w0: gu.held[t] || 0, a: E.yAfter(m.y, g, G.at), g: g, lock: !!G.lock[t] && gu.held[t] != null }; });
    var opt = { targetY: ty, targetG: tg, cap: cap, mode: G.mode };
    var res = E.optimize(u, opt); res.u = u; res.opt = opt; res.V = P.V; res.at = G.at; res.basis = b;
    res.frontier = E.frontier(u, cap, 24);
    var now = { y: 0, g: null }, gw = 0, gs = 0; u.forEach(function (it) { now.y += it.w0 * it.a; if (it.g != null) { gw += it.w0; gs += it.w0 * it.g; } }); now.g = gw > 0 ? gs / gw : null; res.now = now;
    UI.goalRes = res;
  }
  V.goal = function () {
    var gu = goalUniverse(), G = UI.goal, P = gu.c.P; if (!gu.c.R.length) return x.needHoldings();
    var atName = G.at === 0 ? '지금' : G.at + '년 후';
    var uni = gu.list.map(function (t) {
      var isHeld = gu.held[t] != null;
      return '<label class="uchk"><input type="checkbox" data-chg="goalUni" data-t="' + esc(t) + '"' + (gu.on(t) ? ' checked' : '') + (isHeld ? ' disabled' : '') + '><span>' + esc(x.db(t).name) + (isHeld ? ' <small>' + pct(gu.held[t]) + '</small>' : ' <small>관심</small>') + '</span>' +
        (isHeld ? '<button type="button" class="lock' + (G.lock[t] ? ' on' : '') + '" data-act="goalLock" data-t="' + esc(t) + '" aria-pressed="' + !!G.lock[t] + '">' + (G.lock[t] ? '그대로 두기' : '바꿔도 됨') + '</button>' : '') + '</label>';
    }).join('');
    var form = '<div class="fgrid"><label>목표 회수율(%)<input type="number" step="any" min="0" data-chg="goalF" data-k="y" value="' + esc(G.y) + '" placeholder="예: ' + (Math.max(P.y, 0) * 100 + 0.5).toFixed(1) + '"></label>' +
      '<label>언제의 회수율인가요<select data-chg="goalF" data-k="at">' + [0, 3, 5, 7, 10].map(function (n) { return '<option value="' + n + '"' + (n === G.at ? ' selected' : '') + '>' + (n === 0 ? '지금' : n + '년 후') + '</option>'; }).join('') + '</select></label>' +
      '<label>목표 성장률(%, 선택)<input type="number" step="any" data-chg="goalF" data-k="g" value="' + esc(G.g) + '" placeholder="예: ' + (P.gLo != null ? (P.gLo * 100).toFixed(0) : '8') + '"></label>' +
      '<label>한 종목 최대 비중(%)<input type="number" step="1" min="1" max="100" data-chg="goalF" data-k="cap" value="' + esc(G.cap) + '" placeholder="' + defaultCap(P) + '"></label></div>' +
      '<div class="frow"><span class="flabel">맞추는 방법</span>' + seg('goalMode', [['trade', '사고팔아 맞추기'], ['buy', '팔지 않고 더 사서 맞추기']], G.mode) + '</div>' +
      '<div class="frow"><span class="flabel">쓸 종목</span><div class="uni">' + uni + '</div></div>' + (S.watch.length ? '' : '<p class="hint">종목 화면에서 관심 종목을 넣어 두면, 아직 갖고 있지 않은 종목도 후보로 쓸 수 있습니다.</p>') +
      '<div class="card-btns"><button type="button" class="btn" data-act="goalRun">맞는 비중 찾기</button><span class="hint">지금: 회수율 ' + pct(P.y) + (P.gLo != null ? ', 성장률 ' + rng(P.gLo, P.gHi) : '') + '. 성장률은 범위의 ' + x.basisName() + ' 값으로 계산합니다(기록·설정에서 바꿀 수 있습니다).</span></div>';
    var out = '';
    var r = UI.goalRes;
    if (r && r.status === 'noinput') out = note('목표 회수율이나 목표 성장률 가운데 하나는 넣어 주세요.');
    else if (r && (r.status === 'ok' || r.status === 'infeasible')) out = goalResult(r);
    return panel('원하는 회수율과 성장률', form, { sub: '넣어 둔 종목들의 비중을 어떻게 바꾸면 목표에 닿는지 계산합니다. 가장 적게 움직이는 답을 찾습니다.' }) + out;
  };
  function goalResult(r) {
    var atName = r.at === 0 ? '지금' : r.at + '년 후', o = r.opt, out, pts = [], hl = [];
    var tgt = (o.targetY != null ? atName + ' 회수율 ' + pct(o.targetY) + ' 이상' : '') + (o.targetY != null && o.targetG != null ? ', ' : '') + (o.targetG != null ? '성장률 ' + pct(o.targetG) + ' 이상' : '');
    r.u.forEach(function (it) { if (it.g != null) pts.push({ x: it.g, y: it.a, label: it.t, color: '#9aa7b5' }); });
    if (r.now.g != null) pts.push({ x: r.now.g, y: r.now.y, label: '지금', color: CH.C.navy, bold: true, r: 6 });
    if (r.status === 'ok') {
      var V0 = r.V, total = r.mode === 'buy' ? V0 * (1 + r.add) : V0, moved = r.mode === 'buy' ? V0 * r.add : V0 * r.turnover;
      var same = moved < 0.005 * Math.max(V0, 1) / 100 + 1e-9;
      var rows = r.u.map(function (it, i) {
        var w = r.w[i], amt = r.mode === 'buy' ? r.beta[i] * V0 : (w - it.w0) * V0, sh = amt / it.m.price;
        return { it: it, w: w, amt: amt, sh: sh };
      }).sort(function (a, b) { return Math.abs(b.amt) - Math.abs(a.amt); }).map(function (q) {
        var act = Math.abs(q.amt) < Math.max(V0 * 1e-5, 0.005) ? '<span class="mute">그대로</span>' : (q.amt > 0 ? '<b class="buy">사기</b> ' : '<b class="sell">팔기</b> ') + money(Math.abs(q.amt)) + '<small>약 ' + x.qtyTxt(Math.abs(Math.round(q.sh * 10) / 10)) + '주</small>';
        return '<tr><td>' + tname(q.it.t) + (q.it.lock ? chip('그대로 두기') : '') + '</td><td class="num">' + pct(q.it.w0) + '</td><td class="num"><b>' + pct(q.w) + '</b></td><td class="num">' + (Math.abs(q.w - q.it.w0) < 5e-5 ? '—' : x.pp(q.w - q.it.w0)) + '</td><td class="num">' + act + '</td><td class="num">' + pct(q.it.a) + '</td><td class="num">' + (q.it.g != null ? pct(q.it.g) : '—') + '</td></tr>';
      }).join('');
      var nowY = 0; r.u.forEach(function (it, i) { nowY += r.w[i] * it.m.y; });
      if (r.got.g != null) pts.push({ x: r.got.g, y: r.got.y, label: '추천', color: CH.C.blue, shape: 'ring', bold: true });
      var head = same ? '지금 비중으로 이미 목표를 채우고 있습니다.' : r.mode === 'buy' ? '팔지 않고 <b>' + money(moved) + '</b>(지금 평가액의 ' + pct(r.add) + ')를 더 사면 닿습니다.' : '평가액의 <b>' + pct(r.turnover) + '</b>(' + money(moved) + ')를 옮기면 닿습니다.';
      out = '<p class="verdict ok">' + head + '</p><div class="kpirow slim">' + kpi(atName + ' 회수율', '<span class="yv">' + pct(r.got.y) + '</span>', '지금 ' + pct(r.now.y) + '에서') + (r.at > 0 ? kpi('바꾼 뒤 지금 회수율', pct(nowY)) : '') + kpi('성장률', '<span class="gv">' + (r.got.g != null ? pct(r.got.g) : '—') + '</span>', r.now.g != null ? '지금 ' + pct(r.now.g) + '에서' : '') + kpi('바꾼 뒤 평가액', money(total)) + '</div>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">지금 비중</th><th class="num">찾은 비중</th><th class="num">변화</th><th class="num">할 일</th><th class="num">' + atName + ' 회수율</th><th class="num">성장률</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="card-btns"><button type="button" class="btn" data-act="goalToSim">조정 시뮬레이션에서 열기</button><button type="button" class="btn ghost" data-act="goalToTargets">추가 매수 계획의 목표 비중으로 저장</button></div>';
    } else {
      var L = r.limits, li = [];
      if (o.targetY != null && L.maxY != null) li.push('이 종목들과 한 종목 최대 비중 ' + pct(o.cap, 0) + '로 만들 수 있는 가장 높은 ' + atName + ' 회수율은 <b>' + pct(L.maxY) + '</b>입니다.');
      if (o.targetY != null && o.targetG != null && L.maxYwithG != null) li.push('성장률 ' + pct(o.targetG) + ' 이상을 지키면서는 <b>' + pct(L.maxYwithG) + '</b>까지입니다.');
      if (o.targetG != null && L.maxG != null) li.push('만들 수 있는 가장 높은 성장률은 <b>' + pct(L.maxG) + '</b>입니다.' + (o.targetY != null ? (L.maxGwithY != null ? ' 목표 회수율을 지키면서는 <b>' + pct(L.maxGwithY) + '</b>까지입니다.' : ' 목표 회수율은 성장률과 상관없이 이 종목들로 닿지 않습니다.') : ''));
      li.push(r.mode === 'buy' ? '팔지 않고 더 사는 것만으로는 닿지 않습니다. “사고팔아 맞추기”로 바꾸거나, 목표보다 회수율·성장률이 높은 관심 종목을 더해 보세요.' : '관심 종목을 더하거나, 한 종목 최대 비중을 올리거나, 목표를 낮춰 보세요.');
      out = '<p class="verdict no">이 조건(' + tgt + ')은 지금 넣은 종목들로 만들 수 없습니다.</p><ul class="plain">' + li.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>';
    }
    if (o.targetY != null && o.targetG != null) pts.push({ x: o.targetG, y: o.targetY, label: '목표', color: CH.C.ink, shape: 'cross', bold: true });
    else if (o.targetY != null) hl.push({ y: o.targetY, label: '목표 회수율 ' + pct(o.targetY), color: CH.C.ink });
    var ys = pts.filter(function (p) { return p.bold; }).map(function (p) { return p.y; }).concat(o.targetY != null ? [o.targetY] : []), cap = Math.max(0.06, Math.max.apply(null, ys.concat([0])) * 2.2);
    var xcap = Math.max(0.25, (o.targetG || 0) * 1.5, (r.now.g || 0) * 2.2, r.status === 'ok' && r.got.g != null ? r.got.g * 1.3 : 0), xclip = pts.some(function (p) { return p.x > xcap; });
    var fr = r.frontier.filter(function (p) { return p[0] <= xcap; });
    var chart = fr.length > 1 ? CH.line({ w: 760, h: 340, series: [{ name: '만들 수 있는 한계', color: CH.C.blue, pts: fr.map(function (p) { return [p[0], Math.min(p[1], cap)]; }) }], points: pts.map(function (p) { p.y = Math.min(p.y, cap); p.x = Math.min(p.x, xcap); return p; }), hlines: hl, yMax: cap, zero: false,
      yFmt: function (v) { return pct(v, 1); }, xFmt: function (v) { return pct(v, 0); }, xTitle: '성장률(' + x.basisName(r.basis) + ' 값)', label: '성장률과 회수율로 본 만들 수 있는 범위' }) +
      '<p class="cap">세로는 ' + atName + ' 회수율, 가로는 성장률입니다. 파란 선은 한 종목 최대 비중 ' + pct(o.cap, 0) + ' 안에서 만들 수 있는 가장 높은 회수율이고, 선 아래쪽이 만들 수 있는 범위입니다. 회색 점은 종목 하나하나입니다.' + (xclip ? ' 성장률이 ' + pct(xcap, 0) + '를 넘는 종목은 오른쪽 끝에 붙여 그렸습니다.' : '') + '</p>' : '';
    return panel('결과: ' + tgt, out + chart + '<p class="cap">이 결과는 넣어 둔 숫자로 한 계산이며 매수·매도 추천이 아닙니다. 세금과 수수료는 넣지 않았습니다.</p>');
  }

  /* ═════ 8. 추가 매수 계획 ═════ */
  function buyTargets(c) {
    var B = UI.buy, tg = {}, list = [], held = {};
    c.P.items.forEach(function (it) { held[it.m.s.t] = it.w; list.push(it.m.s.t); });
    if (B.src === 'saved') { Object.keys(c.p.targets).forEach(function (t) { if (x.db(t) && held[t] == null && c.p.targets[t] > 0) list.push(t); }); list.forEach(function (t) { tg[t] = +c.p.targets[t] || 0; }); }
    else if (B.src === 'equal') list.forEach(function (t) { tg[t] = 100 / list.length; });
    else list.forEach(function (t) { tg[t] = held[t] * 100; });
    var sum = list.reduce(function (s, t) { return s + tg[t]; }, 0);
    return { list: list, tg: tg, sum: sum, held: held };
  }
  function buyCompute(c) {
    var B = UI.buy, T = buyTargets(c), cashIn = +B.cash > 0 ? +B.cash : 0, cash = S.settings.cur === 'KRW' ? cashIn / (S.settings.fx || 1400) : cashIn;
    if (!(T.sum > 0)) return { T: T, cash: cash, plan: null };
    var rows = T.list.map(function (t) { return { t: t, value: (T.held[t] || 0) * c.P.V, price: x.priceOf(t), target: T.tg[t] / T.sum }; });
    return { T: T, cash: cash, rows: rows, plan: cash > 0 ? E.buyPlan(rows, cash, B.frac) : null };
  }
  V.buy = function () {
    var c = current(); if (!c.R.length) return x.needHoldings();
    var B = UI.buy, hasSaved = Object.keys(c.p.targets).some(function (t) { return c.p.targets[t] > 0; });
    if (B.src === 'saved' && !hasSaved) B.src = 'cur';
    var r = buyCompute(c), T = r.T, P = c.P;
    var rowsHtml = T.list.map(function (t, i) {
      var o = r.plan ? r.plan.rows[i] : null, w0 = T.held[t] || 0;
      return '<tr><td>' + tname(t) + '</td><td class="num">' + pct(w0) + '</td><td class="num">' + (B.src === 'saved' ? '<input class="qty" type="number" min="0" step="any" value="' + (+T.tg[t].toFixed(2)) + '" data-chg="target" data-t="' + esc(t) + '" aria-label="' + esc(x.db(t).name) + ' 목표 비중">' : pct(T.tg[t] / 100)) +
        '</td><td class="num">' + (o && o.shares > 0 ? '<b>' + x.qtyTxt(Math.round(o.shares * 1e4) / 1e4) + '주</b>' : '—') + '</td><td class="num">' + (o && o.buy > 0 ? money(o.buy) : '—') + '</td><td class="num">' + (o ? '<b>' + pct(o.wAfter) + '</b>' : '—') + '</td></tr>';
    }).join('');
    var after = '';
    if (r.plan) {
      var P1 = E.portfolio(T.list.map(function (t, i) { return { m: x.M(t), qty: ((T.held[t] || 0) * P.V) / x.priceOf(t) + r.plan.rows[i].shares }; }).filter(function (q) { return q.qty > 0; }));
      after = '<div class="kpirow slim">' + kpi('쓰는 돈', money(r.plan.spent), '남는 돈 ' + money(Math.max(0, r.plan.left))) + kpi('회수율', '<span class="yv">' + pct(P1.y) + '</span>', '지금 ' + pct(P.y) + '에서 ' + x.pp(P1.y - P.y)) + kpi('성장률', '<span class="gv">' + (P1.gLo != null ? rng(P1.gLo, P1.gHi) : '—') + '</span>', P.gLo != null ? '지금 ' + rng(P.gLo, P.gHi) : '') + kpi('산 뒤 평가액', money(P1.V)) + '</div>';
    }
    var sumNote = B.src === 'saved' && Math.abs(T.sum - 100) > 0.05 ? note('목표 비중의 합이 ' + T.sum.toFixed(1) + '%입니다. 100%가 되도록 같은 비율로 맞춰 계산했습니다.') : '';
    var form = '<div class="fgrid"><label>새로 넣는 돈(' + (S.settings.cur === 'KRW' ? '원' : '달러') + ')<input type="number" min="0" step="any" data-chg="buyCash" value="' + esc(B.cash) + '" placeholder="' + (S.settings.cur === 'KRW' ? '1000000' : '1000') + '"></label></div>' +
      '<div class="frow"><span class="flabel">목표 비중</span>' + seg('buySrc', (hasSaved ? [['saved', '저장한 목표']] : []).concat([['cur', '지금 비중 그대로'], ['equal', '똑같이 나누기']]), B.src) + (B.src !== 'saved' ? '<button type="button" class="btn sm ghost" data-act="buySaveTargets">이 비중을 목표로 저장해 고치기</button>' : '') + '</div>' +
      '<div class="frow"><label class="uchk"><input type="checkbox" data-chg="buyFrac"' + (B.frac ? ' checked' : '') + '><span>소수점 주식으로 사기</span></label></div>';
    return panel('새로 넣는 돈으로 무엇을 살까', form, { sub: '갖고 있는 주식은 팔지 않고, 새로 넣는 돈만으로 목표 비중에 가장 가까워지는 매수 수량을 계산합니다.' }) +
      panel('매수 계획', (cashOk(r) ? '' : '<p class="lead pad">새로 넣는 돈을 적으면 살 수량이 나옵니다.</p>') + after + sumNote + '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">지금 비중</th><th class="num">목표 비중' + (B.src === 'saved' ? '(%)' : '') + '</th><th class="num">살 수량</th><th class="num">금액</th><th class="num">산 뒤 비중</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
        (r.plan ? '<div class="card-btns"><button type="button" class="btn" data-act="buyToSim">조정 시뮬레이션에서 열기</button></div>' : '') + '<p class="cap">목표보다 비중이 낮은 종목부터 채웁니다. 수수료와 환전 비용은 넣지 않았고, 주가는 화면에 보이는 값 기준입니다.</p>');
  };
  function cashOk(r) { return r.cash > 0; }

  /* ═════ 9. 분산·민감도 점검 ═════ */
  V.check = function () {
    var c = current(); if (!c.R.length) return x.needHoldings();
    var P = c.P, con = E.concentration(P), b = x.basis(), d = x.dep(), sec = {};
    P.items.forEach(function (it) { var k = it.m.s.sector || '기타'; sec[k] = (sec[k] || 0) + it.w; });
    var secRows = Object.keys(sec).sort(function (a, q) { return sec[q] - sec[a]; }).map(function (k) { return { label: k, value: sec[k], text: pct(sec[k]), color: CH.C.navy }; });
    var GL = 0.10, quad = { hh: 0, hl: 0, lh: 0, ll: 0, na: 0 }, pts = [];
    P.items.forEach(function (it) {
      var m = it.m, g = E.gOf(m, b);
      if (g == null) { quad.na += it.w; return; }
      quad[(m.y >= d ? 'h' : 'l') + (g >= GL ? 'h' : 'l')] += it.w;
      pts.push({ x: Math.min(g, 0.6), y: m.y, label: m.s.t, color: CH.C.blue, r: 4 + 16 * Math.sqrt(it.w) });
    });
    var scatter = pts.length ? CH.line({ w: 760, h: 340, series: [], points: pts, hlines: [{ y: d, label: '정기예금 ' + pct(d) }], marks: [{ x: GL, label: '성장률 10%' }], zero: false, yFmt: function (v) { return pct(v, 1); }, xFmt: function (v) { return pct(v, 0); }, xTitle: '성장률(' + x.basisName() + ' 값)', label: '종목별 회수율과 성장률' }) : '';
    var qt = '<div class="kpirow slim">' + kpi('이자도 높고 성장도 빠름', pct(quad.hh), '회수율이 정기예금 이상, 성장률 10% 이상') + kpi('지금 이자가 높음', pct(quad.hl), '회수율이 정기예금 이상, 성장률 10% 미만') + kpi('성장이 빠름', pct(quad.lh), '회수율이 정기예금 미만, 성장률 10% 이상') + kpi('둘 다 낮음', pct(quad.ll), quad.na > 0.0005 ? '성장률 없는 종목 ' + pct(quad.na) + ' 따로' : '') + '</div>';
    var sh = UI.shock / 100, P2 = E.portfolio(c.R.map(function (r) { return { m: x.M(r.t, r.m.price * (1 + sh)), qty: r.qty }; }));
    var shRows = P.items.slice().sort(function (a, q) { return q.w - a.w; }).map(function (it) { var m2 = x.M(it.m.s.t, it.m.price * (1 + sh)); return '<tr><td>' + tname(it.m.s.t) + '</td><td class="num">' + x.usd(it.m.price) + ' → ' + x.usd(m2.price) + '</td><td class="num">' + pct(it.m.dy) + ' → ' + pct(m2.dy) + '</td><td class="num">' + pct(it.m.y) + ' → <b class="yv">' + pct(m2.y) + '</b></td></tr>'; }).join('');
    var sc = '<div class="tw"><table class="tbl cmp"><thead><tr><th>성장률을 이렇게 보면</th>' + [3, 5, 7, 10].map(function (n) { return '<th class="num">' + n + '년 후 회수율</th>'; }).join('') + '<th class="num">원금 회수 기간</th></tr></thead><tbody>' +
      [['lo', '범위의 낮은 쪽'], ['mid', '가운데'], ['hi', '범위의 높은 쪽']].map(function (q) { var pb = E.pfPayback(P, q[0]); return '<tr><th>' + q[1] + (q[0] === b ? ' ' + chip('지금 기준', 'blue') : '') + '</th>' + [3, 5, 7, 10].map(function (n) { return '<td class="num">' + pct(E.pfYAfter(P, n, q[0])) + '</td>'; }).join('') + '<td class="num">' + (P.y > 0 && pb != null ? '약 ' + pb.toFixed(0) + '년' : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return '<div class="kpirow">' + kpi('종목 수', con.n + '개', '고르게 나눈 것으로 치면 약 ' + con.eff.toFixed(1) + '개') + kpi('가장 큰 종목', pct(con.top1)) + kpi('상위 3종목', pct(con.top3)) + kpi('상위 5종목', pct(con.top5)) + '</div>' +
      '<div class="two">' + panel('업종별 비중', CH.bars(secRows), { sub: '업종은 널리 쓰는 분류(GICS 섹터)를 따랐습니다.' }) + panel('어떤 종목들인가', qt, { sub: '회수율은 정기예금 금리, 성장률은 연 10%를 기준선으로 나눈 비중입니다. 좋고 나쁨의 판정이 아니라 성격의 구분입니다.' }) + '</div>' +
      (scatter ? panel('회수율과 성장률로 본 종목', scatter + '<p class="cap">원의 크기는 비중입니다. 성장률이 60%를 넘는 종목은 오른쪽 끝에 붙여 그렸습니다.</p>') : '') +
      panel('주가가 달라지면', '<div class="frow"><span class="flabel">모든 종목의 주가가</span><input type="range" min="-50" max="50" step="5" value="' + UI.shock + '" data-inp="shock" aria-label="주가 변화율"><b class="shock">' + (UI.shock > 0 ? '+' : '') + x.minus(UI.shock) + '%</b></div>' +
        '<div class="kpirow slim">' + kpi('포트폴리오 회수율', pct(P.y) + ' → <span class="yv">' + pct(P2.y) + '</span>', '그 값에 새로 사는 사람 기준') + kpi('배당 몫', pct(P.dy) + ' → ' + pct(P2.dy)) + kpi('자사주 몫', pct(P.sd) + ' → ' + pct(P2.sd), '주식수 감소율은 주가와 함께 바뀌지 않습니다') + '</div>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th class="num">주가</th><th class="num">배당수익률</th><th class="num">회수율</th></tr></thead><tbody>' + shRows + '</tbody></table></div><p class="cap">주가가 내리면 같은 배당이 더 높은 수익률이 됩니다. 이미 산 주식의 “내 매수가 기준 회수율”은 주가가 움직여도 그대로입니다.</p>') +
      panel('성장률이 달라지면', sc + x.fixedNote(P));
  };

  /* ═════ 10. 기록·설정 ═════ */
  V.log = function () {
    var p = x.pf(), st = S.settings, snaps = S.snaps[p.id] || [];
    var pfs = S.portfolios.map(function (q) {
      var R = x.rowsOf(q.holdings), P = E.portfolio(R), on = q.id === S.active;
      return '<tr' + (on ? ' class="sel"' : '') + '><td>' + (UI.renaming === q.id ? '<input type="text" class="rename" value="' + esc(q.name) + '" data-chg="rename" data-id="' + q.id + '" maxlength="40" aria-label="포트폴리오 이름">' : '<b>' + esc(q.name) + '</b>' + (on ? chip('보는 중', 'blue') : '')) + '</td><td class="num">' + R.length + '종목</td><td class="num">' + money(P.V) + '</td><td class="num">' + (P.V > 0 ? pct(P.y) : '—') +
        '</td><td class="acts">' + (on ? '' : '<button type="button" class="x" data-act="pfOpen" data-id="' + q.id + '">열기</button>') + '<button type="button" class="x" data-act="pfRename" data-id="' + q.id + '">이름</button><button type="button" class="x" data-act="pfCopy" data-id="' + q.id + '">복사</button>' + (S.portfolios.length > 1 ? '<button type="button" class="x" data-act="pfDel" data-id="' + q.id + '">지우기</button>' : '') + '</td></tr>';
    }).join('');
    var snapChart = snaps.length > 1 ? CH.line({ w: 760, h: 260, series: [{ name: '회수율', color: CH.C.blue, pts: snaps.map(function (s, i) { return [i, s.y]; }), endLabel: '회수율' }], hlines: [{ y: x.dep(), label: '정기예금' }], yFmt: function (v) { return pct(v, 1); }, xTicks: [0, snaps.length - 1], xFmt: function (i) { return snaps[i] ? snaps[i].d.slice(2) : ''; }, label: '날짜별 회수율' }) : '';
    var snapRows = snaps.slice().reverse().slice(0, 12).map(function (s) { return '<tr><td>' + esc(s.d) + '</td><td class="num">' + money(s.v) + '</td><td class="num">' + pct(s.y) + '</td><td class="num">' + (s.gl != null ? rng(s.gl, s.gh) : '—') + '</td><td class="acts"><button type="button" class="x" data-act="snapDel" data-d="' + esc(s.d) + '">지우기</button></td></tr>'; }).join('');
    var dataRows = DATA.stocks.map(function (s) { return '<tr><td>' + tname(s.t) + '</td><td>' + esc(s.baseDate) + '</td><td>' + esc(s.basis || '') + '</td><td>' + (s.post ? '<a target="_blank" rel="noopener" href="' + esc(CFG.blogBase + s.post) + '">글 보기</a>' : '') + '</td></tr>'; }).join('');
    var keyState = (st.key || CFG.finnhubKey) ? (st.key ? '내 키로 시세를 받습니다.' : '사이트에 들어 있는 키로 시세를 받습니다.') : '키가 없어 카드 기준일 종가로 계산합니다.';
    return panel('포트폴리오', '<div class="tw"><table class="tbl"><thead><tr><th>이름</th><th class="num">종목</th><th class="num">평가액</th><th class="num">회수율</th><th></th></tr></thead><tbody>' + pfs + '</tbody></table></div><div class="card-btns"><button type="button" class="btn sm" data-act="pfNew">새 포트폴리오</button></div>', { sub: '실제 계좌와 가상의 구성을 따로 만들어 두고 오갈 수 있습니다.' }) +
      panel('날짜별 기록: ' + p.name, (snaps.length ? snapChart + '<div class="tw"><table class="tbl"><thead><tr><th>날짜</th><th class="num">평가액</th><th class="num">회수율</th><th class="num">성장률</th><th></th></tr></thead><tbody>' + snapRows + '</tbody></table></div>' : '<p class="lead pad">포트폴리오 화면을 연 날마다 그날의 값이 한 줄씩 쌓입니다.</p>'), { sub: '기록이 쌓이면 회수율이 실제로 커지고 있는지 볼 수 있습니다. 하루에 한 줄, 그날 마지막으로 본 값입니다.' }) +
      panel('공유와 백업', '<div class="card-btns"><button type="button" class="btn sm" data-act="share">공유 링크 만들기</button><button type="button" class="btn sm ghost" data-act="image">요약 그림 저장</button><button type="button" class="btn sm ghost" data-act="export">파일로 내보내기</button><label class="btn sm ghost filebtn">파일에서 가져오기<input type="file" accept="application/json,.json" data-chg="import"></label></div>' +
        (UI.shareUrl ? '<label class="sharebox">아래 주소를 보내면 받는 사람이 같은 종목과 수량을 열어 볼 수 있습니다.<input type="text" readonly value="' + esc(UI.shareUrl) + '" onfocus="this.select()"></label>' : '') +
        '<p class="cap">저장한 내용은 이 브라우저 안에만 있습니다. 브라우저 기록을 지우거나 다른 기기에서 열면 보이지 않으니, 가끔 파일로 내보내 두세요. 공유 링크에는 종목과 수량만 담기고 평균 매수가와 기록은 담기지 않습니다.</p>') +
      panel('설정', '<div class="fgrid"><label>금액 표시<select data-chg="set" data-k="cur"><option value="USD"' + (st.cur === 'USD' ? ' selected' : '') + '>달러</option><option value="KRW"' + (st.cur === 'KRW' ? ' selected' : '') + '>원화로 환산</option></select></label>' +
        '<label>환율(원/달러)<input type="number" min="1" step="any" data-chg="set" data-k="fx" value="' + (+(+st.fx).toFixed(2)) + '"></label><label>환율 받기<select data-chg="set" data-k="fxAuto"><option value="1"' + (st.fxAuto ? ' selected' : '') + '>자동(하루 한 번쯤 바뀌는 공개 환율)</option><option value="0"' + (st.fxAuto ? '' : ' selected') + '>직접 입력한 값</option></select></label>' +
        '<label>비교 금리(%)<input type="number" min="0" step="any" data-chg="set" data-k="deposit" value="' + (st.deposit != null ? esc(st.deposit) : '') + '" placeholder="' + DATA.deposit.rate + ' (' + esc(DATA.deposit.label) + ')"></label>' +
        '<label>배당 원천징수(%)<input type="number" min="0" max="100" step="any" data-chg="set" data-k="tax" value="' + esc(st.tax) + '"></label>' +
        '<label>성장률 기준<select data-chg="set" data-k="basis">' + [['lo', '범위의 낮은 쪽'], ['mid', '가운데'], ['hi', '범위의 높은 쪽']].map(function (q) { return '<option value="' + q[0] + '"' + (st.basis === q[0] ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select></label>' +
        '<label>내 Finnhub 키(선택)<input type="text" data-chg="set" data-k="key" value="' + esc(st.key) + '" placeholder="비워 두면 사이트 기본값" autocomplete="off"></label></div>' +
        '<p class="cap">' + keyState + ' 환산한 원화 금액은 보기 편하라고 바꾼 값이고, 회수율 계산은 모두 달러 기준입니다. 성장률 기준은 그래프의 선, 히트맵, 목표 맞추기처럼 숫자 하나가 필요한 곳에 쓰이고, 표에는 늘 범위가 함께 나옵니다. 비교 금리를 비워 두면 한국은행 발표값(' + DATA.deposit.rate + '%, ' + esc(DATA.deposit.label) + ')을 씁니다.</p>') +
      panel('숫자의 출처와 계산 방법', '<ul class="plain"><li>종목 한 개의 회수율·성장률·회수 체력은 블로그의 <a target="_blank" rel="noopener" href="' + esc(CFG.blogBase + CFG.methodPost) + '">회수율 계산 기준</a>을 그대로 따릅니다. 처음이라면 <a target="_blank" rel="noopener" href="' + esc(CFG.blogBase + CFG.basicsPost) + '">회수율 기초글</a>부터 읽어 보세요.</li>' +
        '<li>포트폴리오 회수율은 종목 회수율을 비중대로 더한 값입니다. 성장률은 성장률이 있는 종목끼리의 비중 가중 평균입니다.</li><li>몇 년 뒤의 회수율은 종목마다 따로 키운 뒤 비중대로 더합니다. 회수율이 0 이하이거나 성장률을 정할 수 없는 종목은 지금 값 그대로 둡니다.</li>' +
        '<li>주가가 바뀌면 배당수익률만 다시 계산합니다. 주당배당, 주식수 감소율, 성장률은 카드 기준일의 값이고 분기 보고서가 나오면 바뀝니다.</li><li>시세는 Finnhub, 환율은 공개 환율 자료에서 받으며 조금 늦을 수 있습니다.</li></ul>' +
        '<div class="tw"><table class="tbl"><thead><tr><th>종목</th><th>숫자 기준일</th><th>기준 보고서</th><th>블로그 글</th></tr></thead><tbody>' + dataRows + '</tbody></table></div><p class="cap">자료를 만든 날: ' + esc(DATA.generated) + '</p>');
  };

  /* ───── 요약 그림(PNG) ───── */
  function summarySvg() {
    var c = current(), P = c.P, top = P.items.slice().sort(function (a, b) { return b.w - a.w; }).slice(0, 6), mx = top.length ? top[0].w : 1, W = 1200, H = 630;
    var t = function (xx, yy, s, size, w, fill, anchor) { return '<text x="' + xx + '" y="' + yy + '" font-size="' + size + '" font-weight="' + (w || 400) + '" fill="' + (fill || '#1f2933') + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'; };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Pretendard, \'Apple SD Gothic Neo\', \'Malgun Gothic\', sans-serif"><rect width="' + W + '" height="' + H + '" fill="#ffffff"/><rect width="' + W + '" height="96" fill="#1d4f91"/>' +
      t(48, 60, c.p.name, 34, 800, '#ffffff') + t(W - 48, 60, x.today() + ' 기준', 24, 400, '#d6e4f7', 'end') +
      t(48, 170, '회수율', 26, 600, '#5f6b7a') + t(48, 250, pct(P.y), 84, 800, '#2a78d6') + t(48, 296, (P.sd >= 0 ? '배당 ' + pct(P.dy) + ' + 자사주 ' + pct(P.sd) : '배당 ' + pct(P.dy) + ' − 주식 수 증가 ' + pct(-P.sd)), 24, 400, '#5f6b7a') +
      t(48, 372, '성장률', 26, 600, '#5f6b7a') + t(48, 442, P.gLo != null ? rng(P.gLo, P.gHi) : '—', 64, 800, '#1d4f91') +
      t(48, 520, '10년 후 회수율 ' + x.pfYN(P, 10) + ' (추정)', 26, 600) + t(48, 560, '정기예금 ' + pct(x.dep()) + ' · ' + x.verdict(P.y), 24, 400, '#5f6b7a') + t(600, 170, '비중', 26, 600, '#5f6b7a');
    top.forEach(function (it, i) { var yy = 200 + i * 58; s += t(600, yy + 26, it.m.s.name, 24, 600) + '<rect x="820" y="' + (yy + 6) + '" width="' + (250 * it.w / mx).toFixed(1) + '" height="26" rx="6" fill="#1d4f91"/>' + t(1152, yy + 26, pct(it.w), 24, 700, '#1f2933', 'end'); });
    return s + t(W - 48, H - 28, '회수율 포트폴리오 계산기 · 투자 권유가 아닙니다', 20, 400, '#5f6b7a', 'end') + '</svg>';
  }
  function saveImage() {
    var svg = summarySvg(), img = new Image();
    img.onload = function () { var cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630; cv.getContext('2d').drawImage(img, 0, 0); cv.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '회수율-포트폴리오-' + x.today() + '.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png'); };
    img.onerror = function () { toast('그림을 만들지 못했습니다.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ───── 틀 그리기 ───── */
  var NAV = [['보기', [['port', '포트폴리오'], ['stocks', '종목'], ['compare', '비교'], ['money', '돈으로 보기'], ['future', '3·5·7년 뒤']]], ['조정', [['sim', '조정 시뮬레이션'], ['goal', '목표 맞추기'], ['buy', '추가 매수 계획']]], ['관리', [['check', '분산·민감도 점검'], ['log', '기록·설정']]]];
  var TITLE = {}; NAV.forEach(function (g) { g[1].forEach(function (v) { TITLE[v[0]] = v[1]; }); });
  function statusHtml() {
    var q = UI.q, key = S.settings.key || CFG.finnhubKey;
    var txt = q.state === 'loading' ? '시세 받는 중' : q.state === 'live' ? '시세 ' + x.dateTxt(q.ts) + ' 반영' : q.state === 'error' ? esc(q.msg) : key ? '시세 연결 대기' : '카드 기준일 종가로 계산 중';
    return '<span class="status ' + q.state + '">' + txt + '</span>' + (key ? '<button type="button" class="btn sm ghost" data-act="refresh"' + (q.state === 'loading' ? ' disabled' : '') + '>새로 받기</button>' : '');
  }
  var busy = false, again = false;
  function render(keep) {
    if (busy) { again = true; return; }   // 그리는 도중 값이 바뀌면(포커스가 빠지며 생기는 change) 끝난 뒤 한 번 더 그린다
    busy = true;
    try { draw(keep); } finally { busy = false; }
    if (again) { again = false; render(true); }
  }
  function draw(keep) {
    var foc = keep && document.activeElement && document.activeElement.dataset ? { chg: document.activeElement.dataset.chg || document.activeElement.dataset.inp, t: document.activeElement.dataset.t, k: document.activeElement.dataset.k } : null;
    document.getElementById('nav').innerHTML = NAV.map(function (g) { return '<div class="navg"><span>' + g[0] + '</span>' + g[1].map(function (v) { return '<button type="button" data-act="go" data-v="' + v[0] + '"' + (UI.view === v[0] ? ' class="on" aria-current="page"' : '') + '>' + v[1] + '</button>'; }).join('') + '</div>'; }).join('');
    document.getElementById('top').innerHTML = '<h1>' + TITLE[UI.view] + '</h1><div class="top-r"><select data-chg="pfSel" aria-label="포트폴리오 고르기">' + S.portfolios.map(function (q) { return '<option value="' + q.id + '"' + (q.id === S.active ? ' selected' : '') + '>' + esc(q.name) + '</option>'; }).join('') + '</select>' +
      seg('cur', [['USD', '달러'], ['KRW', '원']], S.settings.cur) + statusHtml() + '</div>';
    var banner = UI.shared ? '<div class="banner">공유 링크로 받은 포트폴리오 “' + esc(UI.shared.name) + '”(' + UI.shared.holdings.length + '종목)가 있습니다.<button type="button" class="btn sm" data-act="sharedAdd">내 목록에 넣기</button><button type="button" class="btn sm ghost" data-act="sharedDrop">닫기</button></div>' : '';
    if (!ST.saveOk()) banner += '<div class="banner warn">이 브라우저에서는 저장이 막혀 있어, 창을 닫으면 넣은 내용이 사라집니다. 기록·설정에서 파일로 내보내 두세요.</div>';
    var html; try { html = V[UI.view](); } catch (e) { html = '<div class="banner warn">화면을 그리다 문제가 생겼습니다: ' + esc(e && e.message) + '</div>'; if (window.console) console.error(e); }
    document.getElementById('main').innerHTML = banner + html;
    document.title = TITLE[UI.view] + ' | 회수율 포트폴리오 계산기';
    if (foc && foc.chg) { var sel = '[data-chg="' + foc.chg + '"],[data-inp="' + foc.chg + '"]', els = document.querySelectorAll(sel); for (var i = 0; i < els.length; i++) if ((els[i].dataset.t || '') === (foc.t || '') && (els[i].dataset.k || '') === (foc.k || '')) { els[i].focus(); break; } }
  }
  var toastT;
  function toast(msg) { var el = document.getElementById('toast'); el.textContent = msg; el.className = 'show'; clearTimeout(toastT); toastT = setTimeout(function () { el.className = ''; }, 2600); }
  function go(v) { UI.view = v; render(); window.scrollTo(0, 0); try { history.replaceState(null, '', '#' + v); } catch (e) { } }

  /* ───── 시세·환율 ───── */
  function tickersInUse() { var seen = {}; S.portfolios.forEach(function (p) { p.holdings.forEach(function (h) { if (x.db(h.t)) seen[h.t] = 1; }); }); S.watch.forEach(function (t) { if (x.db(t)) seen[t] = 1; }); (UI.cmp || []).forEach(function (t) { seen[t] = 1; }); if (UI.detail) seen[UI.detail] = 1; if (UI.view === 'stocks' && UI.filter === 'all') x.allTickers().forEach(function (t) { seen[t] = 1; }); return Object.keys(seen); }
  var lastRefresh = 0;
  function refresh(manual) {
    var key = S.settings.key || CFG.finnhubKey, ts = tickersInUse();
    if (!key || !ts.length || UI.q.state === 'loading') return;
    if (manual && Date.now() - lastRefresh < 15000) { toast('방금 받았습니다. 잠시 뒤에 다시 눌러 주세요.'); return; }
    lastRefresh = Date.now(); UI.q.state = 'loading'; render(true);
    ST.fetchQuotes(ts, key, function (t, q) { S.prices[t] = q; }).then(function (r) {
      if (r.ok > 0) { UI.q = { state: 'live', ts: Date.now(), msg: '' }; x.save(); }
      else UI.q = { state: 'error', ts: 0, msg: r.limited ? '시세 요청이 몰려 잠시 쉬는 중' : '시세를 받지 못함(기준일 종가로 계산)' };
      render(true);
    });
  }
  function refreshFx() {
    if (!S.settings.fxAuto || Date.now() - (S.settings.fxTs || 0) < 6 * 3600e3) return;
    ST.fetchFx().then(function (v) { S.settings.fx = v; S.settings.fxTs = Date.now(); x.save(); if (S.settings.cur === 'KRW') render(true); }).catch(function () { });
  }

  /* ───── 눌렀을 때 ───── */
  var A = HS.act, C = HS.chg;
  function addHolding(t, qty) { var p = x.pf(), h = p.holdings.filter(function (q) { return q.t === t; })[0]; if (h) h.qty += qty; else p.holdings.push({ t: t, qty: qty }); UI.sim = null; UI.goalRes = null; x.save(); }
  A.go = function (el) { go(el.dataset.v); };
  A.heat = function (el) { UI.heat = el.dataset.v; render(); };
  A.filter = function (el) { UI.filter = el.dataset.v; render(); refresh(); };
  A.cur = function (el) { S.settings.cur = el.dataset.v; x.save(); refreshFx(); render(); };
  A.moneyN = function (el) { UI.moneyN = +el.dataset.v; render(); };
  A.horizon = function (el) { UI.horizon = +el.dataset.v; render(); };
  A.detail = function (el) { UI.detail = el.dataset.t; UI.form = null; UI.view = 'stocks'; render(); var d = document.getElementById('detail'); if (d) d.scrollIntoView({ block: 'start' }); if (!S.prices[UI.detail]) refresh(); };
  A.closeDetail = function () { UI.detail = null; render(); };
  A.watch = function (el) { var t = el.dataset.t, i = S.watch.indexOf(t); if (i >= 0) S.watch.splice(i, 1); else S.watch.push(t); UI.goalRes = null; x.save(); render(); if (i < 0) refresh(); };
  A.holdFromDetail = function (el) { addHolding(el.dataset.t, 1); toast('1주를 넣었습니다. 포트폴리오 화면에서 수량을 고쳐 주세요.'); render(); refresh(); };
  A.delHolding = function (el) { var p = x.pf(); p.holdings = p.holdings.filter(function (h) { return h.t !== el.dataset.t; }); UI.sim = null; UI.goalRes = null; x.save(); render(); };
  A.sample = function () {
    var p = x.pf(); if (p.holdings.length) return;
    p.name = '예시 포트폴리오(가상)'; p.holdings = [['VOO', 12], ['AAPL', 20], ['MSFT', 10], ['PG', 30], ['JPM', 12], ['NVDA', 25], ['GOOGL', 15], ['MCO', 6]].map(function (r) { return { t: r[0], qty: r[1] }; });
    S.watch = S.watch.length ? S.watch : ['NFLX', 'ETN', 'HWM']; x.save(); render(); refresh();
  };
  A.newCustom = function () { UI.form = { t: '', name: '', price: '', dps: '', sd: '', gLo: '', gHi: '', sector: '기타' }; UI.detail = null; UI.view = 'stocks'; render(); var f = document.getElementById('cform'); if (f) f.scrollIntoView({ block: 'start' }); };
  A.editCustom = function (el) { var s = S.custom[el.dataset.t]; if (!s) return; UI.form = { edit: true, t: s.t, name: s.name, price: s.basePrice, dps: s.dps, sd: +(s.sd * 100).toFixed(4), gLo: s.gA != null ? +(s.gA * 100).toFixed(4) : '', gHi: s.gB != null ? +(s.gB * 100).toFixed(4) : '', sector: s.sector }; render(); };
  A.cancelCustom = function () { UI.form = null; render(); };
  A.saveCustom = function () {
    var f = UI.form; document.querySelectorAll('#cform [data-f]').forEach(function (el) { f[el.dataset.f] = el.value.trim(); });
    var t = String(f.t).toUpperCase().replace(/[^A-Z0-9.\-]/g, ''), num = function (v) { return v === '' || v == null ? null : +v; };
    var price = num(f.price), dps = num(f.dps) || 0, sd = num(f.sd) || 0, lo = num(f.gLo), hi = num(f.gHi);
    f.err = !t ? '티커를 적어 주세요.' : (x.BLOG[t] ? '이 종목은 블로그에서 분석한 종목으로 이미 들어 있습니다.' : (!f.edit && S.custom[t] ? '같은 티커가 이미 있습니다.' : (!(price > 0) ? '주가를 적어 주세요.' : (dps < 0 || [dps, sd, lo, hi].some(function (v) { return v != null && !isFinite(v); }) ? '숫자를 다시 확인해 주세요.' : ''))));
    if (f.err) { render(); return; }
    if (lo == null && hi != null) lo = hi; if (hi == null && lo != null) hi = lo;
    S.custom[t] = { t: t, name: f.name || t, kind: 'custom', sector: f.sector || '기타', post: null, baseDate: x.today(), basePrice: price, dps: dps, sd: sd / 100, gA: lo != null ? lo / 100 : null, gB: hi != null ? hi / 100 : null, shares: null, base: null, basis: '직접 입력 ' + x.today() };
    UI.form = null; UI.detail = t; UI.filter = 'all'; x.save(); render(); refresh();
  };
  A.delCustom = function (el) { var t = el.dataset.t; if (!window.confirm(t + ' 종목을 지울까요? 포트폴리오와 관심 종목에서도 빠집니다.')) return; delete S.custom[t]; S.portfolios.forEach(function (p) { p.holdings = p.holdings.filter(function (h) { return h.t !== t; }); }); S.watch = S.watch.filter(function (w) { return w !== t; }); UI.detail = null; UI.sim = null; x.save(); render(); };
  A.cmp = function (el) { var t = el.dataset.t, i = UI.cmp.indexOf(t); if (i >= 0) UI.cmp.splice(i, 1); else { if (UI.cmp.length >= 4) { toast('네 종목까지 고를 수 있습니다.'); return; } UI.cmp.push(t); } render(); if (i < 0 && !S.prices[t]) refresh(); };
  A.simStep = function (el) { var r = ensureSim().rows.filter(function (q) { return q.t === el.dataset.t; })[0]; if (r) { r.qty = Math.max(0, Math.round((r.qty + (+el.dataset.d)) * 1e4) / 1e4); render(); } };
  A.simReset = function () { UI.sim = null; render(); };
  A.simSaveNew = function () { var sim = ensureSim(), p = x.pf(), id = ST.uid(); S.portfolios.push({ id: id, name: p.name + ' 조정안', holdings: sim.rows.filter(function (r) { return r.qty > 0; }).map(function (r) { return { t: r.t, qty: r.qty }; }), targets: {} }); S.active = id; UI.sim = null; UI.goalRes = null; x.save(); toast('새 포트폴리오로 저장하고 열었습니다.'); go('port'); };
  A.simApply = function () { if (!window.confirm('지금 포트폴리오의 수량을 바꾼 수량으로 덮어쓸까요?')) return; var sim = ensureSim(), p = x.pf(), cost = {}; p.holdings.forEach(function (h) { cost[h.t] = h.cost; }); p.holdings = sim.rows.filter(function (r) { return r.qty > 0; }).map(function (r) { return { t: r.t, qty: r.qty, cost: cost[r.t] }; }); UI.sim = null; UI.goalRes = null; x.save(); toast('포트폴리오에 적용했습니다.'); go('port'); };
  A.goalMode = function (el) { UI.goal.mode = el.dataset.v; UI.goalRes = null; render(); };
  A.goalLock = function (el) { var t = el.dataset.t; UI.goal.lock[t] = !UI.goal.lock[t]; UI.goalRes = null; render(); };
  A.goalRun = function () { runGoal(); render(); var r = document.querySelector('.verdict, .note'); if (r) r.scrollIntoView({ block: 'center' }); };
  A.goalToSim = function () {
    var r = UI.goalRes; if (!r || r.status !== 'ok') return; var total = r.mode === 'buy' ? r.V * (1 + r.add) : r.V;
    UI.sim = { pid: x.pf().id, rows: r.u.map(function (it, i) { return { t: it.t, qty: Math.round(r.w[i] * total / it.m.price * 100) / 100 }; }).filter(function (q) { return q.qty > 0 || x.pf().holdings.some(function (h) { return h.t === q.t; }); }) }; go('sim');
  };
  A.goalToTargets = function () { var r = UI.goalRes; if (!r || r.status !== 'ok') return; var p = x.pf(); p.targets = {}; r.u.forEach(function (it, i) { if (r.w[i] > 1e-6) p.targets[it.t] = +(r.w[i] * 100).toFixed(2); }); UI.buy.src = 'saved'; x.save(); toast('목표 비중으로 저장했습니다.'); go('buy'); };
  A.buySrc = function (el) { UI.buy.src = el.dataset.v; render(); };
  A.buySaveTargets = function () { var c = current(), T = buyTargets(c), p = c.p; p.targets = {}; T.list.forEach(function (t) { p.targets[t] = +T.tg[t].toFixed(2); }); UI.buy.src = 'saved'; x.save(); render(); };
  A.buyToSim = function () { var c = current(), r = buyCompute(c); if (!r.plan) return; UI.sim = { pid: c.p.id, rows: r.T.list.map(function (t, i) { return { t: t, qty: Math.round((((r.T.held[t] || 0) * c.P.V) / x.priceOf(t) + r.plan.rows[i].shares) * 1e4) / 1e4 }; }) }; go('sim'); };
  A.pfNew = function () { var id = ST.uid(); S.portfolios.push({ id: id, name: '포트폴리오 ' + (S.portfolios.length + 1), holdings: [], targets: {} }); S.active = id; UI.renaming = id; UI.sim = null; UI.goalRes = null; x.save(); render(); };
  A.pfOpen = function (el) { S.active = el.dataset.id; UI.sim = null; UI.goalRes = null; x.save(); render(); };
  A.pfRename = function (el) { UI.renaming = el.dataset.id; render(); var i = document.querySelector('.rename'); if (i) { i.focus(); i.select(); } };
  A.pfCopy = function (el) { var q = S.portfolios.filter(function (p) { return p.id === el.dataset.id; })[0]; if (!q) return; var n = JSON.parse(JSON.stringify(q)); n.id = ST.uid(); n.name = q.name + ' 사본'; S.portfolios.push(n); x.save(); render(); };
  A.pfDel = function (el) { var q = S.portfolios.filter(function (p) { return p.id === el.dataset.id; })[0]; if (!q || !window.confirm('“' + q.name + '”을(를) 지울까요? 되돌릴 수 없습니다.')) return; S.portfolios = S.portfolios.filter(function (p) { return p.id !== q.id; }); delete S.snaps[q.id]; if (S.active === q.id) S.active = S.portfolios[0].id; UI.sim = null; UI.goalRes = null; x.save(); render(); };
  A.snapDel = function (el) { var p = x.pf(); S.snaps[p.id] = (S.snaps[p.id] || []).filter(function (s) { return s.d !== el.dataset.d; }); x.save(); render(); };
  A.share = function () { var p = x.pf(); if (!p.holdings.length) { toast('종목을 먼저 넣어 주세요.'); return; } UI.shareUrl = ST.shareLink(S, p); render(); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(UI.shareUrl).then(function () { toast('공유 링크를 복사했습니다.'); }, function () { }); };
  A.image = function () { if (!x.pf().holdings.length) { toast('종목을 먼저 넣어 주세요.'); return; } saveImage(); };
  A['export'] = function () { var o = JSON.parse(JSON.stringify(S)); o.prices = {}; o.settings.key = ''; ST.download('회수율-포트폴리오-백업-' + x.today() + '.json', JSON.stringify({ app: 'hoesuyul-portfolio', v: 1, saved: x.today(), data: o }, null, 1)); };
  A.refresh = function () { refresh(true); };
  A.sharedAdd = function () { var sh = UI.shared; if (!sh) return; Object.keys(sh.custom).forEach(function (t) { var c = sh.custom[t]; if (!x.BLOG[t] && !S.custom[t] && c && c.basePrice > 0) S.custom[t] = { t: t, name: String(c.name || t).slice(0, 40), kind: 'custom', sector: String(c.sector || '기타').slice(0, 20), post: null, baseDate: x.today(), basePrice: +c.basePrice, dps: +c.dps || 0, sd: +c.sd || 0, gA: c.gA != null ? +c.gA : null, gB: c.gB != null ? +c.gB : null, shares: null, base: null, basis: '공유받은 값' }; });
    var id = ST.uid(); S.portfolios.push({ id: id, name: sh.name, holdings: sh.holdings.filter(function (h) { return x.db(h.t); }), targets: {} }); S.active = id; UI.shared = null; UI.sim = null; x.save(); try { history.replaceState(null, '', location.pathname); } catch (e) { } toast('내 목록에 넣었습니다.'); go('port'); refresh(); };
  A.sharedDrop = function () { UI.shared = null; try { history.replaceState(null, '', location.pathname); } catch (e) { } render(); };

  /* ───── 값을 고쳤을 때 ───── */
  C.pfSel = function (el) { S.active = el.value; UI.sim = null; UI.goalRes = null; x.save(); render(); refresh(); };
  C.addHolding = function (el) { var t = el.value; if (!t) return; if (t === '__new') { A.newCustom(); return; } addHolding(t, 1); UI.view = UI.view === 'port' ? 'port' : UI.view; toast(x.db(t).name + ' 1주를 넣었습니다. 수량을 고쳐 주세요.'); render(); refresh(); };
  C.qty = function (el) { var p = x.pf(), h = p.holdings.filter(function (q) { return q.t === el.dataset.t; })[0], v = +el.value; if (!h || !(v >= 0)) return; h.qty = v; UI.sim = null; UI.goalRes = null; x.save(); render(true); };
  C.cost = function (el) { var h = x.pf().holdings.filter(function (q) { return q.t === el.dataset.t; })[0]; if (!h) return; h.cost = +el.value > 0 ? +el.value : undefined; x.save(); render(true); };
  C.manual = function (el) { var v = +el.value; if (v > 0) S.manual[el.dataset.t] = v; else delete S.manual[el.dataset.t]; UI.goalRes = null; x.save(); render(true); };
  C.gov = function (el) { if (el.value === '' || !isFinite(+el.value)) delete S.gov[el.dataset.t]; else S.gov[el.dataset.t] = +el.value; UI.goalRes = null; x.save(); render(true); };
  C.simQty = function (el) { var r = ensureSim().rows.filter(function (q) { return q.t === el.dataset.t; })[0], v = +el.value; if (r && v >= 0) { r.qty = v; render(true); } };
  C.simAdd = function (el) { var t = el.value; if (!t) return; if (t === '__new') { A.newCustom(); return; } ensureSim().rows.push({ t: t, qty: 1 }); render(); if (!S.prices[t]) refresh(); };
  C.goalF = function (el) { var k = el.dataset.k; UI.goal[k] = k === 'at' ? +el.value : el.value; UI.goalRes = null; render(true); };
  C.goalUni = function (el) { UI.goal.uni[el.dataset.t] = el.checked; UI.goalRes = null; render(true); };
  C.buyCash = function (el) { UI.buy.cash = el.value; render(true); };
  C.buyFrac = function (el) { UI.buy.frac = el.checked; render(true); };
  C.target = function (el) { var p = x.pf(); p.targets[el.dataset.t] = Math.max(0, +el.value || 0); x.save(); render(true); };
  C.rename = function (el) { var q = S.portfolios.filter(function (p) { return p.id === el.dataset.id; })[0]; if (q && el.value.trim()) q.name = el.value.trim().slice(0, 40); UI.renaming = null; x.save(); render(); };
  C.set = function (el) {
    var k = el.dataset.k, st = S.settings, v = el.value;
    if (k === 'fxAuto') { st.fxAuto = v === '1'; st.fxTs = 0; refreshFx(); }
    else if (k === 'fx') { if (+v > 0) { st.fx = +v; st.fxAuto = false; } }
    else if (k === 'deposit') st.deposit = v === '' || !(+v >= 0) ? null : +v;
    else if (k === 'tax') st.tax = Math.min(100, Math.max(0, +v || 0));
    else if (k === 'key') { st.key = v.trim(); lastRefresh = 0; }
    else st[k] = v;
    UI.goalRes = null; x.save(); render(true); if (k === 'key') refresh(); if (k === 'cur') refreshFx();
  };
  C['import'] = function (el) {
    var f = el.files && el.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () {
      try {
        var o = JSON.parse(rd.result), d = o && o.app === 'hoesuyul-portfolio' ? o.data : null;
        if (!d || !Array.isArray(d.portfolios) || !d.portfolios.length) throw new Error('형식');
        if (!window.confirm('지금 저장된 내용을 이 파일의 내용(' + d.portfolios.length + '개 포트폴리오)으로 바꿀까요?')) return;
        var key = S.settings.key; localStorage.setItem('hoesuyul-portfolio.v1', JSON.stringify(d)); var n = ST.load(); n.settings.key = key;
        Object.keys(S).forEach(function (k) { delete S[k]; }); Object.keys(n).forEach(function (k) { S[k] = n[k]; });
        UI.sim = null; UI.goalRes = null; UI.detail = null; x.save(); toast('가져왔습니다.'); go('port'); refresh();
      } catch (e) { toast('이 계산기에서 내보낸 파일이 아닙니다.'); }
    };
    rd.readAsText(f);
  };

  document.addEventListener('click', function (ev) { var el = ev.target.closest('[data-act]'); if (el && A[el.dataset.act] && !el.disabled) A[el.dataset.act](el); });
  document.addEventListener('change', function (ev) { var el = ev.target.closest('[data-chg]'); if (el && C[el.dataset.chg]) C[el.dataset.chg](el); });
  document.addEventListener('input', function (ev) { var el = ev.target.closest('[data-inp]'); if (el && el.dataset.inp === 'shock') { UI.shock = +el.value; render(true); } });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('input[data-chg]')) ev.target.blur(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastRefresh > (CFG.refreshMinutes || 5) * 60000) refresh(); });

  /* ───── 시작 ───── */
  var h = location.hash.replace('#', '');
  if (TITLE[h]) UI.view = h;
  UI.shared = ST.readShare();
  if (Object.keys(S.prices).some(function (t) { return S.prices[t] && S.prices[t].ts; })) { var newest = 0; Object.keys(S.prices).forEach(function (t) { newest = Math.max(newest, S.prices[t].ts || 0); }); if (Date.now() - newest > 7 * 86400e3) S.prices = {}; else UI.q = { state: 'live', ts: newest, msg: '' }; }
  render();
  refresh(); refreshFx();
  setInterval(function () { if (!document.hidden) refresh(); }, Math.max(1, CFG.refreshMinutes || 5) * 60000);
  HS.render = render; HS.refresh = refresh;
})();
