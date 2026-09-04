// P1 — Campo ASCII a sangre completa, formato A3.
// Subtítulo legible arriba → disolución → primitivos (puntos / lema /
// scanlines / cuadraditos) modulados por el campo (huella, retrato o imagen).
// Colores y fuente SIEMPRE vía Tema (roles); ?paleta=N&tipo=M por URL.
// Atajos: S guardar · C paleta · T tipo · R semilla · Espacio play/pausa.
//
// RENDER DUAL: preview animado en canvas 2D (rápido) + SVG oculto
// (createGraphics) solo para exportar a resolución real.
// La animación vive en pantalla; el SVG exporta el fotograma visible.

const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT; // ≈ 841.89
const H = 420 * MM_TO_PT; // ≈ 1190.55

const P = {
  celda: 9,
  umbral: 0.35,
  frontera: 0.30,
  suavidad: 0.18,
  semilla: 1,
  modo: 'huella', // 'huella' | 'retrato' | 'imagen'
  anim: { on: false, vel: 0.05, amp: 0.06, periodo: 240 },
  prim: { uPunto: 0.62, dotMax: 1.1, scanCada: 3, scanLen: 6, scanProb: 0.5, sqDens: 0.08, sqMax: 0.5 },
  vista: { z: 1, ox: 0, oy: 0 },
};

const T = { t: 0, tz: 0 }; // reloj de animación (ticks + eje de ruido)
const FPS_PREVIEW = 12; // techo al animar (canvas 2D lo sostiene)
const ruido2 = (x, y) => noise(x, y); // ruido 2D para el errar de la frontera

function setup() {
  Tema.init();
  const cnv = createCanvas(W, H); // 2D: preview rápido
  cnv.parent('lienzo');
  noLoop();
  Ascii.setSeed(P.semilla);
  Ascii.setCampo(P.modo);
  Ascii.setVista(P.vista);
  cablearPanel();
  syncPanel();
  renderListaPresets();
  sembrarDefecto();
}

// Presets de fábrica (repo): si no hay nada guardado, se importan
// y se aplica "version_01" como estado por defecto.
function sembrarDefecto() {
  if (Presets.listar().length) return;
  fetch('presets-defecto.json')
    .then((r) => { if (!r.ok) throw new Error('sin defecto'); return r.text(); })
    .then((txt) => {
      if (Presets.listar().length) return; // alguien guardó mientras tanto
      const res = Presets.importar(txt);
      renderListaPresets();
      const lista = Presets.listar();
      const alvo = lista.find((p) => p.nombre === 'version_01') || lista[0];
      if (alvo) aplicarEstado(alvo);
      print(`Presets de defecto: ${res.ok} importados · errores: ${res.errores.length}`);
    })
    .catch(() => print('Sin presets-defecto.json: se parte vacío'));
}

