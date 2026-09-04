// Presets de parámetros — localStorage + JSON portable.
// Esquemas por propuesta: p1 (v2, ASCII) y p2 (v1, módulos).
// La API de nivel superior ES el esquema p1 (compatibilidad total);
// cada propuesta tiene además su ámbito: Presets.p1 / Presets.p2.

const Presets = (() => {
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

  // ── Esquema p1 (v2; v1 se normaliza) ───────────────────
  function validarBaseP1(q) {
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

  function validarPrimP1(p) {
    if (!num(p.uPunto, 0, 1)) return 'prim.uPunto fuera de rango';
    if (!num(p.dotMax, 0, 3)) return 'prim.dotMax fuera de rango';
    if (!Number.isInteger(p.scanCada) || p.scanCada < 1 || p.scanCada > 16) return 'prim.scanCada inválido';
    if (!num(p.scanLen, 0, 32)) return 'prim.scanLen fuera de rango';
    if (!num(p.scanProb, 0, 1)) return 'prim.scanProb fuera de rango';
    if (!num(p.sqDens, 0, 1)) return 'prim.sqDens fuera de rango';
    if (!num(p.sqMax, 0, 3)) return 'prim.sqMax fuera de rango';
    return null;
  }

  function validarVistaP1(v) {
    if (!num(v.z, 0.2, 8)) return 'vista.z fuera de rango';
    if (!num(v.ox, -1, 1)) return 'vista.ox fuera de rango';
    if (!num(v.oy, -1, 1)) return 'vista.oy fuera de rango';
    return null;
  }

  function validarP1(p) {
    if (!p || typeof p !== 'object') return 'no es un objeto';
    if (p.v !== 1 && p.v !== 2) return `versión ${p.v} ≠ 1/2`;
    if (typeof p.nombre !== 'string' || !p.nombre.trim()) return 'sin nombre';
    const q = p.params || {};
    const err = validarBaseP1(q);
    if (err) return err;
    if (p.v === 2) {
      return validarPrimP1(q.prim || {}) || validarVistaP1(q.vista || {});
    }
    return null;
  }

  function normalizarP1(p) {
    if (validarP1(p)) return null;
    if (p.v === 2) return p;
    const params = { ...p.params };
    if (params.modo === 'campo') params.modo = 'huella';
    params.prim = { ...DEFAULT_PRIM };
    params.vista = { ...DEFAULT_VISTA };
    return { v: 2, nombre: p.nombre, params };
  }

  // ── Esquema p2 (v2; v1 se normaliza: +anim) ────────
  const DEFAULT_ANIM_P2 = { on: false, vel: 1, amp: 0.6 };

  function validarP2(p) {
    if (!p || typeof p !== 'object') return 'no es un objeto';
    if (p.v !== 1 && p.v !== 2) return `versión ${p.v} ≠ 1/2`;
    if (typeof p.nombre !== 'string' || !p.nombre.trim()) return 'sin nombre';
    const q = p.params || {};
    if (!Number.isInteger(q.cols) || q.cols < 1 || q.cols > 24) return 'cols inválido';
    if (!Number.isInteger(q.rows) || q.rows < 1 || q.rows > 24) return 'rows inválido';
    if (!Number.isInteger(q.semilla) || q.semilla < 1) return 'semilla inválida';
    if (!num(q.pad, 0, 0.6)) return 'pad fuera de rango';
    if (!Number.isInteger(q.paletaIdx) || q.paletaIdx < 0) return 'paleta inválida';
    if (p.v === 2) {
      const a = q.anim || {};
      if (typeof a.on !== 'boolean') return 'anim.on inválido';
      if (!num(a.vel, 0, 5)) return 'anim.vel fuera de rango';
      if (!num(a.amp, 0, 1)) return 'anim.amp fuera de rango';
    }
    return null;
  }

  function normalizarP2(p) {
    if (validarP2(p)) return null;
    if (p.v === 2) return p;
    const params = { ...p.params, anim: { ...DEFAULT_ANIM_P2 } };
    return { v: 2, nombre: p.nombre, params };
  }

  // ── Esquema p3 (v2; v1 se normaliza: +soltura) ──────
  function validarP3(p) {
    if (!p || typeof p !== 'object') return 'no es un objeto';
    if (p.v !== 1 && p.v !== 2) return `versión ${p.v} ≠ 1/2`;
    if (typeof p.nombre !== 'string' || !p.nombre.trim()) return 'sin nombre';
    const q = p.params || {};
    if (!Number.isInteger(q.nOrg) || q.nOrg < 1 || q.nOrg > 16) return 'nOrg inválido';
    if (!Number.isInteger(q.nHub) || q.nHub < 1 || q.nHub > 10) return 'nHub inválido';
    if (!Number.isInteger(q.nDes) || q.nDes < 1 || q.nDes > 24) return 'nDes inválido';
    if (!Number.isInteger(q.semilla) || q.semilla < 1) return 'semilla inválida';
    if (!num(q.curva, 0.01, 1.5)) return 'curva fuera de rango';
    if (!num(q.anchoMax, 0.001, 0.2)) return 'anchoMax fuera de rango';
    if (!num(q.viaDens, 0, 1)) return 'viaDens fuera de rango';
    if (!num(q.viaTam, 0.05, 2)) return 'viaTam fuera de rango';
    if (!Number.isInteger(q.paletaIdx) || q.paletaIdx < 0) return 'paleta inválida';
    if (p.v === 2 && !num(q.soltura, 0, 1)) return 'soltura fuera de rango';
    const a = q.anim || {};
    if (typeof a.on !== 'boolean') return 'anim.on inválido';
    if (!num(a.vel, 0, 5)) return 'anim.vel fuera de rango';
    if (!num(a.amp, 0, 1)) return 'anim.amp fuera de rango';
    return null;
  }

  function normalizarP3(p) {
    if (validarP3(p)) return null;
    if (p.v === 2) return p;
    const params = { ...p.params, soltura: 0.7 };
    return { v: 2, nombre: p.nombre, params };
  }

  // ── Factoría de ámbitos ────────────────────────────────
  function crearAmbito(key, version, validarDoc, normalizarDoc) {
    function leer() {
      try {
        const raw = store().getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        return arr.map(normalizarDoc).filter(Boolean);
      } catch (e) {
        return [];
      }
    }

    function escribir(arr) {
      store().setItem(key, JSON.stringify(arr));
    }

    return {
      VERSION: version,
      validar: validarDoc,
      normalizar: normalizarDoc,
      listar() { return leer(); },
      guardar(preset) {
        const err = validarDoc(preset);
        if (err) return err;
        const n = normalizarDoc(preset);
        const arr = leer().filter((p) => p.nombre !== n.nombre);
        arr.push(n);
        escribir(arr);
        return null;
      },
      eliminar(nombre) {
        escribir(leer().filter((p) => p.nombre !== nombre));
      },
      exportar() {
        return JSON.stringify({ v: version, presets: leer() }, null, 2);
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
          const err = validarDoc(p);
          if (err) { errores.push(`${p && p.nombre ? p.nombre : '?'}: ${err}`); continue; }
          const n = normalizarDoc(p);
          const i = arr.findIndex((q) => q.nombre === n.nombre);
          if (i >= 0) arr[i] = n; else arr.push(n);
          ok++;
        }
        escribir(arr);
        return { ok, errores };
      },
    };
  }

  const p1 = crearAmbito('p1-presets', 2, validarP1, normalizarP1);
  const p2 = crearAmbito('p2-presets', 2, validarP2, normalizarP2);
  const p3 = crearAmbito('p3-presets', 2, validarP3, normalizarP3);

  // Nivel superior = esquema p1 (p1/sketch.js no cambia).
  return { ...p1, DEFAULT_PRIM, DEFAULT_VISTA, p1, p2, p3 };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Presets;
