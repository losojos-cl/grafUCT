// Motor de módulos generativos — p2. Sintético y determinista.
// Cada painter: (g, x, y, s, rnd, col) dibuja dentro del cuadrado [x, y, s].
// SOLO primitivas seguras para SVG: rect, circle, line, ellipse, arc, bezier.
// Sin texto, sin alfa, sin constantes p5 (módulo puro, testeable en Node).

const Modulo = (() => {
  const TAU = Math.PI * 2;
  const HPI = Math.PI / 2;

  const TIPOS = [
    'timeline', 'lineas', 'barras', 'areas', 'pastel', 'dispersion',
    'contorno', 'flujo', 'rosa', 'histograma', 'boxplot', 'tallo', 'calor',
  ];

  // PRNG determinista (semilla → misma secuencia).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const f = (rnd, a, b) => a + rnd() * (b - a);

  const painters = {
    // Líneas de tiempo comparativas: 2 series + puntos.
    timeline(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      g.strokeWeight(1);
      [col.p, col.q].forEach((c, k) => {
        const yb = by + bs * (0.3 + 0.4 * k);
        let px = bx, py = yb + (rnd() - 0.5) * bs * 0.2;
        g.stroke(c); g.noFill();
        for (let i = 1; i <= 4; i++) {
          const qx = bx + (bs * i) / 4, qy = yb + (rnd() - 0.5) * bs * 0.25;
          g.line(px, py, qx, qy);
          px = qx; py = qy;
        }
        g.noStroke(); g.fill(c);
        for (let i = 0; i <= 4; i++) {
          g.circle(bx + (bs * i) / 4, yb + (rnd() - 0.5) * bs * 0.25, s * 0.05);
        }
      });
    },

    // Gráfico de líneas simple.
    lineas(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      g.strokeWeight(1); g.stroke(col.p); g.noFill();
      let px = bx, py = by + bs * rnd();
      for (let i = 1; i <= 5; i++) {
        const qx = bx + (bs * i) / 5, qy = by + bs * rnd();
        g.line(px, py, qx, qy);
        px = qx; py = qy;
      }
      g.noStroke(); g.fill(col.p);
      for (let i = 0; i <= 5; i++) g.circle(bx + (bs * i) / 5, by + bs * rnd(), s * 0.05);
    },

    // Barras.
    barras(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      const cols = [col.p, col.q, col.r];
      g.noStroke();
      for (let i = 0; i < 5; i++) {
        const w = (bs / 5) * 0.62, h = bs * (0.15 + 0.75 * rnd());
        g.fill(cols[i % 3]);
        g.rect(bx + (bs * (i + 0.5)) / 5 - w / 2, by + bs - h, w, h);
      }
    },

    // Áreas apiladas (escalonadas).
    areas(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      g.noStroke();
      for (let i = 0; i < 6; i++) {
        const w = bs / 6, h1 = bs * (0.2 + 0.4 * rnd()), h2 = h1 + bs * (0.1 + 0.3 * rnd());
        g.fill(col.q);
        g.rect(bx + w * i, by + bs - h1, w + 0.5, h1);
        g.fill(col.p);
        g.rect(bx + w * i, by + bs - h2, w + 0.5, h2 - h1);
      }
    },

    // Pastel: anillo por sectores (trazo grueso, sin modo PIE).
    pastel(g, x, y, s, rnd, col) {
      const cx = x + s / 2, cy = y + s / 2, d = s * 0.72;
      const cols = [col.p, col.q, col.r, col.p];
      const fracs = [rnd(), rnd(), rnd(), rnd()];
      const tot = fracs[0] + fracs[1] + fracs[2] + fracs[3];
      g.noFill(); g.strokeWeight(d * 0.3);
      let a = -HPI;
      for (let i = 0; i < 4; i++) {
        g.stroke(cols[i]);
        g.arc(cx, cy, d, d, a, a + (fracs[i] / tot) * TAU);
        a += (fracs[i] / tot) * TAU;
      }
      g.strokeWeight(1);
    },

    // Dispersión.
    dispersion(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      const cols = [col.p, col.q, col.r];
      g.noStroke();
      for (let i = 0; i < 14; i++) {
        g.fill(cols[i % 3]);
        g.circle(bx + rnd() * bs, by + rnd() * bs, s * (0.03 + 0.06 * rnd()));
      }
    },

    // Líneas de contorno: elipses concéntricas.
    contorno(g, x, y, s, rnd, col) {
      const cx = x + s / 2, cy = y + s / 2;
      g.noFill(); g.stroke(col.q); g.strokeWeight(1);
      for (let i = 1; i <= 4; i++) g.ellipse(cx, cy, (s * 0.9 * i) / 4, (s * 0.9 * i) / 4);
      g.noStroke(); g.fill(col.p);
      g.circle(cx + (rnd() - 0.5) * s * 0.2, cy + (rnd() - 0.5) * s * 0.2, s * 0.06);
    },

    // Flujo: cintas bezier.
    flujo(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      const cols = [col.p, col.q, col.r];
      g.noFill(); g.strokeWeight(s * 0.035);
      for (let k = 0; k < 3; k++) {
        const yA = by + bs * (0.15 + 0.2 * k), yB = by + bs * rnd();
        g.stroke(cols[k]);
        g.bezier(bx, yA, bx + bs * 0.35, yA, bx + bs * 0.65, yB, bx + bs, yB);
      }
      g.strokeWeight(1);
    },

    // Rosa polar: radios con trazo grueso.
    rosa(g, x, y, s, rnd, col) {
      const cx = x + s / 2, cy = y + s / 2;
      const cols = [col.p, col.q, col.r];
      g.strokeWeight(s * 0.05);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU, len = (s * 0.44) * (0.25 + 0.75 * rnd());
        g.stroke(cols[i % 3]);
        g.line(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      }
      g.strokeWeight(1);
    },

    // Histograma: barras contiguas.
    histograma(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2;
      const hs = [];
      for (let i = 0; i < 7; i++) hs.push(0.1 + 0.8 * rnd() * rnd());
      const imax = hs.indexOf(Math.max(...hs));
      g.noStroke();
      for (let i = 0; i < 7; i++) {
        g.fill(i === imax ? col.r : col.p);
        g.rect(bx + (bs * i) / 7, by + bs - bs * hs[i], bs / 7 + 0.5, bs * hs[i]);
      }
    },

    // Caja y bigotes.
    boxplot(g, x, y, s, rnd, col) {
      const m = s * 0.12, bx = x + m, by = y + m, bs = s - m * 2;
      const cx = bx + bs / 2, bw = bs * 0.4;
      const q1 = by + bs * (0.25 + 0.2 * rnd());
      const q3 = q1 + bs * (0.15 + 0.25 * rnd());
      const med = q1 + (q3 - q1) * rnd();
      const lo = Math.max(by, q1 - bs * 0.25 * rnd()), hi = Math.min(by + bs, q3 + bs * 0.25 * rnd());
      g.stroke(col.q); g.strokeWeight(1);
      g.line(cx, lo, cx, hi);
      g.line(cx - bw / 3, lo, cx + bw / 3, lo);
      g.line(cx - bw / 3, hi, cx + bw / 3, hi);
      g.noFill(); g.stroke(col.p);
      g.rect(cx - bw / 2, q1, bw, q3 - q1);
      g.stroke(col.r); g.strokeWeight(2);
      g.line(cx - bw / 2, med, cx + bw / 2, med);
      g.strokeWeight(1); g.noStroke(); g.fill(col.r);
      for (let i = 0; i < 2; i++) g.circle(bx + rnd() * bs, by + rnd() * bs, s * 0.04);
    },

    // Tallo y hojas (abstracto): tallos + marcas.
    tallo(g, x, y, s, rnd, col) {
      const m = s * 0.12, bx = x + m, by = y + m, bs = s - m * 2;
      g.strokeWeight(1);
      for (let r = 0; r < 5; r++) {
        const yy = by + (bs * (r + 0.5)) / 5;
        g.stroke(col.q);
        g.line(bx, yy - bs * 0.06, bx, yy + bs * 0.06);
        g.noStroke(); g.fill(col.p);
        const k = 2 + Math.floor(rnd() * 6);
        for (let i = 0; i < k; i++) g.circle(bx + bs * 0.12 + rnd() * bs * 0.75, yy, s * 0.045);
        g.strokeWeight(1);
      }
    },

    // Mapa de calor 4×4 en 3 tonos (sin alfa).
    calor(g, x, y, s, rnd, col) {
      const m = s * 0.1, bx = x + m, by = y + m, bs = s - m * 2, w = bs / 4;
      const cols = [col.p, col.q, col.r];
      g.noStroke();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const v = rnd();
        g.fill(v < 0.33 ? cols[2] : v < 0.66 ? cols[1] : cols[0]);
        g.rect(bx + w * c, by + w * r, w + 0.5, w + 0.5);
      }
    },
  };

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

  return { TIPOS, mulberry32, painters, orden };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Modulo;
