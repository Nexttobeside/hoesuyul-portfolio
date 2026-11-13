/* 회수율 포트폴리오 계산기의 계산 엔진. 화면과 따로 떨어진 순수 함수만 둔다.
   한 종목의 계산은 블로그 '회수율 계산 기준'(정의서 1부)과 같다. 비율은 모두 소수(2% = 0.02).
     회수율 y = 배당수익률(주당배당 ÷ 주가) + 주식수 감소율
     N년 후 회수율 = y × (1 + g)^N,  원금 회수 기간 = ln(1 + g/y) ÷ ln(1 + g)
   포트폴리오 계산(이 도구에서 더한 규칙):
     포트폴리오 회수율 = Σ 비중 × 회수율  (= 한 해에 돌려받는 몫의 합 ÷ 평가액)
     포트폴리오 성장률 = 성장률이 있는 종목끼리의 비중 가중 평균(낮은 쪽·높은 쪽 따로)
     N년 후 회수율 = Σ 비중 × 종목의 N년 후 회수율(종목마다 따로 키운 뒤 더한다)
     회수율이 0 이하이거나 성장률을 정할 수 없는 종목은 '지금 회수율 그대로' 둔다 */
(function (root) {
  'use strict';
  var LP = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./lp.js') : root.HS_LP;
  var HIGH_GROWTH = 0.25;

  /* 종목 한 개. s: 데이터(주당배당 dps, 주식수 감소율 sd, 성장률 gA·gB …), price: 주가, gOv: 내 가정 성장률(소수) */
  function stock(s, price, gOv) {
    var p = price > 0 ? price : s.basePrice;
    var dy = s.dps > 0 && p > 0 ? s.dps / p : 0;
    var y = dy + (s.sd || 0);
    var gs = [];
    if (gOv != null && isFinite(gOv)) gs = [gOv];
    else { if (s.gA != null) gs.push(s.gA); if (s.gB != null) gs.push(s.gB); }
    var has = gs.length > 0;
    var gLo = has ? Math.min.apply(null, gs) : null, gHi = has ? Math.max.apply(null, gs) : null;
    var mcap = s.shares ? p * s.shares / 1e6 : null;
    var stamina = null, why = null;
    if (s.base == null || !mcap) why = '자료 없음';
    else if (y <= 0) why = '지금 회수율이 0 이하';
    else if (s.base <= 0) why = s.financial ? '최근 12개월 순이익이 적자' : '최근 12개월 FCF가 마이너스';
    else stamina = (s.base / mcap) / y;
    return {
      s: s, price: p, dy: dy, sd: s.sd || 0, y: y, gLo: gLo, gHi: gHi, hasG: has, gUser: gOv != null && isFinite(gOv),
      grows: y > 0 && has, mcap: mcap, stamina: stamina, staminaWhy: why,
      highG: has && gHi > HIGH_GROWTH
    };
  }

  function gOf(m, basis) {   // basis: 'lo' | 'mid' | 'hi'
    if (!m.hasG) return null;
    return basis === 'hi' ? m.gHi : basis === 'mid' ? (m.gLo + m.gHi) / 2 : m.gLo;
  }
  /* N년 후 회수율. 키울 수 없는 종목(회수율 0 이하, 성장률 없음)은 지금 값 그대로 */
  function yAfter(y, g, n) { return (y > 0 && g != null) ? y * Math.pow(1 + g, n) : y; }
  /* t년 동안 돌려받는 몫의 합(원금 대비). 연속 식이라 원금 회수 기간 식과 맞물린다 */
  function cum(y, g, t) {
    if (!(y > 0) || g == null || Math.abs(g) < 1e-12) return y * t;
    return y * (Math.pow(1 + g, t) - 1) / g;
  }
  /* 원금 회수 기간(년). null = 회수 못 함 또는 산출 불가 */
  function payback(y, g) {
    if (!(y > 0) || g == null) return null;
    if (Math.abs(g) < 1e-12) return 1 / y;
    if (1 + g / y <= 0) return null;
    return Math.log(1 + g / y) / Math.log(1 + g);
  }

  /* 포트폴리오. rows: [{m: stock() 결과, qty}] 또는 [{m, value}] (value가 있으면 그 금액을 쓴다) */
  function portfolio(rows) {
    var V = 0, items = rows.map(function (r) {
      var v = r.value != null ? r.value : r.qty * r.m.price;
      V += v; return { m: r.m, qty: r.qty, value: v, cost: r.cost };
    });
    var P = { V: V, items: items, y: 0, dy: 0, sd: 0, gLo: null, gHi: null, gCover: 0, fixedW: 0, div: 0 };
    if (!(V > 0)) return P;
    var gw = 0, glo = 0, ghi = 0;
    items.forEach(function (it) {
      it.w = it.value / V;
      P.y += it.w * it.m.y; P.dy += it.w * it.m.dy; P.sd += it.w * it.m.sd;
      if (it.m.hasG) { gw += it.w; glo += it.w * it.m.gLo; ghi += it.w * it.m.gHi; }
      if (!it.m.grows) P.fixedW += it.w;
      P.div += (it.qty != null ? it.qty : it.value / it.m.price) * (it.m.s.dps || 0);
    });
    if (gw > 0) { P.gLo = glo / gw; P.gHi = ghi / gw; }
    P.gCover = gw;
    return P;
  }
  function pfYAfter(P, n, basis) {
    var t = 0; P.items.forEach(function (it) { t += it.w * yAfter(it.m.y, gOf(it.m, basis), n); }); return t;
  }
  function pfCum(P, t, basis) {
    var c = 0; P.items.forEach(function (it) { c += it.w * cum(it.m.y, gOf(it.m, basis), t); }); return c;
  }
  /* 포트폴리오 원금 회수 기간: 돌려받는 몫의 합이 1이 되는 해(이분법). 300년 안에 닿지 않으면 null */
  function pfPayback(P, basis) {
    if (!(P.V > 0)) return null;
    var hi = 300; if (pfCum(P, hi, basis) < 1) return null;
    var lo = 0;
    for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (pfCum(P, mid, basis) >= 1) hi = mid; else lo = mid; }
    return hi;
  }
  /* 집중도: 상위 n 종목 비중, 실효 종목 수(1 ÷ Σ비중²) */
  function concentration(P) {
    var ws = P.items.map(function (it) { return it.w || 0; }).sort(function (a, b) { return b - a; });
    var hhi = 0; ws.forEach(function (w) { hhi += w * w; });
    var top = function (n) { return ws.slice(0, n).reduce(function (a, b) { return a + b; }, 0); };
    return { top1: top(1), top3: top(3), top5: top(5), eff: hhi > 0 ? 1 / hhi : 0, n: ws.length };
  }

  /* ───────── 목표 맞추기 ─────────
     u: [{t, w0, a(목표 시점 회수율), g(성장률 기준값 또는 null), lock}]  w0 합 = 1
     opt: {targetY, targetG, cap(종목당 최대 비중), mode:'trade'|'buy'} */
  function capOf(it, cap) { return it.lock ? it.w0 : cap; }
  function baseRows(u, opt, withTargets) {
    var n = u.length, rows = [];
    rows.push({ a: u.map(function () { return 1; }), op: '=', b: 1 });
    u.forEach(function (it, i) {
      var a = new Array(n).fill(0); a[i] = 1;
      rows.push({ a: a, op: '<=', b: capOf(it, opt.cap) });
      if (it.lock) rows.push({ a: a, op: '>=', b: it.w0 });
    });
    if (withTargets !== false) {
      if (opt.targetY != null) rows.push({ a: u.map(function (it) { return it.a; }), op: '>=', b: opt.targetY });
      if (opt.targetG != null) rows.push({ a: u.map(function (it) { return it.g == null ? 0 : it.g - opt.targetG; }), op: '>=', b: 0 });
    }
    return rows;
  }
  function pad(rows, extra) { return rows.map(function (r) { return { a: r.a.concat(new Array(extra).fill(0)), op: r.op, b: r.b }; }); }

  function achieved(u, w) {
    var y = 0, gw = 0, g = 0;
    u.forEach(function (it, i) { y += w[i] * it.a; if (it.g != null) { gw += w[i]; g += w[i] * it.g; } });
    return { y: y, g: gw > 1e-9 ? g / gw : null };
  }

  function optimize(u, opt) {
    var n = u.length, i;
    if (!n) return { status: 'empty' };
    var res;
    if (opt.mode === 'buy') {
      // 팔지 않고 추가 매수만: β_i = 추가 매수액 ÷ 지금 평가액, Σβ를 가장 작게
      var rows = [], sumA = 0, sumG = 0;
      u.forEach(function (it) { sumA += it.w0 * it.a; if (it.g != null && opt.targetG != null) sumG += it.w0 * (it.g - opt.targetG); });
      if (opt.targetY != null) rows.push({ a: u.map(function (it) { return it.a - opt.targetY; }), op: '>=', b: opt.targetY - sumA });
      if (opt.targetG != null) rows.push({ a: u.map(function (it) { return it.g == null ? 0 : it.g - opt.targetG; }), op: '>=', b: -sumG });
      u.forEach(function (it, k) {
        var c = capOf(it, opt.cap);
        var a = new Array(n).fill(-c); a[k] += 1;
        if (it.lock) { var z = new Array(n).fill(0); z[k] = 1; rows.push({ a: z, op: '<=', b: 0 }); }
        else rows.push({ a: a, op: '<=', b: c - it.w0 });
      });
      res = LP.solveLP(new Array(n).fill(1), rows);
      if (res.status === 'optimal') {
        var add = res.x.reduce(function (s, v) { return s + v; }, 0);
        var w = u.map(function (it, k) { return (it.w0 + res.x[k]) / (1 + add); });
        return { status: 'ok', mode: 'buy', w: w, beta: res.x, add: add, got: achieved(u, w) };
      }
      return { status: 'infeasible', mode: 'buy', limits: limits(u, opt) };
    }
    // 사고팔아 맞추기: 변수 [w(n), 늘린 몫 p(n), 줄인 몫 q(n)],  w − p + q = w0,  Σ(p+q) 최소
    var rows2 = pad(baseRows(u, opt), 2 * n);
    for (i = 0; i < n; i++) {
      var a2 = new Array(3 * n).fill(0); a2[i] = 1; a2[n + i] = -1; a2[2 * n + i] = 1;
      rows2.push({ a: a2, op: '=', b: u[i].w0 });
    }
    var c = new Array(3 * n).fill(0); for (i = n; i < 3 * n; i++) c[i] = 1;
    res = LP.solveLP(c, rows2);
    if (res.status === 'optimal') {
      var w2 = res.x.slice(0, n);
      return { status: 'ok', mode: 'trade', w: w2, turnover: res.value / 2, got: achieved(u, w2) };
    }
    return { status: 'infeasible', mode: 'trade', limits: limits(u, opt) };
  }

  /* 이 종목들과 비중 한도로 만들 수 있는 끝값 */
  function limits(u, opt) {
    var n = u.length, o = { cap: opt.cap };
    var neg = function (f) { return u.map(function (it) { return -f(it); }); };
    var r = LP.solveLP(neg(function (it) { return it.a; }), baseRows(u, opt, false));
    o.maxY = r.status === 'optimal' ? -r.value : null;
    if (opt.targetG != null) {
      var rows = baseRows(u, { cap: opt.cap, targetG: opt.targetG, targetY: null });
      var r2 = LP.solveLP(neg(function (it) { return it.a; }), rows);
      o.maxYwithG = r2.status === 'optimal' ? -r2.value : null;
    }
    o.maxG = maxGrowth(u, opt.cap, null);
    if (opt.targetY != null) o.maxGwithY = maxGrowth(u, opt.cap, opt.targetY);
    return o;
  }
  /* 성장률(성장률 있는 종목끼리의 가중 평균)의 최댓값: 비율이라 이분법으로 찾는다 */
  function maxGrowth(u, cap, minY) {
    var gs = u.filter(function (it) { return it.g != null; }).map(function (it) { return it.g; });
    if (!gs.length) return null;
    var lo = Math.min.apply(null, gs), hi = Math.max.apply(null, gs);
    var feas = function (G) {
      var r = LP.solveLP(new Array(u.length).fill(0), baseRows(u, { cap: cap, targetG: G, targetY: minY }));
      return r.status === 'optimal';
    };
    if (!feas(lo)) return null;
    if (feas(hi)) return hi;
    for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (feas(mid)) lo = mid; else hi = mid; }
    return lo;
  }
  /* 만들 수 있는 범위의 위쪽 선: 성장률 G 이상을 지키면서 얻을 수 있는 가장 높은 회수율 */
  function frontier(u, cap, steps) {
    var gMax = maxGrowth(u, cap, null); if (gMax == null) return [];
    var gs = u.filter(function (it) { return it.g != null; }).map(function (it) { return it.g; });
    var gMin = Math.min.apply(null, gs), out = [];
    steps = steps || 24;
    for (var i = 0; i <= steps; i++) {
      var G = gMin + (gMax - gMin) * i / steps;
      var r = LP.solveLP(u.map(function (it) { return -it.a; }), baseRows(u, { cap: cap, targetG: G, targetY: null }));
      if (r.status === 'optimal') out.push([G, -r.value]);
    }
    return out;
  }

  /* ───────── 추가 매수 계획 ─────────
     rows: [{t, value, price, target(목표 비중, 합 1)}], cash: 새로 넣는 돈. 팔지 않고 목표 비중과의 차이를 가장 작게.
     b_i = max(0, d_i − λ),  d_i = target_i × (V + cash) − value_i,  Σ b_i = cash */
  function buyPlan(rows, cash, fractional) {
    var V = rows.reduce(function (s, r) { return s + r.value; }, 0), T = V + cash;
    var d = rows.map(function (r) { return r.target * T - r.value; });
    var f = function (lam) { return d.reduce(function (s, v) { return s + Math.max(0, v - lam); }, 0); };
    var lo = Math.min.apply(null, d.concat([0])) - cash - 1, hi = Math.max.apply(null, d.concat([0]));
    for (var i = 0; i < 100; i++) { var mid = (lo + hi) / 2; if (f(mid) > cash) lo = mid; else hi = mid; }
    var lam = hi, spent = 0;
    var out = rows.map(function (r, k) {
      var b = Math.max(0, d[k] - lam);
      var sh = r.price > 0 ? b / r.price : 0;
      if (!fractional) sh = Math.floor(sh + 1e-9);
      var cost = sh * r.price; spent += cost;
      return { t: r.t, buy: cost, shares: sh, ideal: b };
    });
    // 정수 주식이라 남은 돈으로, 목표에 가장 모자란 종목부터 한 주씩 더 산다
    if (!fractional) {
      var guard = 0;
      while (guard++ < 10000) {
        var best = -1, gap = 0;
        rows.forEach(function (r, k) {
          if (!(r.price > 0) || r.price > cash - spent + 1e-9 || !(r.target > 0)) return;
          var g = r.target - (r.value + out[k].buy) / T;
          if (g > gap) { gap = g; best = k; }
        });
        if (best < 0) break;
        out[best].shares += 1; out[best].buy += rows[best].price; spent += rows[best].price;
      }
    }
    var after = V + spent;
    out.forEach(function (o, k) { o.wAfter = after > 0 ? (rows[k].value + o.buy) / after : 0; o.wBefore = V > 0 ? rows[k].value / V : 0; });
    return { rows: out, spent: spent, left: cash - spent, V: V };
  }

  var api = {
    HIGH_GROWTH: HIGH_GROWTH, stock: stock, gOf: gOf, yAfter: yAfter, cum: cum, payback: payback,
    portfolio: portfolio, pfYAfter: pfYAfter, pfCum: pfCum, pfPayback: pfPayback, concentration: concentration,
    optimize: optimize, limits: limits, frontier: frontier, maxGrowth: maxGrowth, buyPlan: buyPlan
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HS_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