// Rutina única de dibujo sobre cualquier renderer (2D visible o SVG oculto).
// g === null → canvas principal; o = { celda, front, tz, semilla }.
// Devuelve conteo de nodos dibujados.
function renderar(g, o) {
  const R = g ? {
    background: (c) => g.background(c),
    noStroke: () => g.noStroke(),
    textFont: (f) => g.textFont(f),
    textAlign: (a, b) => g.textAlign(a, b),
    fill: (c) => g.fill(c),
    textSize: (s) => g.textSize(s),
    text: (t, x, y) => g.text(t, x, y),
    circle: (x, y, d) => g.circle(x, y, d),
    rect: (x, y, w, h) => g.rect(x, y, w, h),
  } : { background, fill, noStroke, textFont, textAlign, textSize, text, circle, rect };

  noiseSeed(o.semilla);
  R.background(Tema.rol('fondo'));
  R.textFont(Tema.tipo.stack);
  R.textAlign(CENTER, CENTER);
  R.noStroke();

  const cols = Math.floor(W / o.celda);
  const rows = Math.floor(H / o.celda);
  const n = (x, y) => noise(x, y, o.tz);
  const pr = P.prim;
  let nodos = 0;

  // ── Zona densa: cuadraditos + puntos + lema según banda ──
  for (let r = 0; r < rows; r++) {
    const ny = (r + 0.5) / rows;
    const y = (r + 0.5) * o.celda;
    for (let c = 0; c < cols; c++) {
      const nx = (c + 0.5) / cols;
      const x = (c + 0.5) * o.celda;
      const v = Ascii.sample(nx, ny, n, o.tz);

      // Cuadraditos dispersos (campo bajo, adicional a lo demás).
      if (v < Ascii.SQ_V && Ascii.hash(c + 57, r) < pr.sqDens) {
        const s = o.celda * pr.sqMax * (0.3 + 0.7 * Ascii.hash(c, r + 91));
        R.fill(Tema.rol('profundo'));
        R.rect(x - s / 2, y - s / 2, s, s);
        nodos++;
      }

      const d = Ascii.dissolve(ny, v, o.front, P.suavidad);
      if (d < P.umbral) continue;

      // Puntos (cara): diámetro ∝ campo.
      if (v >= pr.uPunto) {
        const dia = o.celda * pr.dotMax * (0.25 + 0.75 * v);
        if (dia < 0.5) continue;
        R.fill(Tema.rol('tinta'));
        R.circle(x, y, dia);
        nodos++;
        continue;
      }

      // Lema (trama textual).
      R.fill(v > 0.66 ? Tema.rol('tinta') : Tema.rol('suave'));
      R.textSize(o.celda * (0.4 + v * 0.75));
      R.text(Ascii.mottoChar(c, r), x, y);
      nodos++;
    }
  }

  // ── Scanlines: segmentos horizontales fragmentados ──
  R.fill(Tema.rol('suave'));
  for (let r2 = 0; r2 < rows; r2 += pr.scanCada) {
    const ny = (r2 + 0.5) / rows;
    const y = (r2 + 0.5) * o.celda;
    for (let c = 0; c < cols; c++) {
      const nx = (c + 0.5) / cols;
      const v = Ascii.sample(nx, ny, n, o.tz);
      if (v < Ascii.LINE_V0 || v > Ascii.LINE_V1) continue;
      if (Ascii.hash(c, r2 * 5 + 1) > pr.scanProb) continue;
      const lenPx = o.celda * (1 + Ascii.hash(c * 3 + 7, r2) * pr.scanLen);
      const lw = Math.max(1, o.celda * 0.16);
      R.rect((c + 0.5) * o.celda, y - lw / 2, lenPx, lw);
      nodos++;
    }
  }

  // ── Zona subtítulo: legible + desintegración en la frontera ──
  R.fill(Tema.rol('tinta'));
  R.textSize(o.celda);
  for (const s of Ascii.subtitleSlots(cols, rows)) {
    const nx = (s.c + 0.5) / cols;
    const ny = (s.r + 0.5) / rows;
    const v = Ascii.sample(nx, ny, n, o.tz);
    const d = Ascii.dissolve(ny, v, o.front, P.suavidad);
    if (d > P.umbral) continue;
    // Cerca de la frontera algunas letras ya se pierden (determinista).
    const z0 = P.umbral * 0.55;
    if (d > z0 && Ascii.hash(s.c, s.r) < (d - z0) / (P.umbral - z0)) continue;
    R.text(s.ch, (s.c + 0.5) * o.celda, (s.r + 0.5) * o.celda);
    nodos++;
  }

  // ── Modo imagen sin imagen cargada: aviso en el lienzo ──
  if (P.modo === 'imagen' && !Ascii.hasImage()) {
    R.fill(Tema.rol('tinta'));
    R.textSize(20);
    R.text('Carga una imagen con el panel →', W / 2, H / 2);
    nodos++;
  }

  return { cols, rows, nodos };
}

function estadoOptico() {
  if (P.anim.on) {
    T.t++;
    T.tz = T.t * P.anim.vel;
  }
  return {
    celda: P.anim.on ? P.celda * 2 : P.celda, // preview adaptativo
    front: Ascii.frontAt(P.frontera, P.anim.on ? P.anim.amp : 0, P.anim.periodo, T.t, ruido2),
    tz: T.tz,
    semilla: P.semilla,
  };
}

