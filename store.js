/* 저장(브라우저 localStorage), 백업 파일, 공유 링크, 시세·환율 받기 */
(function (root) {
  'use strict';
  var KEY = 'hoesuyul-portfolio.v1';
  var uid = function () { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  function blank() {
    var id = uid();
    return {
      v: 1, active: id, portfolios: [{ id: id, name: '내 포트폴리오', holdings: [], targets: {} }], watch: [], custom: {}, gov: {}, manual: {},
      settings: { cur: 'USD', fx: 1400, fxAuto: true, fxTs: 0, deposit: null, tax: 15, basis: 'lo', key: '' }, snaps: {}, prices: {}
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY); if (!raw) return blank();
      var s = JSON.parse(raw), b = blank();
      if (!s || !Array.isArray(s.portfolios) || !s.portfolios.length) return b;
      Object.keys(b).forEach(function (k) { if (s[k] == null) s[k] = b[k]; });
      Object.keys(b.settings).forEach(function (k) { if (s.settings[k] === undefined) s.settings[k] = b.settings[k]; });
      s.portfolios.forEach(function (p) { p.holdings = p.holdings || []; p.targets = p.targets || {}; });
      if (!s.portfolios.some(function (p) { return p.id === s.active; })) s.active = s.portfolios[0].id;
      return s;
    } catch (e) { return blank(); }
  }
  var saveOk = true;
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); saveOk = true; } catch (e) { saveOk = false; } return saveOk; }

  /* 공유 링크: 종목·수량과 직접 입력 종목만 담는다(평단·기록은 담지 않는다) */
  function b64e(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; return decodeURIComponent(escape(atob(str))); }
  function shareLink(s, pf) {
    var c = {}; pf.holdings.forEach(function (h) { if (s.custom[h.t]) c[h.t] = s.custom[h.t]; });
    var data = { n: pf.name, h: pf.holdings.map(function (h) { return [h.t, h.qty]; }), c: c };
    return location.origin + location.pathname + '#p=' + b64e(JSON.stringify(data));
  }
  function readShare() {
    var m = /[#&]p=([A-Za-z0-9_-]+)/.exec(location.hash); if (!m) return null;
    try {
      var d = JSON.parse(b64d(m[1]));
      if (!d || !Array.isArray(d.h)) return null;
      return {
        name: String(d.n || '공유받은 포트폴리오').slice(0, 40), custom: (d.c && typeof d.c === 'object') ? d.c : {},
        holdings: d.h.filter(function (r) { return Array.isArray(r) && typeof r[0] === 'string' && r[1] > 0; }).slice(0, 100).map(function (r) { return { t: r[0].toUpperCase().slice(0, 12), qty: +r[1] }; })
      };
    } catch (e) { return null; }
  }

  /* 시세: Finnhub quote. 한 번에 몇 종목씩 나눠 받는다 */
  function fetchQuotes(tickers, key, onEach) {
    var q = tickers.slice(), ok = 0, bad = 0, limited = false;
    function one(t) {
      return fetch('https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(t) + '&token=' + encodeURIComponent(key))
        .then(function (r) { if (r.status === 429) { limited = true; throw new Error('limit'); } if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (j && j.c > 0) { ok++; onEach(t, { p: j.c, pc: j.pc > 0 ? j.pc : null, ts: Date.now(), qt: j.t ? j.t * 1000 : null }); } else bad++; })
        .catch(function () { bad++; });
    }
    function worker() { if (!q.length || limited) return Promise.resolve(); return one(q.shift()).then(worker); }
    var ws = []; for (var i = 0; i < 4; i++) ws.push(worker());
    return Promise.all(ws).then(function () { return { ok: ok, bad: bad, limited: limited }; });
  }
  /* 환율(원/달러): 하루 한 번쯤 바뀌는 공개 자료 두 곳을 차례로 */
  function fetchFx() {
    var j = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('fx'); return r.json(); }); };
    return j('https://open.er-api.com/v6/latest/USD').then(function (d) { var v = d && d.rates && d.rates.KRW; if (!(v > 0)) throw new Error('fx'); return v; })
      .catch(function () { return j('https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW').then(function (d) { var v = d && d.rates && d.rates.KRW; if (!(v > 0)) throw new Error('fx'); return v; }); });
  }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  root.HS_STORE = { load: load, save: save, blank: blank, uid: uid, shareLink: shareLink, readShare: readShare, fetchQuotes: fetchQuotes, fetchFx: fetchFx, download: download, saveOk: function () { return saveOk; } };
})(window);
