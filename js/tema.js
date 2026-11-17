/* Solvectra · tema claro/oscuro y animaciones discretas de la página.
   - Botón de tema (se guarda en localStorage; si no hay elección, sigue al sistema).
   - En modo oscuro adapta los colores de las gráficas (Chart.js), y de los SVG que dibujan los módulos. Solo cambian colores: los datos no se tocan.
   - Aparición suave de bloques al hacer scroll, cifras que cuentan una sola vez y
     pausa de animaciones CSS fuera de pantalla. Todo se omite con prefers-reduced-motion. */
(function () {
  'use strict';
  const raiz = document.documentElement;
  const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IO = 'IntersectionObserver' in window;
  const oscuro = () => raiz.dataset.tema === 'oscuro';

  /* ---------- Mapa de colores claro → oscuro ---------- */
  const MAPA = {
    '#101828': '#DCE3EE', '#0B2A5B': '#CFE2FF', '#5B6B85': '#A3B1C7', '#98A2B3': '#7F8DA6', '#475467': '#A3B1C7',
    '#EEF3FB': '#1D2A40', '#EAF3FF': '#1E2D47', '#F2F4F7': '#222E42', '#DCEBFF': '#1C3157', '#FFF4D1': '#3A2E12',
    '#FFF1EA': '#3A2619', '#F5F9FF': '#121C2E', '#E3ECF8': '#26344D', '#D3E3FA': '#2A3A57',
    '#0F4DBC': '#8EC5FF', '#8EC5FF': '#2F5FA8', '#5B9DF0': '#3D74C9', '#2F80ED': '#4F95F2',
  };
  const RE = /#[0-9a-fA-F]{6}\b/g;
  const mapea = (c) => (typeof c === 'string' ? c.replace(RE, (h) => MAPA[h.toUpperCase()] || h) : c);
  const tieneColor = (c) => typeof c === 'string' && (c.match(RE) || []).some((h) => MAPA[h.toUpperCase()]);
  window.SolvectraTema = { oscuro, c: (col) => (oscuro() ? mapea(col) : col) };

  /* ---------- Chart.js ---------- */
  const CLAVE_COLOR = /colou?r|fill|stroke/i;
  const origen = new WeakMap();
  function recorre(obj, ruta, prof) {
    if (!obj || typeof obj !== 'object' || prof > 7) return;
    for (const k of Object.keys(obj)) {
      if (k === 'data' && ruta.endsWith('ds')) continue;
      const v = obj[k];
      if (CLAVE_COLOR.test(k)) {
        if (typeof v === 'string' || Array.isArray(v)) {
          let o = origen.get(obj);
          const base = o && k in o ? o[k] : v;
          const tiene = Array.isArray(base) ? base.some(tieneColor) : tieneColor(base);
          if (!tiene) continue;
          if (!o) { o = {}; origen.set(obj, o); }
          if (!(k in o)) o[k] = Array.isArray(base) ? base.slice() : base;
          if (/tooltip/.test(ruta) && k === 'backgroundColor') obj[k] = oscuro() ? '#1B2840' : base;
          else obj[k] = Array.isArray(base) ? base.map((x) => (oscuro() ? mapea(x) : x)) : (oscuro() ? mapea(base) : base);
          continue;
        }
        if (typeof v === 'function' && !v.__sv) {
          const f = v;
          const g = function () { const r = f.apply(this, arguments); return oscuro() ? mapea(r) : r; };
          g.__sv = true; obj[k] = g;
          continue;
        }
      }
      if (v && typeof v === 'object' && !(v instanceof Element) && (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)) {
        recorre(v, ruta + '.' + (k === 'datasets' ? 'ds' : k), prof + 1);
      }
    }
  }
  let colorBase = null;
  function temaGraficas() {
    if (!window.Chart) return;
    if (colorBase === null) colorBase = Chart.defaults.color;
    Chart.defaults.color = oscuro() ? mapea(colorBase) : colorBase;
    Chart.defaults.borderColor = oscuro() ? 'rgba(160,190,230,.10)' : 'rgba(0,0,0,0.1)';
  }
  if (window.Chart) {
    Chart.register({
      id: 'solvectraTema',
      beforeUpdate(ch) {
        if (ch.canvas && ch.canvas.closest('[data-tema-propio]')) return;
        temaGraficas();
        recorre(ch.config.options, 'o', 0);
        recorre(ch.config.data, 'd', 0);
      },
    });
  }
  function actualizaGraficas() {
    if (!window.Chart) return;
    temaGraficas();
    Object.values(Chart.instances || {}).forEach((ch) => { try { ch.update('none'); } catch (e) { /* gráfica destruida */ } });
  }

  /* ---------- SVG y estilos en línea que generan los módulos ---------- */
  const ATR = ['style', 'fill', 'stroke', 'stop-color'];
  const fuera = (el) => el.closest && el.closest('.hero, [data-tema-propio], header, footer');
  function tradEl(el) {
    if (!el.getAttribute || fuera(el)) return;
    const o = el.__svO || (el.__svO = {}), puesto = el.__svP || (el.__svP = {});
    ATR.forEach((a) => {
      const v = el.getAttribute(a);
      if (v === null) return;
      if (v !== puesto[a]) { if (!tieneColor(v)) { delete o[a]; puesto[a] = v; return; } o[a] = v; }
      if (!(a in o)) return;
      const nuevo = oscuro() ? mapea(o[a]) : o[a];
      puesto[a] = nuevo;
      if (nuevo !== v) el.setAttribute(a, nuevo);
    });
  }
  function tradArbol(n) {
    if (n.nodeType !== 1) return;
    tradEl(n);
    n.querySelectorAll('[style],[fill],[stroke],[stop-color]').forEach(tradEl);
  }
  const principal = document.querySelector('main');
  if (principal && 'MutationObserver' in window) {
    new MutationObserver((ms) => {
      ms.forEach((m) => {
        if (m.type === 'childList') m.addedNodes.forEach(tradArbol);
        else if (!(m.target.__svP && m.target.getAttribute(m.attributeName) === m.target.__svP[m.attributeName])) tradEl(m.target);
      });
    }).observe(principal, { childList: true, subtree: true, attributes: true, attributeFilter: ATR });
  }

  /* ---------- Tema ---------- */
  const btn = document.getElementById('tema-btn');
  const meta = document.querySelector('meta[name="theme-color"]');
  function aplica(t, guarda) {
    raiz.dataset.tema = t;
    if (btn) {
      const os = t === 'oscuro';
      btn.setAttribute('aria-pressed', String(os));
      btn.setAttribute('aria-label', os ? 'Activar modo claro' : 'Activar modo oscuro');
      btn.title = os ? 'Modo claro' : 'Modo oscuro';
    }
    if (meta) meta.setAttribute('content', t === 'oscuro' ? '#0B1220' : '#0B2A5B');
    const logo = document.querySelector('.barra .logo img');
    if (logo) logo.src = t === 'oscuro' ? 'assets/solvectra-horizontal-oscuro.svg' : 'assets/solvectra-horizontal.svg';
    if (guarda) { try { localStorage.setItem('solvectra-tema', t); } catch (e) { /* sin almacenamiento */ } }
    if (principal) tradArbol(principal);
    actualizaGraficas();
    window.dispatchEvent(new CustomEvent('solvectra:tema', { detail: t }));
  }
  if (!raiz.dataset.tema) raiz.dataset.tema = 'claro';
  aplica(raiz.dataset.tema, false);
  window.addEventListener('load', () => { if (oscuro()) { actualizaGraficas(); } });
  if (btn) btn.addEventListener('click', () => {
    raiz.classList.add('cambia-tema');
    aplica(oscuro() ? 'claro' : 'oscuro', true);
    setTimeout(() => raiz.classList.remove('cambia-tema'), 450);
  });
  if (window.matchMedia) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const sigue = () => { let g = null; try { g = localStorage.getItem('solvectra-tema'); } catch (e) { /* */ } if (!g) aplica(mq.matches ? 'oscuro' : 'claro', false); };
    if (mq.addEventListener) mq.addEventListener('change', sigue);
  }

  /* ---------- Barra de progreso de lectura y sombra de la barra al bajar ---------- */
  const barra = document.querySelector('.barra');
  if (barra) {
    const prog = document.createElement('div');
    prog.className = 'progreso'; prog.setAttribute('aria-hidden', 'true');
    barra.appendChild(prog);
    let pend = false;
    const lee = () => {
      pend = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      barra.classList.toggle('con-sombra', scrollY > 8);
    };
    addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(lee); } }, { passive: true });
    lee();
  }

  if (quieto || !IO) return;

  raiz.classList.add('anima');

  /* ---------- Partículas de luz en el encabezado (hero) ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.setAttribute('data-anim', '');
    const cv = document.createElement('canvas');
    cv.className = 'hero-luz'; cv.setAttribute('aria-hidden', 'true');
    hero.prepend(cv);
    const cx = cv.getContext('2d');
    let w = 0, h = 0, pts = [], vivo = true, rq = 0, t0 = 0, mx = 0, my = 0;
    const COL = ['255,194,46', '142,197,255', '25,195,230', '255,255,255'];
    const mide = () => {
      const r = hero.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; cx.setTransform(d, 0, 0, d, 0, 0);
      const n = w < 600 ? 22 : 46;
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 2.2, v: 6 + Math.random() * 16, f: Math.random() * 6.28, c: COL[(Math.random() * COL.length) | 0], z: 0.3 + Math.random() * 0.7 }));
    };
    const pinta = (t) => {
      rq = 0;
      if (!vivo || document.hidden) { t0 = 0; return; }
      const dt = t0 ? Math.min(0.05, (t - t0) / 1000) : 0; t0 = t;
      cx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.y -= p.v * dt; p.f += dt * 1.6;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(p.f));
        const x = p.x + mx * 14 * p.z, y = p.y + my * 10 * p.z;
        const g = cx.createRadialGradient(x, y, 0, x, y, p.r * 5);
        g.addColorStop(0, `rgba(${p.c},${a})`); g.addColorStop(1, `rgba(${p.c},0)`);
        cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, p.r * 5, 0, 6.283); cx.fill();
      }
      rq = requestAnimationFrame(pinta);
    };
    const arranca = () => { if (!rq && vivo && !document.hidden) rq = requestAnimationFrame(pinta); };
    mide(); arranca();
    new ResizeObserver(() => mide()).observe(hero);
    new IntersectionObserver((es) => { vivo = es[0].isIntersecting; arranca(); }).observe(hero);
    document.addEventListener('visibilitychange', arranca);
    if (matchMedia('(hover: hover)').matches) hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5;
    });
  }

  /* ---------- Paralaje suave de las ilustraciones del encabezado ---------- */
  const capas = document.querySelectorAll('.hero .hero-arte');
  if (capas.length) {
    let pend = false;
    const mueve = () => {
      pend = false;
      const y = Math.min(scrollY, innerHeight);
      capas.forEach((c) => { c.style.translate = `0 ${(y * (0.08)).toFixed(1)}px`; });
    };
    addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(mueve); } }, { passive: true });
  }

  /* ---------- Brillo que sigue al cursor en tarjetas ---------- */
  if (matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', (e) => {
      const t = e.target.closest && e.target.closest('.tarjeta, .paso');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--gx', `${e.clientX - r.left}px`); t.style.setProperty('--gy', `${e.clientY - r.top}px`);
    }, { passive: true });
  }



  /* ---------- Aparición al hacer scroll ---------- */
  const GRUPOS = '.rejilla, .proceso, .promesas, .faq';
  document.querySelectorAll(GRUPOS).forEach((gr) => {
    [...gr.children].forEach((h, i) => { h.classList.add('escalon-r'); h.style.setProperty('--d', `${Math.min(i, 8) * 70}ms`); });
  });
  const bloques = document.querySelectorAll('main section > .contenedor > *:not(' + GRUPOS.split(', ').join('):not(') + '), main .panel, main .escalon-r');
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
  bloques.forEach((b) => {
    const padre = b.parentElement && b.parentElement.closest('.revela');
    if (padre) return;
    const r = b.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return; /* lo que ya se ve, se queda quieto */
    b.classList.add('revela'); io.observe(b);
  });

  /* ---------- Cifras que cuentan una vez ---------- */
  function cuentaNodo(nodo) {
    const txt = nodo.nodeValue, m = txt.match(/^(\s*)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(\s*)$/);
    if (!m) return;
    const dec = m[3] ? m[3].length - 1 : 0, fin = parseFloat((m[2] + (m[3] || '')).replace(/,/g, '')), sep = m[2].includes(',');
    const fmt = (v) => { const s = v.toFixed(dec); const [e, d] = s.split('.'); return m[1] + (sep ? e.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : e) + (d ? '.' + d : '') + m[4]; };
    const t0 = performance.now(), dur = 1100;
    let puesto = txt;
    (function paso(t) {
      if (nodo.nodeValue !== puesto) return; /* el módulo actualizó la cifra: se respeta */
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      puesto = k < 1 ? fmt(fin * e) : txt; nodo.nodeValue = puesto;
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  function cuenta(el) {
    if (!el.hasAttribute('data-cuenta')) { const n = [...el.childNodes].find((x) => x.nodeType === 3 && x.nodeValue.trim()); if (n) cuentaNodo(n); return; }
    const txt = el.textContent;
    const m = txt.match(/^(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?$/);
    if (!m) return;
    const dec = m[2] ? m[2].length - 1 : 0;
    const fin = parseFloat(txt.replace(/,/g, ''));
    const sep = txt.includes(',');
    const fmt = (v) => { const s = v.toFixed(dec); if (!sep) return s; const [e, d] = s.split('.'); return e.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : ''); };
    const t0 = performance.now(), dur = 1100;
    el.style.fontVariantNumeric = 'tabular-nums';
    (function paso(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? fmt(fin * e) : txt;
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  const ioC = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { cuenta(e.target); ioC.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-cuenta]').forEach((c) => ioC.observe(c));

  /* ---------- Pausar animaciones CSS fuera de pantalla ---------- */
  const ioA = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('en-pausa', !e.isIntersecting)), { threshold: 0 });
  document.querySelectorAll('[data-anim]').forEach((a) => ioA.observe(a));
  document.addEventListener('visibilitychange', () => raiz.classList.toggle('pestana-oculta', document.hidden));
})();