function draw() {
  const o = estadoOptico();
  const { cols, rows, nodos } = renderar(null, o);
  const extra = P.anim.on ? ` · t=${T.t} · ${getFrameRate().toFixed(1)}fps` : '';
  print(`P1 · ${cols}×${rows} celdas · ${nodos} nodos · paleta “${Tema.paleta.nombre}” · ${Tema.tipo.nombre}${extra}`);
}

// ── Exportación: SVG oculto a resolución real ──────────
function guardarSVG() {
  const o = {
    celda: P.celda,
    front: Ascii.frontAt(P.frontera, P.anim.on ? P.anim.amp : 0, P.anim.periodo, T.t, ruido2),
    tz: T.tz,
    semilla: P.semilla,
  };
  const svg = createGraphics(W, H, SVG);
  const { nodos } = renderar(svg, o);
  save(svg, 'p1-ascii.svg'); // p5.svg enruta Graphics+SVG → saveSVG
  svg.remove();
  print(`SVG guardado: p1-ascii.svg (${nodos} nodos)`);
}

// ── Animación ──────────────────────────────────────────
function setPlay(on) {
  P.anim.on = on;
  $('btnPlay').textContent = on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  syncIndRes();
  if (on) {
    frameRate(FPS_PREVIEW);
    loop();
  } else {
    noLoop();
    redraw(); // congela el fotograma actual a resolución real
  }
}

function syncIndRes() {
  $('indRes').textContent = P.anim.on
    ? 'preview ×½ · export full'
    : 'preview full · export full';
}

// ── Presets (v2; v1 se normaliza al cargar) ────────────
function estadoActual(nombre) {
  return {
    v: Presets.VERSION,
    nombre,
    params: {
      celda: P.celda,
      umbral: P.umbral,
      frontera: P.frontera,
      suavidad: P.suavidad,
      semilla: P.semilla,
      modo: P.modo,
      paletaIdx: Tema.paletaIdx,
      tipoIdx: Tema.tipoIdx,
      anim: { ...P.anim },
      prim: { ...P.prim },
      vista: { ...P.vista },
      perm: Tema.getPerm(),
    },
  };
}

function aplicarEstado(est) {
  const q0 = Presets.normalizar(est);
  if (!q0) { print(`Preset “${est && est.nombre}” inválido`); return; }
  const q = q0.params;
  P.celda = q.celda;
  P.umbral = q.umbral;
  P.frontera = q.frontera;
  P.suavidad = q.suavidad;
  P.semilla = q.semilla;
  P.modo = q.modo;
  P.anim = { ...q.anim };
  P.prim = { ...q.prim };
  P.vista = { ...q.vista };
  Tema.setPaleta(q.paletaIdx);
  Tema.setTipo(q.tipoIdx);
  if (q.perm) Tema.setPerm(q.perm);
  Ascii.setSeed(q.semilla);
  Ascii.setVista(q.vista);
  if (q.modo === 'imagen') {
    if (!Ascii.hasImage()) print('Preset en modo imagen pero sin imagen cargada');
  } else {
    Ascii.clearImage();
    Ascii.setCampo(q.modo);
  }
  document.querySelector(`input[name=modo][value=${q.modo}]`).checked = true;
  syncPanel();
  setPlay(P.anim.on);
  if (!P.anim.on) redraw();
  print(`Preset aplicado: “${q0.nombre}”`);
}

