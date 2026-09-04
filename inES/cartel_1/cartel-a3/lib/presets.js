// Presets de parámetros — localStorage + JSON portable.
// Un preset guarda SOLO parámetros (la imagen no viaja):
// mismo preset, otras imágenes.
// Formato: { v: 1, nombre, params: { celda, umbral, frontera, suavidad,
//   semilla, modo, paletaIdx, tipoIdx, anim: { on, vel, amp, periodo } } }

const Presets = (() => {
  const VERSION = 1;
  const KEY = 'p1-presets';

  // Sin localStorage (Node/tests, modo privado) → memoria volátil.
  const mem = {};
  function store() {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (e) { /* privado */ }
    return {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
    };
  }

  function validar(p) {
    if (!p || typeof p !== 'object') return 'no es un objeto';
    if (p.v !== VERSION) return `versión ${p.v} ≠ ${VERSION}`;
    if (typeof p.nombre !== 'string' || !p.nombre.trim()) return 'sin nombre';
    const q = p.params || {};
    const num = (v, a, b) => typeof v === 'number' && v >= a && v <= b;
    if (!num(q.celda, 1, 64)) return 'celda fuera de rango';
    if (!num(q.umbral, 0, 1)) return 'umbral fuera de rango';
    if (!num(q.frontera, 0, 1)) return 'frontera fuera de rango';
    if (!num(q.suavidad, 0, 1)) return 'suavidad fuera de rango';
    if (!Number.isInteger(q.semilla) || q.semilla < 1) return 'semilla inválida';
    if (q.modo !== 'campo' && q.modo !== 'imagen') return 'modo inválido';
    if (!Number.isInteger(q.paletaIdx) || q.paletaIdx < 0) return 'paleta inválida';
    if (!Number.isInteger(q.tipoIdx) || q.tipoIdx < 0) return 'tipo inválido';
    const a = q.anim || {};
    if (typeof a.on !== 'boolean') return 'anim.on inválido';
    if (!num(a.vel, 0, 1)) return 'anim.vel fuera de rango';
    if (!num(a.amp, 0, 0.5)) return 'anim.amp fuera de rango';
    if (!num(a.periodo, 1, 10000)) return 'anim.periodo fuera de rango';
    return null;
  }

  function leer() {
    try {
      const raw = store().getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((p) => !validar(p)) : [];
    } catch (e) {
      return [];
    }
  }

  function escribir(arr) {
    store().setItem(KEY, JSON.stringify(arr));
  }

  return {
    VERSION,
    validar,
    listar() { return leer(); },
    guardar(preset) {
      const err = validar(preset);
      if (err) return err;
      const arr = leer().filter((p) => p.nombre !== preset.nombre);
      arr.push(preset);
      escribir(arr);
      return null;
    },
    eliminar(nombre) {
      escribir(leer().filter((p) => p.nombre !== nombre));
    },
    exportar() {
      return JSON.stringify({ v: VERSION, presets: leer() }, null, 2);
    },
    importar(json) {
      let doc;
      try {
        doc = JSON.parse(json);
      } catch (e) {
        return { ok: 0, errores: ['JSON inválido'] };
      }
      const lista = Array.isArray(doc) ? doc : doc.presets;
      if (!Array.isArray(lista)) return { ok: 0, errores: ['formato inválido'] };
      const arr = leer();
      let ok = 0;
      const errores = [];
      for (const p of lista) {
        const err = validar(p);
        if (err) { errores.push(`${p && p.nombre ? p.nombre : '?'}: ${err}`); continue; }
        const i = arr.findIndex((q) => q.nombre === p.nombre);
        if (i >= 0) arr[i] = p; else arr.push(p);
        ok++;
      }
      escribir(arr);
      return { ok, errores };
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Presets;
