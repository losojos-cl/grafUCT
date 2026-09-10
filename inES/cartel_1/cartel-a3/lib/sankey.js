// Motor Sankey vertical — p3. Puro JS, sin p5 (testeable en Node).
// layout(seed, cfg) → estructura; frame(layout, t, cfg) → lista de ops:
//   { k:'bezier', pts:[x0,y0,x1,y1,x2,y2,x3,y3], w, c }  (cinta)
//   { k:'circle', x, y, d, c }                            (viajero)
//   { k:'line', x1, y1, x2, y2, c }                       (tick de estrato)
// Coordenadas normalizadas 0..1 (el sketch escala a A3).
// Sin texto. Determinista: mismo seed + mismo t → mismas ops.
// El movimiento es ERRAR POR RUIDO (no senos): deambula sin repetirse.
// El orden se rompe con 'soltura' (0 = retícula estricta … 1 = suelto).

const Sankey = (() => {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Ruido 1D suave (valor interpolado) para el errar.
  function h1(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function vnoise(x) {
    const i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return h1(i) * (1 - u) + h1(i + 1) * u;
  }

  // Punto de bezier cúbica en s.
  function cubic(p0, p1, p2, p3, s) {
    const u = 1 - s;
    const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  }

  const VIVOS = ['tinta', 'acento', 'suave', 'profundo'];

  // cfg: { nOrg, nHub, nDes, semilla, curva, anchoMax, viaDens, viaTam, soltura }
  function layout(cfg) {
    const rnd = mulberry32(cfg.semilla);
    const SOL = cfg.soltura == null ? 0.7 : cfg.soltura;

    const fila = (n, y, jy) => {
      const xs = [];
      for (let i = 0; i < n; i++) {
        const bx = 0.08 + 0.84 * (n === 1 ? 0.5 : i / (n - 1));
        xs.push(bx + (rnd() - 0.5) * (0.02 + 0.1 * SOL));
      }
      return xs.map((x) => ({
        x: Math.min(0.96, Math.max(0.04, x)),
        y: y + (rnd() - 0.5) * jy * SOL,
        tl: 0.5 + rnd(), // largo de tick propio
      }));
    };

    const org = fila(cfg.nOrg, 0, 0); // pegado al borde superior
    const hub = fila(cfg.nHub, 0.5, 0.16);
    const des = fila(cfg.nDes, 1, 0); // pegado al borde inferior

    // Enlaces: orígenes→1-3 hubs, hubs→2-5 destinos. Valores sesgados
    // (potencia): pocas cintas gruesas dominan, muchas finas.
    const todo = [];
    const mk = (de, a, i, j) => ({
      de, a, i, j,
      v: 0.1 + 0.9 * Math.pow(rnd(), 2.2),
      ph: rnd(),
      ck: 0.6 + 0.8 * rnd(), // curva propia por cinta
      ci: todo.length,
    });
    org.forEach((o, i) => {
      const k = 1 + Math.floor(rnd() * 3);
      const usados = new Set();
      for (let j = 0; j < k; j++) {
        const h = Math.floor(rnd() * hub.length);
        if (usados.has(h)) continue;
        usados.add(h);
        todo.push(mk('o', 'h', i, h));
      }
    });
    hub.forEach((h, i) => {
      const k = 2 + Math.floor(rnd() * 4);
      const usados = new Set();
      for (let j = 0; j < k; j++) {
        const d = Math.floor(rnd() * des.length);
        if (usados.has(d)) continue;
        usados.add(d);
        todo.push(mk('h', 'd', i, d));
      }
    });

    // Origen i → hub j; hub i → destino j.
    const conPuntos = todo.map((e) => {
      const p0 = e.de === 'o' ? org[e.i] : hub[e.i];
      const p1 = e.a === 'h' ? hub[e.j] : des[e.j];
      return { ...e, p0, p1 };
    });

    return { org, hub, des, enlaces: conPuntos };
  }

  // t en ticks. cfg suma: { curva, anchoMax, viaDens, viaTam, vel, amp }.
  function frame(L, t, cfg) {
    const ops = [];

    // Sin ticks: solo cintas + viajeros.

    L.enlaces.forEach((e) => {
      const dy = e.p1.y - e.p0.y;
      // Errar por ruido: deriva de controles + respiro de anchos.
      const drift = cfg.amp * 0.05 * (vnoise(t * 0.04 + e.ph * 13.7) - 0.5) * 2;
      const resp = (vnoise(t * 0.06 + e.ph * 29.3 + 50) - 0.5) * 2;
      const c1 = [e.p0.x + drift, e.p0.y + dy * cfg.curva * e.ck];
      const c2 = [e.p1.x - drift, e.p1.y - dy * cfg.curva * e.ck];
      const w = cfg.anchoMax * (0.15 + 0.85 * e.v) * (1 + cfg.amp * 0.3 * resp);
      const color = VIVOS[e.ci % VIVOS.length];
      ops.push({ k: 'bezier', pts: [e.p0.x, e.p0.y, c1[0], c1[1], c2[0], c2[1], e.p1.x, e.p1.y], w: Math.max(0.001, w), c: color });

      // Viajeros en color fondo: pulsos que recorren la cinta (avance lineal).
      const nv = Math.max(0, Math.round(cfg.viaDens * 3));
      for (let k = 0; k < nv; k++) {
        const s = ((t * cfg.vel * (0.02 + 0.02 * e.v) + e.ph + k / Math.max(1, nv)) % 1 + 1) % 1;
        const [px, py] = cubic([e.p0.x, e.p0.y], c1, c2, [e.p1.x, e.p1.y], s);
        ops.push({ k: 'circle', x: px, y: py, d: Math.max(0.002, w * cfg.viaTam), c: 'fondo' });
      }
    });

    return ops;
  }

  return { mulberry32, cubic, vnoise, layout, frame, VIVOS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sankey;
