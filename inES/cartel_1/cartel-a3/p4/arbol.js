// Motor de árbol recursivo — p4. Puro JS (testeable en Node).
// crecer(semilla, cfg) → { ramas, brotes }.
// Rama: { x0,y0, x1,y1, w, prof, cat, ph }. Brote: { x, y, d, c }.
// frame(arbol, t, amp) → ops {line x0..w c} + {circle}.
// cfg: { troncos, profundidad, hijos (2..3), angulo, decaimiento, grosor }.
// Crece hacia arriba desde la base (y=1). Sin texto. Determinista.
// Sway por ruido (Sankey.vnoise, global lib/sankey.js): la copa se mueve
// más que el tronco; con amp=0 el frame es idéntico para todo t.

const Arbol = (() => {
  const VIVOS = ['tinta', 'acento', 'suave', 'profundo'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function crecer(semilla, cfg) {
    const rnd = mulberry32(semilla);
    const ramas = [], brotes = [];

    function rama(x0, y0, ang, len, w, prof, cat) {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      const ph = rnd();
      ramas.push({ x0, y0, x1, y1, w, prof, cat, ph });
      if (prof >= cfg.profundidad || w < 0.0008) {
        brotes.push({ ri: ramas.length - 1 }); // se resuelve tras encuadrar
        return;
      }
      const n = 2 + (rnd() < cfg.hijos - 2 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const spread = cfg.angulo * (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2);
        const na = ang + spread + (rnd() - 0.5) * cfg.angulo * 0.5;
        const nl = len * cfg.decaimiento * (0.85 + 0.3 * rnd());
        const ncat = rnd() < 0.25 ? Math.floor(rnd() * VIVOS.length) : cat;
        rama(x1, y1, na, nl, w * 0.62, prof + 1, ncat);
      }
    }

    for (let k = 0; k < cfg.troncos; k++) {
      const x0 = 0.5 + (cfg.troncos === 1 ? 0 : (k / (cfg.troncos - 1) - 0.5) * 0.5) + (rnd() - 0.5) * 0.05;
      rama(x0, 1.0, -Math.PI / 2 + (rnd() - 0.5) * 0.2, 0.34 * (0.8 + 0.4 * rnd()), cfg.grosor, 0, Math.floor(rnd() * VIVOS.length));
    }

    // Encuadre determinista: escala uniforme para llenar el formato,
    // base anclada abajo (y=1), copa con aire arriba. Preserva ángulos.
    const xs = [], ys = [];
    for (const r of ramas) { xs.push(r.x0, r.x1); ys.push(r.y0, r.y1); }
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs);
    const by0 = Math.min(...ys), by1 = Math.max(...ys);
    const sc = Math.min(0.88 / Math.max(1e-6, bx1 - bx0), 0.96 / Math.max(1e-6, by1 - by0));
    const tx = 0.06 + (0.88 - (bx1 - bx0) * sc) / 2 - bx0 * sc;
    const ty = 1.0 - by1 * sc;
    for (const r of ramas) {
      r.x0 = r.x0 * sc + tx; r.x1 = r.x1 * sc + tx;
      r.y0 = r.y0 * sc + ty; r.y1 = r.y1 * sc + ty;
      r.w *= sc;
    }
    for (const b of brotes) {
      // (se resuelven abajo desde ramas ya encuadradas)
    }
    const brotesF = brotes.map(({ ri }) => {
      const r = ramas[ri];
      return { x: r.x1, y: r.y1, d: Math.max(0.004, r.w * 2), c: VIVOS[r.cat] };
    });
    return { ramas, brotes: brotesF };
  }

  function frame(arbol, t, amp) {
    const ops = [];
    for (const r of arbol.ramas) {
      // Sway: lean horizontal ∝ profundidad (la copa se mueve, el tronco no).
      const sway = amp * (Sankey.vnoise(t * 0.05 + r.ph * 7.3) - 0.5) * 2 * (r.prof + 1) * 0.008;
      const wb = r.w * (1 + amp * 0.2 * Math.sin(t * 0.1 + r.ph * 6.283));
      ops.push({
        k: 'line',
        x0: r.x0 + sway * Math.max(0, r.prof - 1), y0: r.y0,
        x1: r.x1 + sway * r.prof, y1: r.y1,
        w: Math.max(0.0006, wb), c: VIVOS[r.cat],
      });
    }
    for (const b of arbol.brotes) {
      ops.push({ k: 'circle', x: b.x, y: b.y, d: b.d, c: b.c });
    }
    return ops;
  }

  return { VIVOS, mulberry32, crecer, frame };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Arbol;
