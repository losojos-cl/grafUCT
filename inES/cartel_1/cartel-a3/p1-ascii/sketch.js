// P1 — Campo ASCII a sangre completa, formato A3.
// Teclado literal arriba → disolución → trama densa del lema.
// Colores y fuente SIEMPRE vía Tema (roles); ?paleta=N&tipo=M por URL.
// Atajos: S guardar · C paleta · T tipo · R semilla · Espacio play/pausa.
// Animación (deriva + barrido) vive en pantalla; el SVG exporta el fotograma visible.

const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT; // ≈ 841.89
const H = 420 * MM_TO_PT; // ≈ 1190.55

const P = {
  celda: 9,
  umbral: 0.35,
  frontera: 0.30,
  suavidad: 0.18,
  semilla: 1,
  modo: 'campo', // 'campo' | 'imagen'
  anim: { on: false, vel: 0.05, amp: 0.06, periodo: 240 },
};

const T = { t: 0, tz: 0 }; // reloj de animación (ticks + eje de ruido)
const FPS_TROTTLE = 6; // redibujados/segundo al animar (nodos SVG = costo)

function setup() {
  Tema.init();
  const cnv = createCanvas(W, H, SVG);
  cnv.parent('lienzo');
  noLoop();
  cablearPanel();
  syncPanel();
  renderListaPresets();
}

function draw() {
  if (P.anim.on) {
    T.t++;
    T.tz = T.t * P.anim.vel;
  }
  const front = Ascii.frontAt(P.frontera, P.anim.on ? P.anim.amp : 0, P.anim.periodo, T.t);

  noiseSeed(P.semilla);
  background(Tema.rol('fondo'));
  textFont(Tema.tipo.stack);
  textAlign(CENTER, CENTER);
  noStroke();

  const cols = Math.floor(W / P.celda);
  const rows = Math.floor(H / P.celda);
  const n = (x, y) => noise(x, y, T.tz);
  let nodos = 0;

  // ── Zona densa: caracteres del lema modulados por el campo ──
  for (let r = 0; r < rows; r++) {
    const ny = (r + 0.5) / rows;
    const y = (r + 0.5) * P.celda;
    for (let c = 0; c < cols; c++) {
      const nx = (c + 0.5) / cols;
      const v = Ascii.sample(nx, ny, n, T.tz);
      const d = Ascii.dissolve(ny, v, front, P.suavidad);
      if (d < P.umbral) continue;
      fill(v > 0.66 ? Tema.rol('tinta') : Tema.rol('suave'));
      textSize(P.celda * (0.4 + v * 0.75));
      text(Ascii.mottoChar(c, r), (c + 0.5) * P.celda, y);
      nodos++;
    }
  }

  // ── Zona teclado: etiquetas legibles + desintegración en la frontera ──
  fill(Tema.rol('tinta'));
  for (const s of Ascii.keyboardSlots(cols, rows)) {
    const nx = (s.c + 0.5) / cols;
    const ny = (s.r + 0.5) / rows;
    const v = Ascii.sample(nx, ny, n, T.tz);
    const d = Ascii.dissolve(ny, v, front, P.suavidad);
    if (d > P.umbral) continue;
    // Cerca de la frontera algunas teclas ya se pierden (determinista).
    const z0 = P.umbral * 0.55;
    if (d > z0 && Ascii.hash(s.c, s.r) < (d - z0) / (P.umbral - z0)) continue;
    textSize(P.celda * (s.t.length > 2 ? 0.7 : 0.95));
    text(s.t, (s.c + 0.5) * P.celda, (s.r + 0.5) * P.celda);
    nodos++;
  }

  // ── Modo imagen sin imagen cargada: aviso en el lienzo ──
  if (P.modo === 'imagen' && !Ascii.hasImage()) {
    fill(Tema.rol('tinta'));
    textSize(20);
    text('Carga una imagen con el panel →', W / 2, H / 2);
    nodos++;
  }

  const extra = P.anim.on ? ` · t=${T.t} · ${getFrameRate().toFixed(1)}fps` : '';
  print(`P1 · ${cols}×${rows} celdas · ${nodos} nodos · paleta “${Tema.paleta.nombre}” · ${Tema.tipo.nombre}${extra}`);
}

// ── Animación ──────────────────────────────────────────
function setPlay(on) {
  P.anim.on = on;
  $('btnPlay').textContent = on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  if (on) {
    frameRate(FPS_TROTTLE);
    loop();
  } else {
    noLoop();
    redraw(); // congela el fotograma actual
  }
}

// ── Presets ────────────────────────────────────────────
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
    },
  };
}

function aplicarEstado(est) {
  const err = Presets.validar(est);
  if (err) { print(`Preset “${est && est.nombre}” inválido: ${err}`); return; }
  const q = est.params;
  P.celda = q.celda;
  P.umbral = q.umbral;
  P.frontera = q.frontera;
  P.suavidad = q.suavidad;
  P.semilla = q.semilla;
  P.modo = q.modo;
  P.anim = { ...q.anim };
  Tema.setPaleta(q.paletaIdx);
  Tema.setTipo(q.tipoIdx);
  Ascii.setSeed(q.semilla);
  if (q.modo === 'campo') Ascii.clearImage();
  document.querySelector(`input[name=modo][value=${q.modo}]`).checked = true;
  syncPanel();
  setPlay(P.anim.on);
  if (!P.anim.on) redraw();
  print(`Preset aplicado: “${est.nombre}”`);
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

  const liga = (id, clave) => {
    $(id).oninput = (e) => { P[clave] = +e.target.value; syncEtiquetas(); redraw(); };
  };
  liga('inCelda', 'celda');
  liga('inUmbral', 'umbral');
  liga('inFrontera', 'frontera');
  liga('inSuavidad', 'suavidad');

  $('inSemilla').onchange = (e) => { fijaSemilla(+e.target.value || 1); };
  $('btnSemilla').onclick = () => fijaSemilla(Math.floor(Math.random() * 9999) + 1);

  document.querySelectorAll('input[name=modo]').forEach((radio) => {
    radio.onchange = (e) => {
      P.modo = e.target.value;
      if (P.modo === 'campo') Ascii.clearImage();
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
  $('btnExportPresets').onclick = () => {    const blob = new Blob([Presets.exportar()], { type: 'application/json' });
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
  $('btnPlay').textContent = P.anim.on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  syncEtiquetas();
}

function guardarSVG() {
  save('p1-ascii.svg');
  print('SVG guardado: p1-ascii.svg');
}

function keyPressed() {
  if (key === ' ') { setPlay(!P.anim.on); return false; }
  if (key === 's' || key === 'S') guardarSVG();
  else if (key === 'c' || key === 'C') { Tema.ciclarPaleta(); syncPanel(); redraw(); }
  else if (key === 't' || key === 'T') { Tema.ciclarTipo(); syncPanel(); redraw(); }
  else if (key === 'r' || key === 'R') fijaSemilla(Math.floor(Math.random() * 9999) + 1);
}
