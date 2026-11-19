/* Solvectra · Intro de entrada (estilo intro de video).
   Un sol gira en espiral alrededor de un panel solar (pasa por detrás y por delante),
   choca con él y del choque las 32 celdas del panel se reacomodan en el símbolo
   «Amanecer en celdas» (que también tiene 32 celdas). Después aparece el nombre y la frase.
   Duración ≈ 3.4 s. Se puede saltar con clic, toque, Esc o el botón «Saltar intro».
   Con prefers-reduced-motion no se ejecuta (la clase «cine» no se agrega en <head>). */
(function () {
  'use strict';
  const html = document.documentElement;
  if (!html.classList.contains('cine')) return;

  /* ---------- Línea de tiempo (segundos) ---------- */
  const T = {
    panelIn: 0.0,  panelDur: 0.4,
    solIn: 0.15,   impacto: 1.5,                 // el sol gira de 0.15 s a 1.5 s
    explota: 0.22,                               // celdas salen disparadas tras el choque
    morfIni: 0.2,  morfDur: 0.75,                // celdas → símbolo
    nombre: 0.8,   frase: 1.1,                   // relativos al impacto
    salida: 1.85,  salidaDur: 0.55               // relativos al impacto
  };

  /* ---------- Símbolo: 32 celdas (versión para fondo oscuro) ---------- */
  const LOGO = [
    [40.8,10,'#2F80ED'],[71.7,10,'#F5A300'],[102.5,10,'#F5A300'],[133.3,10,'#FFC22E'],
    [10,40.8,'#0F4DBC'],[40.8,40.8,'#0F4DBC'],[71.7,40.8,'#2F80ED'],[102.5,40.8,'#F5A300'],[133.3,40.8,'#F5A300'],[164.2,40.8,'#FFC22E'],
    [10,71.7,'#8EC5FF'],[40.8,71.7,'#0F4DBC'],[71.7,71.7,'#0F4DBC'],[102.5,71.7,'#2F80ED'],[133.3,71.7,'#F5A300'],[164.2,71.7,'#F5A300'],
    [10,102.5,'#8EC5FF'],[40.8,102.5,'#8EC5FF'],[71.7,102.5,'#0F4DBC'],[102.5,102.5,'#0F4DBC'],[133.3,102.5,'#2F80ED'],[164.2,102.5,'#F5A300'],
    [10,133.3,'#8EC5FF'],[40.8,133.3,'#8EC5FF'],[71.7,133.3,'#8EC5FF'],[102.5,133.3,'#0F4DBC'],[133.3,133.3,'#0F4DBC'],[164.2,133.3,'#2F80ED'],
    [40.8,164.2,'#8EC5FF'],[71.7,164.2,'#8EC5FF'],[102.5,164.2,'#8EC5FF'],[133.3,164.2,'#0F4DBC']
  ];

  /* ---------- Utilidades ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut3 = (t) => 1 - Math.pow(1 - t, 3);
  const eIn2 = (t) => t * t;
  const eInOut3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mezcla = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; };
  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  /* ---------- DOM del velo ---------- */
  const velo = document.createElement('div');
  velo.id = 'cine';
  velo.innerHTML =
    '<canvas aria-hidden="true"></canvas>' +
    '<div class="cine-texto"><div class="cine-nombre" aria-label="Solvectra">' +
    'SOLVECTRA'.split('').map((l, i) => `<span style="--i:${i}" aria-hidden="true">${l}</span>`).join('') +
    '</div><p class="cine-frase">Ingeniería fotovoltaica con números claros.</p></div>' +
    '<button type="button" class="cine-saltar">Saltar intro</button>';
  document.body.prepend(velo);
  const cv = velo.querySelector('canvas');
  const cx = cv.getContext('2d');
  const texto = velo.querySelector('.cine-texto');

  /* ---------- Geometría ---------- */
  let W = 0, H = 0, DPR = 1, C = { x: 0, y: 0 }, S = 160, k = 1, celdas = [], estrellas = [], panel = {};
  function medir() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = clamp(Math.min(W, H) * 0.34, 130, 230);            // diámetro del símbolo
    k = S / 184;                                             // escala de las unidades del símbolo
    C = { x: W / 2, y: H * (W < 600 ? 0.4 : 0.42) };
    texto.style.top = `${C.y + S / 2 + 26}px`;

    const Pw = Math.min(W * 0.84, S * 2.15);                 // ancho del panel
    const paso = Pw / 8, c = paso * 0.86;
    panel = { w: Pw + paso * 0.35, h: paso * 4 + paso * 0.35, c, paso };
    const logoC = LOGO.map(([x, y, col]) => ({ x: C.x + (x + 12.9 - 100) * k, y: C.y + (y + 12.9 - 100) * k, col }));
    celdas = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
      const n = j * 8 + i;
      const px = C.x + (i - 3.5) * paso, py = C.y + (j - 1.5) * paso;
      const ang = Math.atan2(py - C.y, px - C.x), dist = Math.hypot(px - C.x, py - C.y);
      const prev = celdas[n] || {};
      celdas.push({
        px, py, lx: logoC[n].x, ly: logoC[n].y, col: logoC[n].col, dist,
        ex: px + Math.cos(ang) * (prev.r1 || (0.5 + Math.random() * 0.9)) * paso,
        ey: py + Math.sin(ang) * (prev.r1 || (0.5 + Math.random() * 0.9)) * paso - paso * 0.2,
        r1: prev.r1 || (0.5 + Math.random() * 0.9),
        rot: prev.rot || (Math.random() - 0.5) * 1.6
      });
    }
    if (!estrellas.length) for (let i = 0; i < 90; i++) estrellas.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, f: Math.random() * 6.28 });
  }
  medir();
  addEventListener('resize', medir);

  /* ---------- Chispas del choque ---------- */
  const chispas = [];
  function lanzaChispas() {
    const cols = ['#FFFFFF', '#FFE08A', '#FFC22E', '#F5A300', '#19C3E6'];
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, v = 260 + Math.random() * 760;
      chispas.push({ x: C.x, y: C.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.55 + Math.random() * 0.6, t: 0, col: cols[i % cols.length], g: 1 + Math.random() * 2 });
    }
  }

  /* ---------- Dibujo ---------- */
  const estela = [];
  function dibujaFondo(t) {
    for (const s of estrellas) {
      cx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 2 + s.f) ** 2;
      cx.fillStyle = '#EAF3FF';
      cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r, 0, 6.283); cx.fill();
    }
    cx.globalAlpha = 1;
  }
  function dibujaSol(x, y, r, t, alfa) {
    cx.save(); cx.globalAlpha = alfa;
    const g = cx.createRadialGradient(x, y, 0, x, y, r * 4.2);
    g.addColorStop(0, 'rgba(255,214,90,.55)'); g.addColorStop(0.35, 'rgba(255,194,46,.18)'); g.addColorStop(1, 'rgba(255,194,46,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 4.2, 0, 6.283); cx.fill();
    cx.strokeStyle = '#FFC22E'; cx.lineWidth = Math.max(2, r * 0.16); cx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = t * 2.2 + (i * Math.PI) / 6, r1 = r * 1.35, r2 = r * (i % 2 ? 1.7 : 1.95);
      cx.beginPath(); cx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); cx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); cx.stroke();
    }
    const n = cx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    n.addColorStop(0, '#FFF6C8'); n.addColorStop(0.55, '#FFC22E'); n.addColorStop(1, '#F5A300');
    cx.fillStyle = n; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
    cx.restore();
  }
  function dibujaMarco(alfa, esc) {
    if (alfa <= 0) return;
    cx.save(); cx.globalAlpha = alfa;
    cx.translate(C.x, C.y); cx.scale(esc, esc);
    const w = panel.w, h = panel.h;
    const g = cx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, '#8EC5FF'); g.addColorStop(1, '#2F80ED');
    rrect(cx, -w / 2, -h / 2, w, h, panel.paso * 0.28);
    cx.fillStyle = 'rgba(8,24,56,.92)'; cx.fill();
    cx.lineWidth = Math.max(3, panel.paso * 0.1); cx.strokeStyle = g; cx.stroke();
    cx.restore();
  }
  function dibujaCelda(x, y, lado, rot, color, brillo) {
    cx.save(); cx.translate(x, y); cx.rotate(rot);
    rrect(cx, -lado / 2, -lado / 2, lado, lado, lado * 0.2);
    cx.fillStyle = color; cx.fill();
    if (brillo > 0) {
      cx.globalAlpha = brillo; cx.shadowColor = '#FFC22E'; cx.shadowBlur = lado * 0.9; cx.fill();
    }
    cx.restore();
  }

  /* ---------- Bucle ---------- */
  let t0 = 0, rq = 0, ultimo = 0, fase = 'corre', disparoChispas = false, marcas = {};
  function cuadro(ahora) {
    if (!t0) t0 = ahora;
    const t = (ahora - t0) / 1000, dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000); ultimo = ahora;
    cx.clearRect(0, 0, W, H);
    dibujaFondo(t);

    const ti = T.impacto, tr = t - ti;                     // tr: tiempo desde el choque
    const ent = clamp((t - T.panelIn) / T.panelDur, 0, 1); // entrada del panel
    const lado0 = panel.c, ladoL = 25.8 * k;

    /* Sol en espiral (antes del choque) */
    let sol = null;
    if (t >= T.solIn && t < ti) {
      const u = (t - T.solIn) / (ti - T.solIn);
      const th = Math.PI / 2 + 2.5 * Math.PI * (eIn2(u) - 1);     // 1¼ vueltas; termina al frente (abajo)
      const R0 = Math.min(panel.w * 0.72, W * 0.47);
      const r = R0 * (1 - Math.pow(u, 2.2));
      const inc = -0.21;                                          // inclinación de la órbita
      const ox = r * Math.cos(th), oy = r * Math.sin(th) * 0.36;
      const x = C.x + ox * Math.cos(inc) - oy * Math.sin(inc), y = C.y + ox * Math.sin(inc) + oy * Math.cos(inc);
      const prof = Math.sin(th);                                  // >0 al frente, <0 detrás
      sol = { x, y, r: S * 0.12 * (1 + 0.2 * prof), prof, a: clamp((t - T.solIn) / 0.2, 0, 1) };
      estela.push({ x, y, r: sol.r, prof }); if (estela.length > 16) estela.shift();
    }
    const dibujaEstela = (frente) => {
      cx.save(); cx.globalCompositeOperation = 'lighter';
      estela.forEach((p, i) => {
        if ((p.prof >= 0) !== frente) return;
        const a = (i / estela.length) * 0.22;
        cx.fillStyle = `rgba(255,194,46,${a})`; cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.4 + i / estela.length * 0.7), 0, 6.283); cx.fill();
      });
      cx.restore();
    };

    if (sol && sol.prof < 0) { dibujaEstela(false); dibujaSol(sol.x, sol.y, sol.r * 0.92, t, sol.a * 0.85); }

    /* Panel: marco + celdas */
    if (tr < 0) {
      const e = eOutBack(ent);
      dibujaMarco(ent, 0.85 + 0.15 * e);
      celdas.forEach((c) => {
        const pulso = sol ? clamp(1 - Math.hypot(c.px - sol.x, c.py - sol.y) / (S * 1.1), 0, 1) : 0;
        dibujaCelda(lerp(C.x, c.px, e), lerp(C.y, c.py, e), lado0 * e, 0, mezcla('#123E8C', '#2F80ED', pulso * 0.8), pulso * 0.35);
      });
    } else {
      dibujaMarco(1 - clamp(tr / 0.3, 0, 1), 1 + 0.18 * eOut3(clamp(tr / 0.3, 0, 1)));
      const morf = clamp((tr - T.morfIni) / T.morfDur, 0, 1), em = eInOut3(morf);
      const cierra = clamp((tr - (T.morfIni + T.morfDur * 0.75)) / 0.3, 0, 1);
      if (cierra > 0) { cx.save(); cx.beginPath(); cx.arc(C.x, C.y, lerp(150, 92, eOut3(cierra)) * k, 0, 6.283); cx.clip(); }
      celdas.forEach((c) => {
        const enc = clamp((tr - c.dist / (S * 6)) / 0.12, 0, 1);        // la onda de luz recorre el panel
        const ex = eOut3(clamp(tr / T.explota, 0, 1));
        const bx = lerp(c.px, c.ex, ex), by = lerp(c.py, c.ey, ex);
        const x = lerp(bx, c.lx, em), y = lerp(by, c.ly, em);
        const rot = c.rot * ex * (1 - em);
        const lado = lerp(lado0, ladoL, em);
        const col = morf > 0 ? mezcla('#FFD45E', c.col, em) : mezcla('#2F80ED', '#FFD45E', enc);
        dibujaCelda(x, y, lado, rot, col, (1 - em) * 0.6 * enc);
      });
      if (cierra > 0) cx.restore();
      /* halo del logo ya formado */
      if (morf >= 1) {
        const p = clamp((tr - T.morfIni - T.morfDur) / 0.4, 0, 1);
        cx.save(); cx.globalCompositeOperation = 'destination-over';
        const g = cx.createRadialGradient(C.x, C.y, S * 0.3, C.x, C.y, S * 1.2);
        g.addColorStop(0, `rgba(255,194,46,${0.22 * p})`); g.addColorStop(1, 'rgba(255,194,46,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(C.x, C.y, S * 1.2, 0, 6.283); cx.fill(); cx.restore();
      }
    }

    /* cuando el sol pasa por detrás, su luz se asoma a través de las celdas */
    if (sol && sol.prof < 0) {
      cx.save(); cx.globalCompositeOperation = 'lighter';
      const g = cx.createRadialGradient(sol.x, sol.y, 0, sol.x, sol.y, sol.r * 2.6);
      g.addColorStop(0, `rgba(255,214,90,${0.55 * sol.a})`); g.addColorStop(1, 'rgba(255,194,46,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(sol.x, sol.y, sol.r * 2.6, 0, 6.283); cx.fill(); cx.restore();
    }
    if (sol && sol.prof >= 0) { dibujaEstela(true); dibujaSol(sol.x, sol.y, sol.r, t, sol.a); }

    /* Choque: destello, onda y chispas */
    if (tr >= 0) {
      if (!disparoChispas) { disparoChispas = true; lanzaChispas(); estela.length = 0; }
      const s = clamp(tr / 0.35, 0, 1);
      if (s < 1) { // el sol se aplasta y se apaga
        dibujaSol(C.x, C.y, S * 0.12 * (1 + 1.6 * eOut3(s)), t, 1 - s);
      }
      const o = clamp(tr / 0.75, 0, 1);
      if (o < 1) {
        cx.save(); cx.globalAlpha = 1 - o; cx.strokeStyle = '#FFE08A'; cx.lineWidth = 8 * (1 - o) + 1;
        cx.beginPath(); cx.arc(C.x, C.y, eOut3(o) * Math.max(W, H) * 0.62, 0, 6.283); cx.stroke();
        cx.globalAlpha = (1 - o) * 0.5; cx.strokeStyle = '#19C3E6'; cx.lineWidth = 3;
        cx.beginPath(); cx.arc(C.x, C.y, eOut3(o) * Math.max(W, H) * 0.48, 0, 6.283); cx.stroke();
        cx.restore();
      }
      cx.save(); cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round';
      for (const p of chispas) {
        if (p.t > p.vida) continue;
        p.t += dt; p.vx *= 1 - 2.6 * dt; p.vy *= 1 - 2.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const a = 1 - p.t / p.vida;
        cx.globalAlpha = a; cx.strokeStyle = p.col; cx.lineWidth = p.g;
        cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); cx.stroke();
      }
      cx.restore();
      const f = clamp(tr / 0.4, 0, 1);
      if (f < 1) {
        const g = cx.createRadialGradient(C.x, C.y, 0, C.x, C.y, Math.max(W, H) * 0.8);
        g.addColorStop(0, `rgba(255,250,230,${0.95 * (1 - f) ** 2})`); g.addColorStop(1, `rgba(255,214,90,${0.35 * (1 - f) ** 2})`);
        cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      }
      if (!marcas.n && tr >= T.nombre) { marcas.n = 1; velo.classList.add('nombre-in'); }
      if (!marcas.f && tr >= T.frase) { marcas.f = 1; velo.classList.add('frase-in'); }
      if (!marcas.s && tr >= T.salida) { marcas.s = 1; termina(T.salidaDur); }
    }
    if (fase !== 'fin') rq = requestAnimationFrame(cuadro);
  }

  /* ---------- Salida / saltar ---------- */
  function termina(dur) {
    if (fase !== 'corre') return;
    fase = 'sale';
    velo.style.setProperty('--sale', `${dur}s`);
    velo.classList.add('sale');
    html.classList.remove('cine');
    if (typeof window.__heroGo === 'function') window.__heroGo();
    setTimeout(() => { fase = 'fin'; cancelAnimationFrame(rq); removeEventListener('resize', medir); velo.remove(); }, dur * 1000 + 60);
  }
  const saltar = () => { velo.classList.add('nombre-in', 'frase-in'); termina(0.3); };
  velo.addEventListener('click', saltar);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') saltar(); }, { once: true });

  rq = requestAnimationFrame(cuadro);
})();
