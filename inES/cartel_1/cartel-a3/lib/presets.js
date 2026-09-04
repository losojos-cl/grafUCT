// Presets de parámetros — localStorage + JSON portable.
// Un preset guarda SOLO parámetros (la imagen no viaja):
// mismo preset, otras imágenes.
// v2: { v: 2, nombre, params: { celda, umbral, frontera, suavidad,
//   semilla, modo, paletaIdx, tipoIdx, anim: {...}, prim: {...}, vista: {...} } }
// v1 sigue cargando (se normaliza: modo 'campo'→'huella' + defaults).

const Presets = (() => {
  const VERSION = 2;
  const KEY = 'p1-presets';

  const DEFAULT_PRIM = {
    uPunto: 0.62, dotMax: 1.1,
    scanCada: 3, scanLen: 6, scanProb: 0.5,
    sqDens: 0.08, sqMax: 0.5,
  };
  const DEFAULT_VISTA = { z: 1, ox: 0, oy: 0 };

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

  const num = (v, a, b) => typeof v === 'number' && v >= a && v <= b;

  function validarBase(q) {
    if (!num(q.celda, 1, 64)) return 'celda fuera de rango';
    if (!num(q.umbral, 0, 1)) return 'umbral fuera de rango';
    if (!num(q.frontera, 0, 1)) return 'frontera fuera de rango';
    if (!num(q.suavidad, 0, 1)) return 'suavidad fuera de rango';
    if (!Number.isInteger(q.semilla) || q.semilla < 1) return 'semilla inválida';
    if (!['campo', 'huella', 'retrato', 'imagen'].includes(q.modo)) return 'modo inválido';
    if (!Number.isInteger(q.paletaIdx) || q.paletaIdx < 0) return 'paleta inválida';
    if (!Number.isInteger(q.tipoIdx) || q.tipoIdx < 0) return 'tipo inválido';
    const a = q.anim || {};
    if (typeof a.on !== 'boolean') return 'anim.on inválido';
    if (!num(a.vel, 0, 1)) return 'anim.vel fuera de rango';
    if (!num(a.amp, 0, 0.5)) return 'anim.amp fuera de rango';
    if (!num(a.periodo, 1, 10000)) return 'anim.periodo fuera de rango';
    return null;
  }

  function validarPrim(p) {
    if (!num(p.uPunto, 0, 1)) return 'prim.uPunto fuera de rango';
    if (!num(p.dotMax, 0, 3)) return 'prim.dotMax fuera de rango';
    if (!Number.isInteger(p.scanCada) || p.scanCada < 1 || p.scanCada > 16) return 'prim.scanCada inválido';
    if (!num(p.scanLen, 0, 32)) return 'prim.scanLen fuera de rango';
    if (!num(p.scanProb, 0, 1)) return 'prim.scanProb fuera de rango';
    if (!num(p.sqDens, 0, 1)) return 'prim.sqDens fuera de rango';
    if (!num(p.sqMax, 0, 3)) return 'prim.sqMax fuera de rango';
    return null;
  }

  function validarVista(v) {
    if (!num(v.z, 0.2, 8)) return 'vista.z fuera de rango';
    if (!num(v.ox, -1, 1)) return 'vista.ox fuera de rango';
    if (!num(v.oy, -1, 1)) return 'vista.oy fuera de rango';
    return null;
  }

  function validar(p) {
    if (!p || typeof p !== 'object') return 'no es un objeto';
    if (p.v !== 1 && p.v !== 2) return `versión ${p.v} ≠ 1/2`;
    if (typeof p.nombre !== 'string' || !p.nombre.trim()) return 'sin nombre';
    const q = p.params || {};
    const err = validarBase(q);
    if (err) return err;
    if (p.v === 2) {
      return validarPrim(q.prim || {}) || validarVista(q.vista || {});
    }
    return null;
  }

  function normalizar(p) {
    if (validar(p)) return null;
    if (p.v === 2) return p;
    const params = { ...p.params };
    if (params.modo === 'campo') params.modo = 'huella';
    params.prim = { ...DEFAULT_PRIM };
    params.vista = { ...DEFAULT_VISTA };
    return { v: 2, nombre: p.nombre, params };
  }

  function leer() {
    try {
      const raw = store().getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.map(normalizar).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function escribir(arr) {
    store().setItem(KEY, JSON.stringify(arr));
  }

  return {
    VERSION,
    DEFAULT_PRIM,
    DEFAULT_VISTA,
    validar,
    normalizar,
    listar() { return leer(); },
    guardar(preset) {
      const err = validar(preset);
      if (err) return err;
      const n = normalizar(preset);
      const arr = leer().filter((p) => p.nombre !== n.nombre);
      arr.push(n);
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
        const n = normalizar(p);
        const i = arr.findIndex((q) => q.nombre === n.nombre);
        if (i >= 0) arr[i] = n; else arr.push(n);
        ok++;
      }
      escribir(arr);
      return { ok, errores };
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Presets;
