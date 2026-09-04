// P2 — Módulo Generativo: retícula A3 de gráficos estadísticos sintéticos.
// Cada módulo = un tipo de gráfico con datos pseudo-aleatorios (semilla).
// Colores vía Tema (roles); paleta default Papel/Tinta.
// Atajos: S guardar · R semilla · C paleta.
//
// RENDER DUAL: preview 2D + SVG oculto solo para exportar.

const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT; // ≈ 841.89
const H = 420 * MM_TO_PT; // ≈ 1190.55

const P2 = {
  cols: 10,
  rows: 14, // 10×14 ≈ celdas cuadradas a sangre completa en A3
  semilla: 5,
  pad: 0.16, // fracción de celda como aire interior
  anim: { on: false, vel: 1, amp: 0.6 },
};

const T2 = { t: 0 }; // reloj de animación
const FPS_P2 = 15; // techo al animar (preview 2D liviano)

// Tres roles vivos rotados por módulo (variedad como la referencia).
function coloresModulo(i) {
  const T = Tema.paleta.colores;
  const vivos = [T.tinta, T.acento, T.suave, T.profundo];
  return { p: vivos[i % 4], q: vivos[(i + 1) % 4], r: vivos[(i + 2) % 4] };
}

function setup() {
  Tema.init();
  const cnv = createCanvas(W, H); // 2D: preview
  cnv.parent('lienzo');
  noLoop();
  cablearPanel();
  syncPanel();
  renderListaPresets();
  sembrarDefecto();
}

// g === null → canvas principal. Devuelve { nodos }.
function renderar(g) {
  let nodos = 0;
  const cuenta = (fn) => (...a) => { nodos++; return fn(...a); };
  const R = g ? {
    background: (c) => g.background(c),
    noStroke: () => g.noStroke(),
    noFill: () => g.noFill(),
    fill: (c) => g.fill(c),
    stroke: (c) => g.stroke(c),
    strokeWeight: (w) => g.strokeWeight(w),
    push: () => g.push(),
    pop: () => g.pop(),
    translate: (x, y) => g.translate(x, y),
    rotate: (a) => g.rotate(a),
    rect: cuenta((x, y, w, h) => g.rect(x, y, w, h)),
    circle: cuenta((x, y, d) => g.circle(x, y, d)),
    line: cuenta((x1, y1, x2, y2) => g.line(x1, y1, x2, y2)),
    ellipse: cuenta((x, y, w, h) => g.ellipse(x, y, w, h)),
    arc: cuenta((x, y, w, h, a, b) => g.arc(x, y, w, h, a, b)),
    bezier: cuenta((a, b, c, d, e, f, h, i) => g.bezier(a, b, c, d, e, f, h, i)),
  } : {
    background, noStroke, noFill, fill, stroke, strokeWeight, push, pop, translate, rotate,
    rect: cuenta(rect), circle: cuenta(circle), line: cuenta(line),
    ellipse: cuenta(ellipse), arc: cuenta(arc), bezier: cuenta(bezier),
  };

  R.background(Tema.rol('fondo'));

  // Retícula a sangre completa: celdas rectangulares W/cols × H/rows.
  const cw = W / P2.cols, ch = H / P2.rows;
  const tipos = Modulo.orden(P2.cols * P2.rows, P2.semilla);
  let idx = 0;
  for (let r = 0; r < P2.rows; r++) {
    for (let c = 0; c < P2.cols; c++, idx++) {
      const ix = c * cw + (cw * P2.pad) / 2;
      const iy = r * ch + (ch * P2.pad) / 2;
      const iw = cw * (1 - P2.pad), ih = ch * (1 - P2.pad);
      const rnd = Modulo.mulberry32(P2.semilla * 100003 + idx);
      // Movimiento rígido según familia + morph interno (tt).
      const mo = Modulo.motion(tipos[idx], T2.t, iw, ih);
      R.push();
      R.translate(ix + iw / 2 + mo.dx, iy + ih / 2 + mo.dy);
      R.rotate(mo.rot);
      Modulo.painters[tipos[idx]](R, -iw / 2, -ih / 2, iw, ih, rnd, coloresModulo(idx), T2.t);
      R.pop();
    }
  }

  return { nodos };
}

function draw() {
  if (P2.anim.on) T2.t += P2.anim.vel;
  Modulo.setAmp(P2.anim.amp);
  const { nodos } = renderar(null);
  const extra = P2.anim.on ? ` · t=${T2.t.toFixed(1)} · ${getFrameRate().toFixed(1)}fps` : '';
  print(`P2 · ${P2.cols}×${P2.rows} módulos · ${nodos} nodos · paleta “${Tema.paleta.nombre}”${extra}`);
}

function guardarSVG() {
  const svg = createGraphics(W, H, SVG);
  const { nodos } = renderar(svg);
  save(svg, 'p2-modulo.svg'); // p5.svg enruta Graphics+SVG → saveSVG
  svg.remove();
  print(`SVG guardado: p2-modulo.svg (${nodos} nodos)`);
}

// ── Animación ──────────────────────────────────────────
function setPlay(on) {
  P2.anim.on = on;
  $('btnPlay').textContent = on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  if (on) {
    frameRate(FPS_P2);
    loop();
  } else {
    noLoop();
    redraw(); // congela el fotograma actual
  }
}

