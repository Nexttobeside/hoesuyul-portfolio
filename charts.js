/* SVG 그림 도우미. 바깥 라이브러리 없이 문자열로 SVG를 만든다. */
(function (root) {
  'use strict';
  var C = { ink: '#1f2933', sub: '#5f6b7a', line: '#dfe5ec', soft: '#f4f7fa', blue: '#2a78d6', blueDeep: '#1d5fae', navy: '#1d4f91', blueSoft: '#edf4fd' };
  var SERIES = ['#2a78d6', '#128a7c', '#9b4fa8', '#d17a22', '#5f6b7a'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return '#' + pa.map(function (v, i) { return ('0' + Math.round(v + (pb[i] - v) * t).toString(16)).slice(-2); }).join('');
  }
  function lum(hex) { var p = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; }); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; }
  function ticks(min, max, n) {
    var span = max - min || 1, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var out = [], v = Math.ceil(min / step - 1e-9) * step;
    for (; v <= max + 1e-9; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : v);
    return out;
  }

  /* 꺾은선: o = {w,h, series:[{name,color,pts:[[x,y]],dash,band:[[x,lo,hi]]}], xFmt,yFmt, xTitle, marks:[{x,label}], hlines:[{y,label,color}], points:[{x,y,label,color,shape}], yMin, yMax} */
  function line(o) {
    var w = o.w || 640, h = o.h || 300, L = o.L || 52, R = 16, T = 14, B = o.xTitle ? 44 : 30;
    var xs = [], ys = [];
    (o.series || []).forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); (s.band || []).forEach(function (p) { ys.push(p[1], p[2]); }); });
    (o.hlines || []).forEach(function (l) { ys.push(l.y); });
    (o.points || []).forEach(function (p) { xs.push(p.x); ys.push(p.y); });
    if (!xs.length) return '';
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (o.yMin != null) y0 = Math.min(y0, o.yMin); if (o.yMax != null) y1 = Math.min(y1, o.yMax);
    if (y0 > 0 && o.zero !== false) y0 = 0;
    if (x1 === x0) x1 = x0 + 1; if (y1 === y0) y1 = y0 + 1;
    var padY = (y1 - y0) * 0.06; y1 += padY; if (y0 < 0) y0 -= padY;
    var X = function (v) { return L + (v - x0) / (x1 - x0) * (w - L - R); }, Y = function (v) { return T + (1 - (Math.min(v, y1) - y0) / (y1 - y0)) * (h - T - B); };
    var yf = o.yFmt || function (v) { return v; }, xf = o.xFmt || function (v) { return v; };
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(o.label || '그래프') + '" class="chart">';
    ticks(y0, y1, 5).forEach(function (t) {
      s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + (t === 0 ? '#b8c2cf' : C.line) + '"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tk">' + esc(yf(t)) + '</text>';
    });
    (o.xTicks || ticks(x0, x1, (x1 - x0) >= 3 ? Math.min(10, Math.round(x1 - x0)) : 6)).forEach(function (t) {
      s += '<text x="' + X(t) + '" y="' + (h - B + 18) + '" text-anchor="middle" class="tk">' + esc(xf(t)) + '</text>';
    });
    if (o.xTitle) s += '<text x="' + (L + (w - L - R) / 2) + '" y="' + (h - 6) + '" text-anchor="middle" class="tk">' + esc(o.xTitle) + '</text>';
    (o.marks || []).forEach(function (m) {
      s += '<line x1="' + X(m.x) + '" x2="' + X(m.x) + '" y1="' + T + '" y2="' + (h - B) + '" stroke="' + C.sub + '" stroke-dasharray="3 4"/>' +
        (X(m.x) > w - 90 ? '<text x="' + (X(m.x) - 5) + '" y="' + (T + 11) + '" text-anchor="end" class="tk">' : '<text x="' + (X(m.x) + 5) + '" y="' + (T + 11) + '" class="tk">') + esc(m.label) + '</text>';
    });
    (o.hlines || []).forEach(function (l) {
      s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + Y(l.y) + '" y2="' + Y(l.y) + '" stroke="' + (l.color || C.sub) + '" stroke-width="1.5" stroke-dasharray="6 5"/>' +
        '<text x="' + (w - R - 4) + '" y="' + (Y(l.y) - 6) + '" text-anchor="end" class="tk" fill="' + (l.color || C.sub) + '">' + esc(l.label) + '</text>';
    });
    (o.series || []).forEach(function (se) {
      if (se.band && se.band.length) {
        var up = se.band.map(function (p) { return X(p[0]) + ',' + Y(p[2]); }), dn = se.band.slice().reverse().map(function (p) { return X(p[0]) + ',' + Y(p[1]); });
        s += '<polygon points="' + up.concat(dn).join(' ') + '" fill="' + se.color + '" opacity="0.16"/>';
      }
      s += '<polyline fill="none" stroke="' + se.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') +
        ' points="' + se.pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '"/>';
      if (se.endLabel) { var last = se.pts[se.pts.length - 1]; s += '<text x="' + (X(last[0]) - 6) + '" y="' + (Y(last[1]) + (se.below ? 18 : -8)) + '" text-anchor="end" class="tk b" fill="' + se.color + '">' + esc(se.endLabel) + '</text>'; }
    });
    (o.points || []).forEach(function (p) {
      var cx = X(p.x), cy = Y(p.y), col = p.color || C.sub;
      if (p.shape === 'cross') s += '<path d="M' + (cx - 6) + ' ' + (cy - 6) + 'L' + (cx + 6) + ' ' + (cy + 6) + 'M' + (cx - 6) + ' ' + (cy + 6) + 'L' + (cx + 6) + ' ' + (cy - 6) + '" stroke="' + col + '" stroke-width="2.5"/>';
      else if (p.shape === 'ring') s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#fff" stroke="' + col + '" stroke-width="3"/>';
      else s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (p.r || 4) + '" fill="' + col + '"' + (p.r ? ' opacity="0.75"' : '') + '/>';
      if (p.label) s += '<text x="' + (cx + (p.r || 4) + 4) + '" y="' + (cy + 4) + '" class="tk' + (p.bold ? ' b' : '') + '" fill="' + (p.bold ? col : C.sub) + '">' + esc(p.label) + '</text>';
    });
    return s + '</svg>';
  }

  /* 트리맵(squarify): items [{label, sub, value, color}] */
  function treemap(items, w, h) {
    items = items.filter(function (i) { return i.value > 0; }).sort(function (a, b) { return b.value - a.value; });
    var total = items.reduce(function (s, i) { return s + i.value; }, 0); if (!total) return '';
    var rects = [], x = 0, y = 0, rw = w, rh = h, scale = w * h / total;
    var nodes = items.map(function (i) { return { it: i, a: i.value * scale }; });
    function worst(row, side) {
      var sum = row.reduce(function (s, n) { return s + n.a; }, 0), mx = Math.max.apply(null, row.map(function (n) { return n.a; })), mn = Math.min.apply(null, row.map(function (n) { return n.a; }));
      return Math.max(side * side * mx / (sum * sum), sum * sum / (side * side * mn));
    }
    function lay(row) {
      var sum = row.reduce(function (s, n) { return s + n.a; }, 0);
      if (rw >= rh) { var cw = sum / rh, cy = y; row.forEach(function (n) { var ch = n.a / cw; rects.push({ it: n.it, x: x, y: cy, w: cw, h: ch }); cy += ch; }); x += cw; rw -= cw; }
      else { var rh2 = sum / rw, cx = x; row.forEach(function (n) { var cw2 = n.a / rh2; rects.push({ it: n.it, x: cx, y: y, w: cw2, h: rh2 }); cx += cw2; }); y += rh2; rh -= rh2; }
    }
    var row = [];
    nodes.forEach(function (n) {
      var side = Math.min(rw, rh);
      if (!row.length || worst(row.concat([n]), side) <= worst(row, side)) row.push(n);
      else { lay(row); row = [n]; }
    });
    if (row.length) lay(row);
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="보유 종목 히트맵" class="chart">';
    rects.forEach(function (r) {
      var dark = lum(r.it.color) < 0.55, fg = dark ? '#fff' : C.ink, fs = Math.max(11, Math.min(22, Math.min(r.w / 4.2, r.h / 2.6)));
      s += '<g><title>' + esc(r.it.title || r.it.label) + '</title><rect x="' + (r.x + 1) + '" y="' + (r.y + 1) + '" width="' + Math.max(0, r.w - 2) + '" height="' + Math.max(0, r.h - 2) + '" rx="6" fill="' + r.it.color + '"/>';
      if (r.w > 44 && r.h > 26) {
        s += '<text x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2 + (r.h > 48 ? -2 : fs / 3)) + '" text-anchor="middle" font-size="' + fs + '" font-weight="800" fill="' + fg + '">' + esc(r.it.label) + '</text>';
        if (r.h > 48) s += '<text x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2 + fs * 0.95) + '" text-anchor="middle" font-size="' + Math.max(10, fs * 0.62) + '" fill="' + fg + '" opacity="0.92">' + esc(r.it.sub || '') + '</text>';
      }
      s += '</g>';
    });
    return s + '</svg>';
  }

  /* 가로 막대 목록(HTML): rows [{label, sub, value(0~1), text, color}] */
  function bars(rows, max) {
    max = max || Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1e-9]));
    return '<div class="bars">' + rows.map(function (r) {
      return '<div class="bar-row"><div class="bar-lab">' + esc(r.label) + (r.sub ? '<span>' + esc(r.sub) + '</span>' : '') + '</div><div class="bar-track"><i style="width:' +
        Math.max(0, r.value / max * 100).toFixed(2) + '%;background:' + (r.color || C.navy) + '"></i></div><div class="bar-val">' + esc(r.text) + '</div></div>';
    }).join('') + '</div>';
  }
  /* 이어진 색 눈금: t 0~1 */
  function seq(t, base) { t = Math.max(0, Math.min(1, t)); return mix('#e6eef9', base || C.blue, 0.12 + 0.88 * t); }
  /* 등락(한국 관례: 오르면 빨강, 내리면 파랑) */
  function updown(v, cap) { var t = Math.max(-1, Math.min(1, v / (cap || 0.03))); return t >= 0 ? mix('#f1f3f6', '#d64545', t) : mix('#f1f3f6', '#2a78d6', -t); }

  root.HS_CHARTS = { C: C, SERIES: SERIES, line: line, treemap: treemap, bars: bars, seq: seq, updown: updown, esc: esc, mix: mix };
})(window);
