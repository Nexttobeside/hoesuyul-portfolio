/* 작은 선형계획 풀이(두 단계 심플렉스, Bland 규칙).
   minimize c·x,  x ≥ 0,  rows: [{a:[...], op:'<='|'>='|'=', b:number}]
   돌려주는 값: {status:'optimal'|'infeasible'|'unbounded', x:[...], value} */
(function (root) {
  'use strict';
  var EPS = 1e-9;

  function solveLP(c, rows) {
    var n = c.length, m = rows.length, i, j;
    // b ≥ 0이 되게 부호를 맞춘다
    var R = rows.map(function (r) {
      var a = r.a.slice(), b = r.b, op = r.op;
      if (b < 0) { a = a.map(function (v) { return -v; }); b = -b; op = op === '<=' ? '>=' : (op === '>=' ? '<=' : '='); }
      return { a: a, b: b, op: op };
    });
    var nSlack = 0, nArt = 0;
    R.forEach(function (r) { if (r.op !== '=') nSlack++; if (r.op !== '<=') nArt++; });
    var N = n + nSlack + nArt;
    var T = [], basis = [], artCols = [];
    var s = n, a = n + nSlack;
    for (i = 0; i < m; i++) {
      var row = new Array(N + 1).fill(0);
      for (j = 0; j < n; j++) row[j] = R[i].a[j] || 0;
      row[N] = R[i].b;
      if (R[i].op === '<=') { row[s] = 1; basis.push(s); s++; }
      else if (R[i].op === '>=') { row[s] = -1; s++; row[a] = 1; basis.push(a); artCols.push(a); a++; }
      else { row[a] = 1; basis.push(a); artCols.push(a); a++; }
      T.push(row);
    }

    function pivot(pr, pc) {
      var p = T[pr][pc], k, jj;
      for (jj = 0; jj <= N; jj++) T[pr][jj] /= p;
      for (k = 0; k < m; k++) {
        if (k === pr) continue;
        var f = T[k][pc];
        if (Math.abs(f) < 1e-14) continue;
        for (jj = 0; jj <= N; jj++) T[k][jj] -= f * T[pr][jj];
      }
      basis[pr] = pc;
    }

    function run(cost, allowed) {
      var iter = 0;
      while (iter++ < 20000) {
        // 줄인 비용 d_j = cost_j − Σ cost_basis · 열
        var enter = -1;
        for (var jj = 0; jj < N; jj++) {
          if (!allowed(jj)) continue;
          var d = cost[jj];
          for (var k = 0; k < m; k++) d -= cost[basis[k]] * T[k][jj];
          if (d < -EPS) { enter = jj; break; }   // Bland: 가장 작은 번호
        }
        if (enter < 0) return 'optimal';
        var leave = -1, best = Infinity;
        for (var r = 0; r < m; r++) {
          if (T[r][enter] > EPS) {
            var ratio = T[r][N] / T[r][enter];
            if (ratio < best - 1e-12 || (Math.abs(ratio - best) <= 1e-12 && basis[r] < basis[leave])) { best = ratio; leave = r; }
          }
        }
        if (leave < 0) return 'unbounded';
        pivot(leave, enter);
      }
      return 'optimal';
    }

    // 1단계: 인공 변수 합 최소화
    if (nArt > 0) {
      var c1 = new Array(N).fill(0);
      artCols.forEach(function (k) { c1[k] = 1; });
      run(c1, function () { return true; });
      var sum = 0;
      for (i = 0; i < m; i++) if (basis[i] >= n + nSlack) sum += T[i][N];
      if (sum > 1e-7) return { status: 'infeasible', x: null, value: null };
      // 기저에 남은 인공 변수(값 0)를 가능한 열로 바꾼다
      for (i = 0; i < m; i++) {
        if (basis[i] >= n + nSlack) {
          for (j = 0; j < n + nSlack; j++) if (Math.abs(T[i][j]) > 1e-7) { pivot(i, j); break; }
        }
      }
    }
    // 2단계
    var c2 = new Array(N).fill(0);
    for (j = 0; j < n; j++) c2[j] = c[j];
    var st = run(c2, function (jj) { return jj < n + nSlack; });
    if (st === 'unbounded') return { status: 'unbounded', x: null, value: null };
    var x = new Array(n).fill(0);
    for (i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = Math.max(0, T[i][N]);
    var val = 0;
    for (j = 0; j < n; j++) val += c[j] * x[j];
    return { status: 'optimal', x: x, value: val };
  }

  var api = { solveLP: solveLP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HS_LP = api;
})(typeof window !== 'undefined' ? window : globalThis);
