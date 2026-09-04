// Sistema de temas compartido (paletas + tipografías) — usable desde
// cualquiera de las propuestas (p1, p2, p3).
//
// REGLA: los sketches usan ROLES (Tema.rol('tinta')), nunca hex directos.
// Así una paleta se prueba en cualquier propuesta cambiando un índice.
//
// Selección por triple vía: <select> del panel, atajos (C/T) y URL:
//   p1-ascii/?paleta=2&tipo=1
const Tema = (() => {
  const ROLES = ['fondo', 'tinta', 'suave', 'profundo', 'acento'];

  const PALETAS = [
    {
      nombre: 'Estándar B/N',
      colores: { fondo: '#111111', tinta: '#FAFAFA', suave: '#8A8A8A', profundo: '#3A3A3A', acento: '#FFFFFF' },
    },
    {
      nombre: 'Papel / Tinta',
      colores: { fondo: '#F4F1EA', tinta: '#1A1A1A', suave: '#8A8578', profundo: '#C9C3B4', acento: '#000000' },
    },
    {
      nombre: 'Noche / Señal',
      colores: { fondo: '#0B1E3A', tinta: '#EDE6D6', suave: '#5A7BA6', profundo: '#16305A', acento: '#E23B2E' },
    },
    {
      nombre: 'Melón',
      colores: { fondo: '#DDD5C7', tinta: '#272F38', suave: '#726F70', profundo: '#FED1BD', acento: '#DFEF87' },
    },
    {
      nombre: 'Orquídea',
      colores: { fondo: '#F3EAC3', tinta: '#464B65', suave: '#D2C4D6', profundo: '#CE785D', acento: '#CE5E9A' },
    },
    {
      nombre: 'Bauhaus',
      colores: { fondo: '#0061A3', tinta: '#F3C12C', suave: '#009B74', profundo: '#D29B83', acento: '#D979A2' },
    },
  ];

  // Familias genéricas: viajan bien en el SVG exportado (sin incrustación).
  const TIPOS = [
    { nombre: 'Monoespaciada', stack: 'monospace' },
    { nombre: 'Palo seco', stack: 'sans-serif' },
    { nombre: 'Serifada', stack: 'serif' },
  ];

  let paletaIdx = 0;
  let tipoIdx = 0;
  // Permutación rol→color: perm[i] = índice en ROLES del color que usa ROLES[i].
  // Permite barajar la disposición sin tocar las paletas. Viaja en presets.
  const PERM_ID = [0, 1, 2, 3, 4];
  let perm = [...PERM_ID];

  const clamp = (i, n) => ((i % n) + n) % n;

  function luminancia(hex) {
    const c = hex.replace('#', '');
    const f = (i) => {
      const v = parseInt(c.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
  }

  function contraste(a, b) {
    const l1 = luminancia(a), l2 = luminancia(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function permValido(p) {
    return Array.isArray(p) && p.length === ROLES.length &&
      p.every((v) => Number.isInteger(v) && v >= 0 && v < ROLES.length) &&
      new Set(p).size === ROLES.length;
  }

  function leerURL() {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.has('paleta')) paletaIdx = clamp(parseInt(q.get('paleta'), 10) || 0, PALETAS.length);
    if (q.has('tipo')) tipoIdx = clamp(parseInt(q.get('tipo'), 10) || 0, TIPOS.length);
  }

  function fijarURL() {
    if (typeof window === 'undefined' || !window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set('paleta', paletaIdx);
    url.searchParams.set('tipo', tipoIdx);
    window.history.replaceState(null, '', url.toString());
  }

  return {
    ROLES,
    PALETAS,
    TIPOS,
    PERM_ID,
    init() { leerURL(); },
    get paletaIdx() { return paletaIdx; },
    get tipoIdx() { return tipoIdx; },
    get paleta() { return PALETAS[paletaIdx]; },
    get tipo() { return TIPOS[tipoIdx]; },
    rol(r) { return PALETAS[paletaIdx].colores[ROLES[perm[ROLES.indexOf(r)]]]; },
    getPerm() { return [...perm]; },
    setPerm(p) { if (permValido(p)) perm = [...p]; },
    resetPerm() { perm = [...PERM_ID]; },
    // Baraja la disposición de colores con guardia de contraste fondo/tinta.
    barajar() {
      for (let intento = 0; intento < 20; intento++) {
        const p = [...PERM_ID];
        for (let i = p.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = p[i]; p[i] = p[j]; p[j] = t;
        }
        perm = p;
        if (contraste(this.rol('fondo'), this.rol('tinta')) >= 2.0) break;
      }
    },
    setPaleta(i) { paletaIdx = clamp(i, PALETAS.length); perm = [...PERM_ID]; fijarURL(); },
    setTipo(i) { tipoIdx = clamp(i, TIPOS.length); fijarURL(); },
    ciclarPaleta() { this.setPaleta(paletaIdx + 1); },
    ciclarTipo() { this.setTipo(tipoIdx + 1); },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Tema;