function renderListaPresets() {
  const ul = $('listaPresets');
  ul.textContent = '';
  const lista = Presets.listar();
  if (!lista.length) {
    const li = document.createElement('li');
    li.textContent = '(sin presets guardados)';
    li.style.color = '#8a8a8a';
    ul.appendChild(li);
    return;
  }
  for (const p of lista) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = p.nombre;
    btn.style.width = 'auto';
    btn.style.flex = '1';
    btn.onclick = () => aplicarEstado(p);
    const del = document.createElement('button');
    del.textContent = '✕';
    del.style.width = 'auto';
    del.onclick = () => { Presets.eliminar(p.nombre); renderListaPresets(); };
    li.style.display = 'flex';
    li.style.gap = '6px';
    li.appendChild(btn);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

// ── Panel ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function cablearPanel() {
  Tema.PALETAS.forEach((p, i) => $('selPaleta').add(new Option(`${i} · ${p.nombre}`, i)));
  Tema.TIPOS.forEach((t, i) => $('selTipo').add(new Option(`${i} · ${t.nombre}`, i)));

  $('selPaleta').onchange = (e) => { Tema.setPaleta(+e.target.value); redraw(); };
  $('selTipo').onchange = (e) => { Tema.setTipo(+e.target.value); redraw(); };
  $('btnShuffle').onclick = () => { Tema.barajar(); redraw(); };

  const liga = (id, clave) => {
    $(id).oninput = (e) => { P[clave] = +e.target.value; syncEtiquetas(); redraw(); };
  };
  liga('inCelda', 'celda');
  liga('inUmbral', 'umbral');
  liga('inFrontera', 'frontera');
  liga('inSuavidad', 'suavidad');

  const ligaPrim = (id, clave) => {
    $(id).oninput = (e) => { P.prim[clave] = +e.target.value; syncEtiquetas(); redraw(); };
  };
  ligaPrim('inUPunto', 'uPunto');
  ligaPrim('inDotMax', 'dotMax');
  ligaPrim('inScanCada', 'scanCada');
  ligaPrim('inScanLen', 'scanLen');
  ligaPrim('inScanProb', 'scanProb');
  ligaPrim('inSqDens', 'sqDens');
  ligaPrim('inSqMax', 'sqMax');

  const ligaVista = (id, clave) => {
    $(id).oninput = (e) => {
      P.vista[clave] = +e.target.value;
      Ascii.setVista(P.vista);
      syncEtiquetas();
      redraw();
    };
  };
  ligaVista('inZoom', 'z');
  ligaVista('inOx', 'ox');
  ligaVista('inOy', 'oy');

  $('inSemilla').onchange = (e) => { fijaSemilla(+e.target.value || 1); };
  $('btnSemilla').onclick = () => fijaSemilla(Math.floor(Math.random() * 9999) + 1);

  document.querySelectorAll('input[name=modo]').forEach((radio) => {
    radio.onchange = (e) => {
      P.modo = e.target.value;
      if (P.modo === 'imagen') {
        if (!Ascii.hasImage()) print('Modo imagen: carga un archivo');
      } else {
        Ascii.clearImage();
        Ascii.setCampo(P.modo);
      }
      redraw();
    };
  });

  $('inArchivo').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    loadImage(url, (img) => {
      document.querySelector('input[name=modo][value=imagen]').checked = true;
      P.modo = 'imagen';
      puentePixeles(img);
      redraw();
    });
  };

  // Animación
  $('btnPlay').onclick = () => setPlay(!P.anim.on);
  $('inVel').oninput = (e) => { P.anim.vel = +e.target.value; syncEtiquetas(); };
  $('inAmp').oninput = (e) => { P.anim.amp = +e.target.value; syncEtiquetas(); };
  $('inPeriodo').oninput = (e) => { P.anim.periodo = +e.target.value; syncEtiquetas(); };

  // Presets
  $('btnGuardarPreset').onclick = () => {
    const nombre = $('inPresetNombre').value.trim() || `preset-${Date.now() % 100000}`;
    const err = Presets.guardar(estadoActual(nombre));
    if (err) { print(`No se guardó: ${err}`); return; }
    $('inPresetNombre').value = '';
    renderListaPresets();
    print(`Preset guardado: “${nombre}”`);
  };
  $('btnExportPresets').onclick = () => {
    const blob = new Blob([Presets.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presets-p1.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('btnImportPresets').onclick = () => $('inImportPresets').click();
  $('inImportPresets').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = Presets.importar(rd.result);
      renderListaPresets();
      print(`Importados: ${res.ok} · errores: ${res.errores.length}`);
      res.errores.forEach((m) => print('  ' + m));
    };
    rd.readAsText(f);
    e.target.value = '';
  };

  $('btnSVG').onclick = () => guardarSVG();
}

