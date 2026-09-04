// Motor Sankey vertical — p3. Puro JS, sin p5 (testeable en Node).
// layout(seed, cfg) → estructura; frame(layout, t, cfg) → lista de ops:
//   { k:'bezier', pts:[x0,y0,x1,y1,x2,y2,x3,y3], w, c }  (cinta)
//   { k:'circle', x, y, d, c }                            (viajero)
//   { k:'line', x1, y1, x2, y2, c }                       (tick de estrato)
// Coordenadas normalizadas 0..1 (el sketch escala a A3).
// Sin texto. Determinista: mismo seed + mismo t → mismas ops.

const Sankey = (() => {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Punto de bezier cúbica en s.
  function cubic(p0, p1, p2, p3, s) {
    const u = 1 - s;
    const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  }

  const VIVOS = ['tinta', 'acento', 'suave', 'profundo'];

  // cfg: { nOrg, nHub, nDes, semilla, curva, anchoMax, viaDens, viaTam }
  function layout(cfg) {
    const rnd = mulberry32(cfg.semilla);
    const fr = (a, b) => a + rnd() * (b - a);

    const fila = (n, y) => {
      const xs = [];
      for (let i = 0; i < n; i++) xs.push(0.08 + (0.84 * (n === 1 ? 0.5 : i / (n - 1))) + (rnd() - 0.5) * 0.05);
      return xs.map((x) => ({ x: Math.min(0.96, Math.max(0.04, x)), y }));
    };

    const org = fila(cfg.nOrg, 0.1);
    const hub = fila(cfg.nHub, 0.5);
    const des = fila(cfg.nDes, 0.9);

    // Enlaces origen→hub (1-2 por origen) y hub→destino (reparto).
    const enlaces = [];
    const aHub = org.map(() => []);
    org.forEach((o, i) => {
      const k = 1 + Math.floor(rnd() * 2);
      for (let j = 0; j < k; j++) {
        const h = Math.floor(rnd() * hub.length);
        if (!aHub[i].includes(h)) aHub[i].push(h);
        enlaces.push({ de: ['o', i], a: ['h', h], v: 0.15 + 0.85 * rnd(), ph: rnd() });
      }
    });
    hub.forEach((h, i) => {
      const k = 1 + Math.floor(rnd() * 3);
      const usados = new Set();
      for (let j = 0; j < k; j++) {
        const d = Math.floor(rnd() * des.length);
        if (usados.has(d)) continue;
        usados.add(d);
        enlaces.push({ de: ['h', i], a: ['d', d], v: 0.15 + 0.85 * rnd(), ph: rnd() });
      }
    });

    const pt = (ref) => (ref[0] === 'o' ? org[ref[1]] : ref[0] === 'h' ? hub[ref[1]] : des[ref[1]]);
    return { org, hub, des, enlaces: enlaces.map((e, i) => ({ ...e, p0: pt(e.de), p1: pt(e.a), ci: i })) };
  }

  // t en ticks. cfg suma: { curva, anchoMax, viaDens, viaTam, vel, amp }.
  function frame(L, t, cfg) {
    const ops = [];
    const TAU = Math.PI * 2;

    // Ticks de estrato (líneas cortas).
    const tick = (p) => {
      ops.push({ k: 'line', x1: p.x - 0.02, y1: p.y, x2: p.x + 0.02, y2: p.y, c: 'tinta' });
    };
    L.org.forEach(tick);
    L.hub.forEach(tick);
    L.des.forEach(tick);

    L.enlaces.forEach((e) => {
      const dy = e.p1.y - e.p0.y;
      const drift = cfg.amp * 0.03 * Math.sin(t * 0.1 + e.ph * TAU);
      const c1 = [e.p0.x + drift, e.p0.y + dy * cfg.curva];
      const c2 = [e.p1.x - drift, e.p1.y - dy * cfg.curva];
      const w = cfg.anchoMax * (0.15 + 0.85 * e.v) * (1 + cfg.amp * 0.25 * Math.sin(t * 0.13 + e.ph * TAU));
      const color = VIVOS[e.ci % VIVOS.length];
      ops.push({ k: 'bezier', pts: [e.p0.x, e.p0.y, c1[0], c1[1], c2[0], c2[1], e.p1.x, e.p1.y], w: Math.max(0.001, w), c: color });

      // Viajeros en color fondo: pulsos que recorren la cinta.
      const nv = Math.max(0, Math.round(cfg.viaDens * 3));
      for (let k = 0; k < nv; k++) {
        const s = ((t * cfg.vel * (0.02 + 0.02 * e.v) + e.ph + k / Math.max(1, nv)) % 1 + 1) % 1;
        const [px, py] = cubic([e.p0.x, e.p0.y], c1, c2, [e.p1.x, e.p1.y], s);
        ops.push({ k: 'circle', x: px, y: py, d: Math.max(0.002, w * cfg.viaTam), c: 'fondo' });
      }
    });

    return ops;
  }

  return { mulberry32, cubic, layout, frame, VIVOS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sankey;
