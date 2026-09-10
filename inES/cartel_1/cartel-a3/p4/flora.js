// Motor vegetal — p4. Usa el layout de lib/sankey.js (global Sankey).
// frame(L, t, cfg) → lista de ops (coords normalizadas 0..1):
//   tallos cónicos (cuentas), hojas (elipse rotada), flores/frutos,
//   anillos en hubs, savia viajera. Sin texto. Determinista.
// cfg: { curva, anchoMax, hojas, florTam, viaDens, viaTam, vel, amp }

const Flora = (() => {
  const TAU = Math.PI * 2;
  const N = 22; // cuentas por tallo

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function curva(e, cfg, t) {
    const dy = e.p1.y - e.p0.y;
    const drift = cfg.amp * 0.05 * (Sankey.vnoise(t * 0.04 + e.ph * 13.7) - 0.5) * 2;
    const resp = (Sankey.vnoise(t * 0.06 + e.ph * 29.3 + 50) - 0.5) * 2;
    const c1 = [e.p0.x + drift, e.p0.y + dy * cfg.curva * e.ck];
    const c2 = [e.p1.x - drift, e.p1.y - dy * cfg.curva * e.ck];
    const w = cfg.anchoMax * (0.15 + 0.85 * e.v) * (1 + cfg.amp * 0.3 * resp);
    return { c1, c2, w: Math.max(0.001, w) };
  }

  function frame(L, t, cfg) {
    const ops = [];

    const sumDes = {};
    L.enlaces.forEach((e) => { if (e.a === 'd') sumDes[e.j] = (sumDes[e.j] || 0) + e.v; });
    const maxSum = Math.max(0.001, ...Object.values(sumDes));

    L.enlaces.forEach((e) => {
      const { c1, c2, w } = curva(e, cfg, t);
      const P = [];
      for (let i = 0; i <= N; i++) {
        P.push(Sankey.cubic([e.p0.x, e.p0.y], c1, c2, [e.p1.x, e.p1.y], i / N));
      }
      const color = Sankey.VIVOS[e.ci % Sankey.VIVOS.length];
      const leafC = Sankey.VIVOS[(e.ci + 1) % Sankey.VIVOS.length];

      // Tallo: cuentas cónicas (grueso en origen → fino en destino).
      for (let i = 0; i <= N; i++) {
        const dia = w * (1 - 0.8 * (i / N));
        if (dia < 0.0015) continue;
        ops.push({ k: 'circle', x: P[i][0], y: P[i][1], d: dia, c: color });
      }

      // Hojas alternadas (elipse rotada sobre la tangente).
      for (let i = 3; i < N; i += 4) {
        if (hash(e.ci * 131 + i * 17) > cfg.hojas) continue;
        const tang = Math.atan2(P[i + 1][1] - P[i - 1][1], P[i + 1][0] - P[i - 1][0]);
        const side = i % 8 === 3 ? 1 : -1;
        const sway = cfg.amp * 0.25 * Math.sin(t * 0.12 + e.ph * TAU);
        const ang = tang + side * (0.65 + 0.3 * hash(e.ci * 57 + i)) + sway;
        const len = w * 2.4 * (0.7 + 0.6 * hash(e.ci * 91 + i * 3));
        ops.push({ k: 'push' });
        ops.push({ k: 'translate', x: P[i][0], y: P[i][1] });
        ops.push({ k: 'rotate', a: ang });
        ops.push({ k: 'ellipse', x: len * 0.5, y: 0, w: len, h: len * 0.45, c: leafC, f: 1 });
        ops.push({ k: 'pop' });
      }

      // Savia en color fondo.
      const nv = Math.max(0, Math.round(cfg.viaDens * 2));
      for (let k = 0; k < nv; k++) {
        const s = ((t * cfg.vel * (0.02 + 0.02 * e.v) + e.ph + k / Math.max(1, nv)) % 1 + 1) % 1;
        const fidx = s * N, i0 = Math.min(N - 1, Math.floor(fidx)), fr = fidx - i0;
        ops.push({
          k: 'circle',
          x: P[i0][0] + (P[i0 + 1][0] - P[i0][0]) * fr,
          y: P[i0][1] + (P[i0 + 1][1] - P[i0][1]) * fr,
          d: Math.max(0.002, w * 0.3 * cfg.viaTam),
          c: 'fondo',
        });
      }
    });

    // Hubs: anillos ∝ flujo pasante.
    const hubSum = {};
    L.enlaces.forEach((e) => {
      const key = e.de === 'o' ? e.j : e.i;
      hubSum[key] = (hubSum[key] || 0) + e.v;
    });
    const maxHub = Math.max(0.001, ...Object.values(hubSum));
    L.hub.forEach((p, i) => {
      const dia = 0.02 + 0.035 * ((hubSum[i] || 0) / maxHub);
      ops.push({ k: 'ellipse', x: p.x, y: p.y, w: dia, h: dia, c: 'tinta', f: 0 });
    });

    // Destinos: flor (pétalos) o fruto (círculo).
    L.des.forEach((p, i) => {
      const s = (sumDes[i] || 0) / maxSum;
      const base = (0.03 + 0.05 * s) * cfg.florTam;
      if (hash(i * 77 + 5) < 0.5) {
        const rot0 = cfg.amp * 0.5 * Math.sin(t * 0.06 + i);
        const fc = Sankey.VIVOS[(i + 2) % Sankey.VIVOS.length];
        for (let k = 0; k < 6; k++) {
          ops.push({ k: 'push' });
          ops.push({ k: 'translate', x: p.x, y: p.y });
          ops.push({ k: 'rotate', a: rot0 + (k / 6) * TAU });
          ops.push({ k: 'ellipse', x: base * 0.55, y: 0, w: base * 1.1, h: base * 0.5, c: fc, f: 1 });
          ops.push({ k: 'pop' });
        }
        ops.push({ k: 'circle', x: p.x, y: p.y, d: base * 0.35, c: 'tinta' });
      } else {
        ops.push({ k: 'circle', x: p.x, y: p.y, d: base, c: Sankey.VIVOS[(i + 1) % Sankey.VIVOS.length] });
      }
    });

    return ops;
  }

  return { frame };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Flora;
