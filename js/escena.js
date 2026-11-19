/* Solvectra · Escenas al bajar (todo con IntersectionObserver y scroll pasivo).
   1. Títulos (h2) que suben palabra por palabra desde una máscara.
   2. «Quiénes somos»: la frase se ilumina palabra por palabra conforme bajas.
   3. Elementos [data-vista]: reciben .visto al entrar (símbolo que amanece, equipos, etc.).
   4. Proceso: sección fija; cada paso reemplaza al anterior según el avance del scroll.
   5. Sellos: chips que muestran su significado; rotan solos hasta que tocas uno.
   6. Cifras [data-num] que cuentan desde 0 una sola vez.
   7. Tarjetas .plegable con «Ver más».
   Con prefers-reduced-motion todo se muestra completo y quieto. */
(function () {
  'use strict';
  const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IO = 'IntersectionObserver' in window;
  const raiz = document.documentElement;
  if (!quieto && IO) raiz.classList.add('escena');

  const observa = (els, fn, opts) => {
    if (!IO || quieto) { els.forEach((e) => fn(e)); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }),
      opts || { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    els.forEach((e) => io.observe(e));
  };

  /* ---------- 1. Títulos palabra por palabra ---------- */
  const titulos = [...document.querySelectorAll('main section h2:not(.frase-luz)')];
  titulos.forEach((h) => {
    h.setAttribute('data-propio', '');
    if (quieto || !IO) return;
    h.setAttribute('aria-label', h.textContent.trim());
    const ws = h.textContent.trim().split(/\s+/);
    h.innerHTML = ws.map((w, i) => `<span class="tw" aria-hidden="true"><i style="--n:${i}">${w}</i></span>`).join(' ');
  });
  observa(titulos, (h) => h.classList.add('visto'));
  /* la etiqueta que acompaña al título se dibuja con él */
  observa([...document.querySelectorAll('main section .etiqueta')], (e) => e.classList.add('visto'));

  /* ---------- 2. Frase que se ilumina ---------- */
  const frase = document.querySelector('.frase-luz');
  let palabrasLuz = [];
  if (frase) {
    if (!quieto && IO) {
      frase.setAttribute('aria-label', frase.textContent.trim());
      frase.innerHTML = frase.textContent.trim().split(/\s+/).map((w) => `<span class="pl" aria-hidden="true">${w}</span>`).join(' ');
      palabrasLuz = [...frase.querySelectorAll('.pl')];
    } else frase.classList.add('toda');
  }
  function luz() {
    if (!palabrasLuz.length) return;
    const r = frase.getBoundingClientRect(), H = innerHeight;
    // empieza cuando el inicio de la frase llega al 85 % de la pantalla y termina cuando su final pasa el 45 %
    const p = Math.min(1, Math.max(0, (H * 0.85 - r.top) / (r.height + H * 0.4)));
    const n = Math.round(p * palabrasLuz.length);
    palabrasLuz.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ---------- 3. [data-vista] ---------- */
  observa([...document.querySelectorAll('[data-vista], .equipos')], (e) => e.classList.add('visto'));

  /* ---------- 4. Proceso fijo ---------- */
  const pista = document.getElementById('pp-pista');
  const pasos = pista ? [...pista.querySelectorAll('.pp')] : [];
  const puntos = pista ? [...pista.querySelectorAll('.pp-punto')] : [];
  const anillo = pista && pista.querySelector('.pp-avance');
  let pasoAct = -1;
  if (pista) {
    if (quieto || !IO) pista.classList.add('lista');
    else pista.classList.add('fija');
    puntos.forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i, total = pista.offsetHeight - innerHeight;
      const y = pista.getBoundingClientRect().top + scrollY + total * ((i + 0.5) / pasos.length);
      scrollTo({ top: y, behavior: quieto ? 'auto' : 'smooth' });
    }));
  }
  function proceso() {
    if (!pista || !pista.classList.contains('fija')) return;
    const r = pista.getBoundingClientRect(), total = Math.max(1, r.height - innerHeight);
    const p = Math.min(1, Math.max(0, -r.top / total));
    const i = Math.min(pasos.length - 1, Math.floor(p * pasos.length));
    if (anillo) anillo.style.strokeDashoffset = String(1 - Math.max(0.02, (i + 1) / pasos.length));
    if (i === pasoAct) return;
    const dir = i > pasoAct ? 'baja' : 'sube';
    pasos.forEach((el, k) => {
      el.classList.toggle('activo', k === i);
      el.classList.toggle('antes', k < i);
      el.dataset.dir = dir;
    });
    puntos.forEach((b, k) => { b.classList.toggle('activo', k === i); b.classList.toggle('hecho', k < i); });
    pasoAct = i;
  }

  /* ---------- 5. Sellos interactivos ---------- */
  const juego = document.getElementById('sellos-juego');
  if (juego) {
    const chips = [...juego.querySelectorAll('.sello-btn')], defs = [...juego.querySelectorAll('.sello-def')];
    let i = 0, reloj = 0, tocado = false;
    const muestra = (k) => {
      i = k;
      chips.forEach((c, j) => { c.classList.toggle('activo', j === k); c.setAttribute('aria-pressed', String(j === k)); });
      defs.forEach((d, j) => d.classList.toggle('activo', j === k));
    };
    chips.forEach((c) => c.addEventListener('click', () => { tocado = true; clearInterval(reloj); muestra(+c.dataset.i); }));
    if (!quieto && IO) {
      new IntersectionObserver((es) => es.forEach((e) => {
        clearInterval(reloj);
        if (e.isIntersecting && !tocado) reloj = setInterval(() => muestra((i + 1) % chips.length), 2600);
      }), { threshold: 0.4 }).observe(juego);
    }
  }

  /* ---------- 6. Cifras que cuentan ---------- */
  const nums = [...document.querySelectorAll('[data-num]')];
  observa(nums, (el) => {
    if (quieto) return;
    const fin = parseFloat(el.dataset.num), dec = +el.dataset.dec || 0, t0 = performance.now(), dur = 1300;
    const fmt = (v) => v.toFixed(dec);
    const paso = (t) => {
      const u = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - u, 3);
      el.textContent = fmt(fin * e);
      if (u < 1) requestAnimationFrame(paso); else el.textContent = fmt(fin);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(paso);
  }, { threshold: 0.6 });

  /* ---------- 7. Plegables ---------- */
  document.querySelectorAll('.plegable').forEach((p) => {
    const btn = p.querySelector('.ver-mas'), det = p.querySelector('.hito-det');
    if (!btn || !det) return;
    p.classList.add('con-js');
    det.inert = true;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const abre = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(abre));
      btn.querySelector('span').textContent = abre ? 'Ver menos' : 'Ver más';
      p.classList.toggle('abierto', abre);
      det.inert = !abre;
    });
  });

  /* ---------- Scroll ---------- */
  let pend = false;
  const cuadro = () => { pend = false; luz(); proceso(); };
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(cuadro); } }, { passive: true });
  addEventListener('resize', cuadro);
  cuadro();
})();
