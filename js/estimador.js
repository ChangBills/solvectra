/* Solvectra · Estimador rápido de paneles (todo se calcula en el navegador).
   Fórmulas (también explicadas en la página):
     E_dia  = consumo del periodo [kWh] / días del periodo           → kWh/día
     P_FV   = E_dia / (HSP × PR)                                      → kW
     N      = techo(P_FV × 1000 / P_panel)                            → paneles
     P_inst = N × P_panel / 1000                                      → kW
     E_gen  = P_inst × HSP × PR                                       → kWh/día
     Valor  = mín(E_gen, E_dia) × días × tarifa                       → MXN por periodo
   Si falta un dato o no es válido, se muestra «—» (nunca NaN). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('cot-form');
  if (!form) return;

  const nf = (d) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = nf(0), f1 = nf(1), f2 = nf(2);
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  /* Lee un número positivo dentro de [min, max]; si no es válido devuelve null. */
  function num(id, min, max) {
    const el = $(id);
    const t = String(el.value).trim().replace(',', '.');
    if (t === '') { el.removeAttribute('aria-invalid'); return null; }
    const v = Number(t);
    const ok = Number.isFinite(v) && v >= min && v <= max;
    if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
    return ok ? v : null;
  }

  function pon(id, txt) { $(id).textContent = txt; }

  function calcula() {
    const consumo = num('c-consumo', 1, 1e7);
    const dias = Number($('c-dias').value) || 60;
    const hsp = num('c-hsp', 0.5, 10);
    const panel = num('c-panel', 10, 1500);
    const pr = num('c-pr', 0.5, 1);
    const tarifa = num('c-tarifa', 0, 100);

    const eDia = consumo !== null ? consumo / dias : null;
    pon('r-edia', eDia !== null ? `${f1.format(eDia)} kWh/día` : '—');

    if (eDia === null || hsp === null || panel === null || pr === null) {
      ['r-n', 'r-pfv', 'r-pinst', 'r-gen', 'r-valor'].forEach((id) => pon(id, '—'));
      const faltan = [];
      if (consumo === null) faltan.push('consumo');
      if (hsp === null) faltan.push('horas solares pico');
      if (panel === null) faltan.push('potencia del panel');
      if (pr === null) faltan.push('PR entre 0.5 y 1');
      pon('r-n-sub', `Falta: ${faltan.join(', ')}.`);
      return;
    }

    const pfv = eDia / (hsp * pr);                  // kW
    const n = Math.max(1, Math.ceil((pfv * 1000) / panel - 1e-9));
    const pinst = (n * panel) / 1000;               // kW
    const gen = pinst * hsp * pr;                   // kWh/día
    const cobertura = Math.min(gen, eDia);

    pon('r-n', f0.format(n));
    pon('r-n-sub', `de ${f0.format(panel)} W · cubren ${f0.format(Math.min(999, (100 * gen) / eDia))} % de tu consumo estimado`);
    pon('r-pfv', `${f2.format(pfv)} kW`);
    pon('r-pinst', `${f2.format(pinst)} kW`);
    pon('r-gen', `${f1.format(gen)} kWh/día`);
    pon('r-valor', tarifa !== null && tarifa > 0 ? mxn.format(cobertura * dias * tarifa) : 'Agrega tu tarifa en «Supuestos»');
  }

  form.addEventListener('input', calcula);
  form.addEventListener('change', calcula);
  form.addEventListener('submit', (e) => e.preventDefault());
  calcula();
})();
