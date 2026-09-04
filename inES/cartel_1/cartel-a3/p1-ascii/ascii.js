// Motor del campo ASCII — p1 (fondo negro, ASCII blanco).
// Puro JS, sin dependencia p5: el ruido se inyecta como parámetro.
// Coordenadas normalizadas: nx, ny en 0..1 sobre el formato A3.

const Ascii = (() => {
  const MOTTO = 'LOS DATOS NO SON NEUTROS: MUESTRAN LO QUE DECIDIMOS MEDIR. ';

  // Mapa de teclado (zona superior): [etiqueta, xFrac, yFrac].
  // Fracciones del formato; el escalonado imita la referencia.
  const KEYBOARD = [
    [['esc', 0.30, 0.055], ['F1', 0.41, 0.055], ['F2', 0.46, 0.055], ['F4', 0.52, 0.055],
     ['F5', 0.57, 0.055], ['F6', 0.62, 0.055], ['F7', 0.67, 0.055], ['F8', 0.72, 0.055]],
    [['≤', 0.31, 0.095], ['§', 0.345, 0.095], ['!', 0.40, 0.095], ['"', 0.45, 0.095],
     ['#', 0.50, 0.095], ['$', 0.55, 0.095], ['%', 0.60, 0.095], ['&', 0.65, 0.095],
     ['/', 0.70, 0.095], ['(', 0.75, 0.095]],
    [['Q', 0.36, 0.135], ['W', 0.41, 0.135], ['E', 0.46, 0.135], ['R', 0.51, 0.135],
     ['T', 0.56, 0.135], ['Y', 0.61, 0.135], ['U', 0.66, 0.135], ['I', 0.71, 0.135]],
    [['A', 0.375, 0.175], ['S', 0.425, 0.175], ['D', 0.475, 0.175], ['F', 0.525, 0.175],
     ['G', 0.575, 0.175], ['H', 0.625, 0.175], ['J', 0.675, 0.175], ['K', 0.725, 0.175]],
    [['Z', 0.40, 0.215], ['X', 0.45, 0.215], ['C', 0.50, 0.215], ['V', 0.55, 0.215],
     ['B', 0.60, 0.215], ['N', 0.65, 0.215], ['M', 0.70, 0.215]],
    [['space', 0.55, 0.27]],
  ];

  let seed = 1;
  let img = null; // { data: array 0..255, w, h }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  // Huella procedural: anillos concéntricos perturbados + máscara blob.
  // Centro del remolino aprox. donde la referencia concentra la masa.
  // tz = tercer eje del ruido: la deriva temporal (solo modo procedural).
  function field(nx, ny, noise, tz = 0) {
    const cx = 0.45, cy = 0.68;
    const dx = nx - cx, dy = (ny - cy) * 1.3;
    const r = Math.sqrt(dx * dx + dy * dy);
    const w = (noise(nx * 3 + seed * 0.7, ny * 3 - seed * 0.3, tz) - 0.5) * 0.35;
    const lines = 1 - Math.abs(Math.sin((r + w) * 55)); // 1 sobre la cresta
    const m = smooth(0.12, 0.55, noise(nx * 1.8 + seed * 1.3, ny * 1.8 + seed * 0.5, tz * 0.6));
    return clamp01(m * (0.30 + 0.70 * lines));
  }

  function sampleImage(nx, ny) {
    const x = Math.min(img.w - 1, Math.max(0, Math.floor(nx * img.w)));
    const y = Math.min(img.h - 1, Math.max(0, Math.floor(ny * img.h)));
    return clamp01(img.data[y * img.w + x] / 255);
  }

  return {
    MOTTO,
    KEYBOARD,
    get seed() { return seed; },
    setSeed(s) { seed = s; },
    hasImage() { return img !== null; },
    setImage(data, w, h) { img = { data, w, h }; },
    clearImage() { img = null; },

    // Valor del campo 0..1 (imagen si hay, si no procedural con deriva tz).
    sample(nx, ny, noise, tz = 0) {
      if (img) return sampleImage(nx, ny);
      return field(nx, ny, noise, tz);
    },

    // Frontera efectiva con barrido: base + amp·sin(2π·t/periodo).
    frontAt(base, amp, periodo, t) {
      return Math.min(0.6, Math.max(0.05, base + amp * Math.sin((2 * Math.PI * t) / periodo)));
    },

    // 0 = tecla legible … 1 = zona densa del lema.
    dissolve(ny, v, front, soft) {
      return smooth(front - soft, front + soft, ny * 0.55 + v * 0.55);
    },

    // Etiquetas de teclado mapeadas a celdas de una grilla cols×rows.
    keyboardSlots(cols, rows) {
      const seen = new Set();
      const out = [];
      for (const row of KEYBOARD) {
        for (const [t, xf, yf] of row) {
          const c = Math.round(xf * (cols - 1));
          const r = Math.round(yf * (rows - 1));
          const k = c + ':' + r;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({ c, r, t });
        }
      }
      return out;
    },

    // Carácter del lema para la celda (c, r): trama, no texto corrido.
    mottoChar(c, r) {
      return MOTTO[(c + r * 7) % MOTTO.length];
    },

    // Hash determinista 0..1 para jitter (estable entre redibujados).
    hash(c, r) {
      const s = Math.sin(c * 12.9898 + r * 78.233 + seed * 0.13) * 43758.5453;
      return s - Math.floor(s);
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Ascii;
