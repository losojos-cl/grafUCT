// Motor de módulos generativos — p2. Sintético y determinista.
// Cada painter: (g, x, y, w, h, rnd, col, tt=0) dibuja en el rectángulo dado.
// tt = tiempo (ticks): morph interno de los datos; en tt=0 el resultado es
// idéntico al estático. motion(tipo, t, w, h) = desplazamiento rígido del
// módulo según su familia (rot / deriva X / deriva Y / shimmer).
// SOLO primitivas seguras para SVG: rect, circle, line, ellipse, arc,
// bezier (+ push/pop/translate/rotate). Sin texto, sin alfa, sin const p5.

const Modulo = (() => {
  const TAU = Math.PI * 2;
  const HPI = Math.PI / 2;

  const TIPOS = [
    'timeline', 'lineas', 'barras', 'areas', 'pastel', 'dispersion',
    'contorno', 'flujo', 'rosa', 'histograma', 'boxplot', 'tallo', 'calor',
  ];

  let AMP = 0.6; // cantidad de morph (0 = estático)

  // PRNG determinista (semilla → misma secuencia).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash 0..1 estable por índice (fases de animación).
  function hh(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // Oscilación con fase propia; en t=0 vale 0 (no altera el estático).
  function osc(t, sp, ph) {
    return Math.sin(t * sp) * Math.cos(ph * TAU);
  }

  // Caja interior con aire + ejes independientes (dm = lado menor).
  function caja(x, y, w, h) {
    const m = Math.min(w, h) * 0.1;
    return { bx: x + m, by: y + m, bw: w - m * 2, bh: h - m * 2, dm: Math.min(w, h) };
  }

  const painters = {
    // Líneas de tiempo comparativas: 2 series + puntos.
    timeline(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh, dm } = caja(x, y, w, h);
      g.strokeWeight(1);
      [col.p, col.q].forEach((c, k) => {
        const yb = by + bh * (0.3 + 0.4 * k);
        const dy = (i) => bh * 0.09 * AMP * osc(tt, 0.15, hh(i * 7 + k * 13 + 1));
        let px = bx, py = yb + (rnd() - 0.5) * bh * 0.2;
        g.stroke(c); g.noFill();
        for (let i = 1; i <= 4; i++) {
          const qx = bx + (bw * i) / 4, qy = yb + (rnd() - 0.5) * bh * 0.25 + dy(i);
          g.line(px, py, qx, qy);
          px = qx; py = qy;
        }
        g.noStroke(); g.fill(c);
        for (let i = 0; i <= 4; i++) {
          g.circle(bx + (bw * i) / 4, yb + (rnd() - 0.5) * bh * 0.25 + dy(i), dm * 0.05);
        }
      });
    },

    // Gráfico de líneas simple.
    lineas(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh, dm } = caja(x, y, w, h);
      const dy = (i) => bh * 0.1 * AMP * osc(tt, 0.14, hh(i * 3 + 5));
      g.strokeWeight(1); g.stroke(col.p); g.noFill();
      let px = bx, py = by + bh * rnd();
      for (let i = 1; i <= 5; i++) {
        const qx = bx + (bw * i) / 5, qy = by + bh * rnd() + dy(i);
        g.line(px, py, qx, qy);
        px = qx; py = qy;
      }
      g.noStroke(); g.fill(col.p);
      for (let i = 0; i <= 5; i++) g.circle(bx + (bw * i) / 5, by + bh * rnd() + dy(i), dm * 0.05);
    },

    // Barras (altura respira).
    barras(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh } = caja(x, y, w, h);
      const cols = [col.p, col.q, col.r];
      g.noStroke();
      for (let i = 0; i < 5; i++) {
        const base = 0.15 + 0.75 * rnd();
        const hb = base * (1 + AMP * 0.35 * osc(tt, 0.12, hh(i * 11 + 2)));
        const bw2 = (bw / 5) * 0.62, h = bh * Math.max(0.05, hb);
        g.fill(cols[i % 3]);
        g.rect(bx + (bw * (i + 0.5)) / 5 - bw2 / 2, by + bh - h, bw2, h);
      }
    },

    // Áreas apiladas (escalonadas, respiran).
    areas(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh } = caja(x, y, w, h);
      g.noStroke();
      for (let i = 0; i < 6; i++) {
        const k = 1 + AMP * 0.3 * osc(tt, 0.11, hh(i * 5 + 3));
        const h1 = bh * (0.2 + 0.4 * rnd()) * k, h2 = h1 + bh * (0.1 + 0.3 * rnd());
        const cw = bw / 6;
        g.fill(col.q);
        g.rect(bx + cw * i, by + bh - h1, cw + 0.5, h1);
        g.fill(col.p);
        g.rect(bx + cw * i, by + bh - h2, cw + 0.5, h2 - h1);
      }
    },

    // Pastel: anillo por sectores que rota lento.
    pastel(g, x, y, w, h, rnd, col, tt = 0) {
      const cx = x + w / 2, cy = y + h / 2, d = Math.min(w, h) * 0.82;
      const cols = [col.p, col.q, col.r, col.p];
      const fracs = [rnd(), rnd(), rnd(), rnd()];
      const tot = fracs[0] + fracs[1] + fracs[2] + fracs[3];
      g.noFill(); g.strokeWeight(d * 0.3);
      let a = -HPI + AMP * 0.8 * Math.sin(tt * 0.08);
      for (let i = 0; i < 4; i++) {
        g.stroke(cols[i]);
        g.arc(cx, cy, d, d, a, a + (fracs[i] / tot) * TAU);
        a += (fracs[i] / tot) * TAU;
      }
      g.strokeWeight(1);
    },

    // Dispersión (puntos a la deriva).
    dispersion(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh, dm } = caja(x, y, w, h);
      const cols = [col.p, col.q, col.r];
      g.noStroke();
      for (let i = 0; i < 14; i++) {
        const px = bx + rnd() * bw, py = by + rnd() * bh;
        const dx = dm * 0.06 * AMP * osc(tt, 0.2, hh(i * 17 + 1));
        const dyy = dm * 0.06 * AMP * osc(tt, 0.17, hh(i * 17 + 2));
        g.fill(cols[i % 3]);
        g.circle(px + dx, py + dyy, dm * (0.03 + 0.06 * rnd()));
      }
    },

    // Líneas de contorno: elipses que respiran.
    contorno(g, x, y, w, h, rnd, col, tt = 0) {
      const cx = x + w / 2, cy = y + h / 2;
      const k = 1 + AMP * 0.12 * Math.sin(tt * 0.1);
      g.noFill(); g.stroke(col.q); g.strokeWeight(1);
      for (let i = 1; i <= 4; i++) g.ellipse(cx, cy, (w * 0.9 * i) / 4 * k, (h * 0.9 * i) / 4 * k);
      g.noStroke(); g.fill(col.p);
      g.circle(cx + (rnd() - 0.5) * w * 0.2, cy + (rnd() - 0.5) * h * 0.2, Math.min(w, h) * 0.06);
    },

    // Flujo: cintas que ondulan.
    flujo(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh, dm } = caja(x, y, w, h);
      const cols = [col.p, col.q, col.r];
      g.noFill(); g.strokeWeight(dm * 0.035);
      for (let k = 0; k < 3; k++) {
        const yA = by + bh * (0.15 + 0.2 * k);
        const yB = by + bh * rnd() + bh * 0.15 * AMP * osc(tt, 0.12, hh(k * 29 + 4));
        g.stroke(cols[k]);
        g.bezier(bx, yA, bx + bw * 0.35, yA, bx + bw * 0.65, yB, bx + bw, yB);
      }
      g.strokeWeight(1);
    },

    // Rosa polar: radios que pulsan.
    rosa(g, x, y, w, h, rnd, col, tt = 0) {
      const cx = x + w / 2, cy = y + h / 2;
      const cols = [col.p, col.q, col.r];
      g.strokeWeight(Math.min(w, h) * 0.05);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const base = 0.25 + 0.75 * rnd();
        const len = (Math.min(w, h) * 0.44) * base * (1 + AMP * 0.4 * osc(tt, 0.13, hh(i * 13 + 6)));
        g.stroke(cols[i % 3]);
        g.line(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      }
      g.strokeWeight(1);
    },

    // Histograma: barras contiguas que respiran.
    histograma(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh } = caja(x, y, w, h);
      const hs = [];
      for (let i = 0; i < 7; i++) hs.push(0.1 + 0.8 * rnd() * rnd());
      const imax = hs.indexOf(Math.max(...hs));
      g.noStroke();
      for (let i = 0; i < 7; i++) {
        const hh2 = hs[i] * (1 + AMP * 0.3 * osc(tt, 0.12, hh(i * 7 + 8)));
        g.fill(i === imax ? col.r : col.p);
        g.rect(bx + (bw * i) / 7, by + bh - bh * hh2, bw / 7 + 0.5, bh * hh2);
      }
    },

    // Caja y bigotes (mediana que se desliza).
    boxplot(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh, dm } = caja(x, y, w, h);
      const cx = bx + bw / 2, bw2 = bw * 0.4;
      const q1 = by + bh * (0.25 + 0.2 * rnd());
      const q3 = q1 + bh * (0.15 + 0.25 * rnd());
      const med = q1 + (q3 - q1) * (rnd() * 0.6 + 0.2 + 0.2 * AMP * Math.sin(tt * 0.12));
      const lo = Math.max(by, q1 - bh * 0.25 * rnd()), hi = Math.min(by + bh, q3 + bh * 0.25 * rnd());
      g.stroke(col.q); g.strokeWeight(1);
      g.line(cx, lo, cx, hi);
      g.line(cx - bw2 / 3, lo, cx + bw2 / 3, lo);
      g.line(cx - bw2 / 3, hi, cx + bw2 / 3, hi);
      g.noFill(); g.stroke(col.p);
      g.rect(cx - bw2 / 2, q1, bw2, q3 - q1);
      g.stroke(col.r); g.strokeWeight(2);
      g.line(cx - bw2 / 2, med, cx + bw2 / 2, med);
      g.strokeWeight(1); g.noStroke(); g.fill(col.r);
      for (let i = 0; i < 2; i++) g.circle(bx + rnd() * bw, by + rnd() * bh, dm * 0.04);
    },

    // Tallo y hojas: marcas que pulsan.
    tallo(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh, dm } = caja(x, y, w, h);
      g.strokeWeight(1);
      for (let r = 0; r < 5; r++) {
        const yy = by + (bh * (r + 0.5)) / 5;
        g.stroke(col.q);
        g.line(bx, yy - bh * 0.06, bx, yy + bh * 0.06);
        g.noStroke(); g.fill(col.p);
        const k = 2 + Math.floor(rnd() * 6);
        for (let i = 0; i < k; i++) {
          const dd = dm * 0.045 * (1 + AMP * 0.5 * osc(tt, 0.16, hh(r * 31 + i * 3 + 9)));
          g.circle(bx + bw * 0.12 + rnd() * bw * 0.75, yy, dd);
        }
        g.strokeWeight(1);
      }
    },

    // Mapa de calor 4×4 que parpadea por tonos.
    calor(g, x, y, w, h, rnd, col, tt = 0) {
      const { bx, by, bw, bh } = caja(x, y, w, h);
      const cols = [col.p, col.q, col.r];
      g.noStroke();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const v = rnd() + AMP * 0.3 * osc(tt, 0.15, hh(r * 4 + c + 10));
        g.fill(v < 0.33 ? cols[2] : v < 0.66 ? cols[1] : cols[0]);
        g.rect(bx + (bw * c) / 4, by + (bh * r) / 4, bw / 4 + 0.5, bh / 4 + 0.5);
      }
    },
  };

  // Movimiento rígido del módulo según familia. En t=0 → ceros.
  function motion(tipo, t, w, h) {
    const fam = {
      pastel: 'rot', rosa: 'rot', contorno: 'rot',
      barras: 'udy', histograma: 'udy', areas: 'udy',
      lineas: 'udx', timeline: 'udx', flujo: 'udx',
    }[tipo] || 'shim';
    if (fam === 'rot') return { dx: 0, dy: 0, rot: 0.07 * Math.sin(t * 0.08) };
    if (fam === 'udy') return { dx: 0, dy: h * 0.025 * Math.sin(t * 0.15), rot: 0 };
    if (fam === 'udx') return { dx: w * 0.025 * Math.sin(t * 0.12), dy: 0, rot: 0 };
    return { dx: w * 0.01 * Math.sin(t * 0.3), dy: h * 0.01 * Math.sin(t * 0.27), rot: 0 };
  }

  // Reparto round-robin barajado: los 13 tipos aparecen parejos.
  function orden(n, seed) {
    const base = [];
    for (let i = 0; i < n; i++) base.push(TIPOS[i % TIPOS.length]);
    const rnd = mulberry32(seed);
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = base[i]; base[i] = base[j]; base[j] = t;
    }
    return base;
  }

  return {
    TIPOS, mulberry32, painters, orden, motion,
    get amp() { return AMP; },
    setAmp(a) { if (typeof a === 'number' && a >= 0) AMP = a; },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Modulo;