// ── Presets (esquema p2) ───────────────────────────────
function estadoActual(nombre) {
  return {
    v: Presets.p2.VERSION,
    nombre,
    params: {
      cols: P2.cols,
      rows: P2.rows,
      semilla: P2.semilla,
      pad: P2.pad,
      paletaIdx: Tema.paletaIdx,
      anim: { ...P2.anim },
      perm: Tema.getPerm(),
    },
  };
}

function aplicarEstado(est) {
  const q0 = Presets.p2.normalizar(est);
  if (!q0) { print(`Preset “${est && est.nombre}” inválido`); return; }
  const q = q0.params;
  P2.cols = q.cols;
  P2.rows = q.rows;
  P2.semilla = q.semilla;
  P2.pad = q.pad;
  P2.anim = { ...q.anim };
  Tema.setPaleta(q.paletaIdx);
  if (q.perm) Tema.setPerm(q.perm);
  syncPanel();
  setPlay(P2.anim.on);
  if (!P2.anim.on) redraw();
  print(`Preset aplicado: “${q0.nombre}”`);
}

function renderListaPresets() {
  const ul = $('listaPresets');
  ul.textContent = '';
  const lista = Presets.p2.listar();
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
    del.onclick = () => { Presets.p2.eliminar(p.nombre); renderListaPresets(); };
    li.style.display = 'flex';
    li.style.gap = '6px';
    li.appendChild(btn);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

function sembrarDefecto() {
  if (Presets.p2.listar().length) return;
  fetch('presets-defecto.json')
    .then((r) => { if (!r.ok) throw new Error('sin defecto'); return r.text(); })
    .then((txt) => {
      if (Presets.p2.listar().length) return;
      const res = Presets.p2.importar(txt);
      renderListaPresets();
      const lista = Presets.p2.listar();
      const alvo = lista.find((p) => p.nombre === 'modulo') || lista[0];
      if (alvo) aplicarEstado(alvo);
      print(`Presets de defecto: ${res.ok} importados · errores: ${res.errores.length}`);
    })
    .catch(() => print('Sin presets-defecto.json: se parte vacío'));
}

// ── Panel ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function cablearPanel() {
  Tema.PALETAS.forEach((p, i) => $('selPaleta').add(new Option(`${i} · ${p.nombre}`, i)));
  $('selPaleta').onchange = (e) => { Tema.setPaleta(+e.target.value); redraw(); };
  $('btnShuffle').onclick = () => { Tema.barajar(); redraw(); };

  $('inCols').oninput = (e) => { P2.cols = +e.target.value; syncEtiquetas(); redraw(); };
  $('inRows').oninput = (e) => { P2.rows = +e.target.value; syncEtiquetas(); redraw(); };
  $('inPad').oninput = (e) => { P2.pad = +e.target.value; syncEtiquetas(); redraw(); };

  $('inSemilla').onchange = (e) => { fijaSemilla(+e.target.value || 1); };
  $('btnSemilla').onclick = () => fijaSemilla(Math.floor(Math.random() * 9999) + 1);

  // Animación
  $('btnPlay').onclick = () => setPlay(!P2.anim.on);
  $('inVel').oninput = (e) => { P2.anim.vel = +e.target.value; syncEtiquetas(); };
  $('inAmp').oninput = (e) => { P2.anim.amp = +e.target.value; syncEtiquetas(); };

  $('btnGuardarPreset').onclick = () => {
    const nombre = $('inPresetNombre').value.trim() || `preset-${Date.now() % 100000}`;
    const err = Presets.p2.guardar(estadoActual(nombre));
    if (err) { print(`No se guardó: ${err}`); return; }
    $('inPresetNombre').value = '';
    renderListaPresets();
    print(`Preset guardado: “${nombre}”`);
  };
  $('btnExportPresets').onclick = () => {
    const blob = new Blob([Presets.p2.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presets-p2.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('btnImportPresets').onclick = () => $('inImportPresets').click();
  $('inImportPresets').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = Presets.p2.importar(rd.result);
      renderListaPresets();
      print(`Importados: ${res.ok} · errores: ${res.errores.length}`);
      res.errores.forEach((m) => print('  ' + m));
    };
    rd.readAsText(f);
    e.target.value = '';
  };

  $('btnSVG').onclick = () => guardarSVG();
}

function fijaSemilla(s) {
  P2.semilla = s;
  syncPanel();
  redraw();
}

function syncEtiquetas() {
  $('vCols').textContent = P2.cols;
  $('vRows').textContent = P2.rows;
  $('vPad').textContent = P2.pad.toFixed(2);
  $('vSemilla').textContent = P2.semilla;
  $('vVel').textContent = P2.anim.vel.toFixed(1);
  $('vAmp').textContent = P2.anim.amp.toFixed(2);
}

function syncPanel() {
  $('selPaleta').value = Tema.paletaIdx;
  $('inCols').value = P2.cols;
  $('inRows').value = P2.rows;
  $('inPad').value = P2.pad;
  $('inSemilla').value = P2.semilla;
  $('inVel').value = P2.anim.vel;
  $('inAmp').value = P2.anim.amp;
  $('btnPlay').textContent = P2.anim.on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  syncEtiquetas();
}

function keyPressed() {
  if (key === ' ') { setPlay(!P2.anim.on); return false; }
  if (key === 'b' || key === 'B') { Tema.barajar(); redraw(); }
  else if (key === 's' || key === 'S') guardarSVG();
  else if (key === 'c' || key === 'C') { Tema.ciclarPaleta(); syncPanel(); redraw(); }
  else if (key === 'r' || key === 'R') fijaSemilla(Math.floor(Math.random() * 9999) + 1);
}