function puentePixeles(img) {
  // Puente a baja resolución para muestreo de brillo (120 px de ancho).
  const lw = 120;
  const lh = Math.max(1, Math.round((img.height / img.width) * lw));
  const pg = createGraphics(lw, lh);
  pg.image(img, 0, 0, lw, lh);
  pg.loadPixels();
  const data = new Array(lw * lh);
  for (let i = 0; i < data.length; i++) {
    const r = pg.pixels[i * 4], g = pg.pixels[i * 4 + 1], b = pg.pixels[i * 4 + 2];
    data[i] = Math.round((r + g + b) / 3);
  }
  Ascii.setImage(data, lw, lh);
  pg.remove();
}

function fijaSemilla(s) {
  P.semilla = s;
  Ascii.setSeed(s);
  syncPanel();
  redraw();
}

function syncEtiquetas() {
  $('vCelda').textContent = P.celda;
  $('vUmbral').textContent = P.umbral.toFixed(2);
  $('vFrontera').textContent = P.frontera.toFixed(2);
  $('vSuavidad').textContent = P.suavidad.toFixed(2);
  $('vVel').textContent = P.anim.vel.toFixed(3);
  $('vAmp').textContent = P.anim.amp.toFixed(2);
  $('vPeriodo').textContent = P.anim.periodo;
  $('vUPunto').textContent = P.prim.uPunto.toFixed(2);
  $('vDotMax').textContent = P.prim.dotMax.toFixed(2);
  $('vScanCada').textContent = P.prim.scanCada;
  $('vScanLen').textContent = P.prim.scanLen;
  $('vScanProb').textContent = P.prim.scanProb.toFixed(2);
  $('vSqDens').textContent = P.prim.sqDens.toFixed(2);
  $('vSqMax').textContent = P.prim.sqMax.toFixed(2);
  $('vZoom').textContent = P.vista.z.toFixed(2);
  $('vOx').textContent = P.vista.ox.toFixed(2);
  $('vOy').textContent = P.vista.oy.toFixed(2);
}

function syncPanel() {
  $('selPaleta').value = Tema.paletaIdx;
  $('selTipo').value = Tema.tipoIdx;
  $('inCelda').value = P.celda;
  $('inUmbral').value = P.umbral;
  $('inFrontera').value = P.frontera;
  $('inSuavidad').value = P.suavidad;
  $('inSemilla').value = P.semilla;
  $('inVel').value = P.anim.vel;
  $('inAmp').value = P.anim.amp;
  $('inPeriodo').value = P.anim.periodo;
  $('inUPunto').value = P.prim.uPunto;
  $('inDotMax').value = P.prim.dotMax;
  $('inScanCada').value = P.prim.scanCada;
  $('inScanLen').value = P.prim.scanLen;
  $('inScanProb').value = P.prim.scanProb;
  $('inSqDens').value = P.prim.sqDens;
  $('inSqMax').value = P.prim.sqMax;
  $('inZoom').value = P.vista.z;
  $('inOx').value = P.vista.ox;
  $('inOy').value = P.vista.oy;
  document.querySelector(`input[name=modo][value=${P.modo}]`).checked = true;
  $('btnPlay').textContent = P.anim.on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  syncIndRes();
  syncEtiquetas();
}

function keyPressed() {
  if (key === ' ') { setPlay(!P.anim.on); return false; }
  if (key === 'b' || key === 'B') { Tema.barajar(); redraw(); }
  else if (key === 's' || key === 'S') guardarSVG();
  else if (key === 'c' || key === 'C') { Tema.ciclarPaleta(); syncPanel(); redraw(); }
  else if (key === 't' || key === 'T') { Tema.ciclarTipo(); syncPanel(); redraw(); }
  else if (key === 'r' || key === 'R') fijaSemilla(Math.floor(Math.random() * 9999) + 1);
}
