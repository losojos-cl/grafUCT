// P1 — Campo ASCII a sangre completa, formato A3.
// Teclado literal arriba → disolución → trama densa del lema.
// Colores y fuente SIEMPRE vía Tema (roles); ?paleta=N&tipo=M por URL.
// Atajos: S guardar · C paleta · T tipo · R semilla.

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
};

function setup() {
  Tema.init();
  const cnv = createCanvas(W, H, SVG);
  cnv.parent('lienzo');
  noLoop();
  cablearPanel();
  syncPanel();
}

function draw() {
  noiseSeed(P.semilla);
  background(Tema.rol('fondo'));
  textFont(Tema.tipo.stack);
  textAlign(CENTER, CENTER);
  noStroke();

  const cols = Math.floor(W / P.celda);
  const rows = Math.floor(H / P.celda);
  const n = (x, y) => noise(x, y);
  let nodos = 0;

  // ── Zona densa: caracteres del lema modulados por el campo ──
  for (let r = 0; r < rows; r++) {
    const ny = (r + 0.5) / rows;
    const y = (r + 0.5) * P.celda;
    for (let c = 0; c < cols; c++) {
      const nx = (c + 0.5) / cols;
      const v = Ascii.sample(nx, ny, n);
      const d = Ascii.dissolve(ny, v, P.frontera, P.suavidad);
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
    const v = Ascii.sample(nx, ny, n);
    const d = Ascii.dissolve(ny, v, P.frontera, P.suavidad);
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

  print(`P1 · ${cols}×${rows} celdas · ${nodos} nodos · paleta “${Tema.paleta.nombre}” · ${Tema.tipo.nombre}`);
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
      awaitPixelBridge(img);
      redraw();
    });
  };

  $('btnSVG').onclick = () => guardarSVG();
}

function awaitPixelBridge(img) {
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
}

function syncPanel() {
  $('selPaleta').value = Tema.paletaIdx;
  $('selTipo').value = Tema.tipoIdx;
  $('inCelda').value = P.celda;
  $('inUmbral').value = P.umbral;
  $('inFrontera').value = P.frontera;
  $('inSuavidad').value = P.suavidad;
  $('inSemilla').value = P.semilla;
  syncEtiquetas();
}

function guardarSVG() {
  save('p1-ascii.svg');
  print('SVG guardado: p1-ascii.svg');
}

function keyPressed() {
  if (key === 's' || key === 'S') guardarSVG();
  else if (key === 'c' || key === 'C') { Tema.ciclarPaleta(); syncPanel(); redraw(); }
  else if (key === 't' || key === 'T') { Tema.ciclarTipo(); syncPanel(); redraw(); }
  else if (key === 'r' || key === 'R') fijaSemilla(Math.floor(Math.random() * 9999) + 1);
}
