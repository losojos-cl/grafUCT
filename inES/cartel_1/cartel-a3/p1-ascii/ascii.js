// Motor del campo ASCII — p1 (fondo negro, ASCII blanco).
// Puro JS, sin dependencia p5: el ruido se inyecta como parámetro.
// Coordenadas normalizadas: nx, ny en 0..1 sobre el formato A3.

const Ascii = (() => {
  const MOTTO = 'LOS DATOS NO SON NEUTROS: MUESTRAN LO QUE DECIDIMOS MEDIR. ';

  // Subtítulo del afiche (zona superior legible). Fijo en código.
  const SUBTITULO = 'TERCERA ENCUESTA DE BRECHAS Y DESIGUALDADES DE GÉNERO UNIVERSIDAD CATÓLICA DE TEMUCO';

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
    SUBTITULO,
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

    // Frontera efectiva con errar azaroso: base + amp·ruido(t).
    // No es periódica (a diferencia del seno): deambula sin repetirse.
    // periodo = escala temporal (mayor → errar más lento). Determinista.
    frontAt(base, amp, periodo, t, noise) {
      const rate = 4.8 / Math.max(1, periodo);
      const w = (noise(t * rate + seed * 1.7, seed * 0.9) - 0.5) * 2; // -1..1
      return Math.min(0.6, Math.max(0.05, base + amp * w));
    },

    // 0 = subtítulo legible … 1 = zona densa del lema.
    dissolve(ny, v, front, soft) {
      return smooth(front - soft, front + soft, ny * 0.55 + v * 0.55);
    },

    // Subtítulo fluyendo en la grilla superior: word-wrap codicioso
    // (sin partir palabras), centrado por línea. → [{ c, r, ch }]
    subtitleSlots(cols, rows) {
      const margin = Math.max(2, Math.floor(cols * 0.08));
      const usable = cols - margin * 2;
      const words = SUBTITULO.split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        const cand = line ? line + ' ' + w : w;
        if (cand.length <= usable) {
          line = cand;
        } else {
          if (line) lines.push(line);
          line = w;
        }
      }
      if (line) lines.push(line);
      const out = [];
      const r0 = Math.max(2, Math.round(rows * 0.03));
      lines.forEach((ln, i) => {
        const start = margin + Math.floor((usable - ln.length) / 2);
        [...ln].forEach((ch, k) => {
          out.push({ c: start + k, r: r0 + i, ch });
        });
      });
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
