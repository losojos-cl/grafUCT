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
  ];

  // Familias genéricas: viajan bien en el SVG exportado (sin incrustación).
  const TIPOS = [
    { nombre: 'Monoespaciada', stack: 'monospace' },
    { nombre: 'Palo seco', stack: 'sans-serif' },
    { nombre: 'Serifada', stack: 'serif' },
  ];

  let paletaIdx = 0;
  let tipoIdx = 0;

  const clamp = (i, n) => ((i % n) + n) % n;

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
    init() { leerURL(); },
    get paletaIdx() { return paletaIdx; },
    get tipoIdx() { return tipoIdx; },
    get paleta() { return PALETAS[paletaIdx]; },
    get tipo() { return TIPOS[tipoIdx]; },
    rol(r) { return PALETAS[paletaIdx].colores[r]; },
    setPaleta(i) { paletaIdx = clamp(i, PALETAS.length); fijarURL(); },
    setTipo(i) { tipoIdx = clamp(i, TIPOS.length); fijarURL(); },
    ciclarPaleta() { this.setPaleta(paletaIdx + 1); },
    ciclarTipo() { this.setTipo(tipoIdx + 1); },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Tema;
