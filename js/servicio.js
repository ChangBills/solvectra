/* Solvectra · Sección «Nuestro servicio»: ruta de las 7 partes.
   - Cada parte entra deslizándose desde su lado al bajar (una por una).
   - La línea central se llena de azul a amarillo según el avance del scroll
     y enciende el nodo de cada parte que ya pasó.
   - «Ver más» expande la tarjeta en su lugar; el contenido cerrado no se enfoca (inert).
   Con prefers-reduced-motion todo aparece de inmediato y sin desplazamientos. */
(function () {
  'use strict';
  const env = document.getElementById('ruta');
  if (!env) return;
  const hitos = [...env.querySelectorAll('.hito')];
  const relleno = env.querySelector('.ruta-relleno');
  const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  env.classList.add('con-js');

  /* ---------- Ver más / ver menos ---------- */
  hitos.forEach((h) => {
    const btn = h.querySelector('.ver-mas');
    const det = h.querySelector('.hito-det');
    if (!btn || !det) return;
    det.inert = true;
    btn.addEventListener('click', () => {
      const abre = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(abre));
      btn.querySelector('span').textContent = abre ? 'Ver menos' : 'Ver más';
      h.classList.toggle('abierto', abre);
      det.inert = !abre;
      requestAnimationFrame(avance);
    });
  });

  /* ---------- Aparición una por una ---------- */
  if (quieto || !('IntersectionObserver' in window)) {
    hitos.forEach((h) => h.classList.add('visto'));
  } else {
    env.classList.add('anima-ruta');
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.25 });
    hitos.forEach((h) => io.observe(h));
  }

  /* ---------- Línea que se llena y nodos que se encienden ---------- */
  let pend = false;
  function avance() {
    pend = false;
    const r = env.getBoundingClientRect();
    const marca = innerHeight * 0.62;              // punto de lectura: 62 % de la pantalla
    const p = Math.min(1, Math.max(0, (marca - r.top) / Math.max(1, r.height)));
    if (relleno) relleno.style.transform = `scaleY(${p.toFixed(4)})`;
    hitos.forEach((h) => {
      const n = h.querySelector('.nodo');
      const c = n.getBoundingClientRect();
      h.classList.toggle('activo', c.top + c.height / 2 <= marca);
    });
  }
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(avance); } }, { passive: true });
  addEventListener('resize', avance);
  avance();
})();
