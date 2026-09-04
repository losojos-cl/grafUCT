// P3 — Sankey vertical: cintas de flujo en 3 niveles, A3 a sangre completa.
// Solo líneas (cintas, viajeros, ticks). Sin texto.
// Colores vía Tema (roles); default Noche/Señal.
// Atajos: S guardar · R semilla · C paleta · Espacio play/pausa.
//
// RENDER DUAL: preview 2D + SVG oculto solo para exportar.

const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT; // ≈ 841.89
const H = 420 * MM_TO_PT; // ≈ 1190.55

const P3 = {
  nOrg: 8,
  nHub: 4,
  nDes: 10,
  semilla: 7,
  soltura: 0.7, // 0 = retícula estricta … 1 = suelto
  curva: 0.4,
  anchoMax: 0.03, // fracción del ancho
  viaDens: 0.7,
  viaTam: 0.5, // fracción del ancho de cinta
  anim: { on: false, vel: 1, amp: 0.6 },
};

const T3 = { t: 0 }; // reloj de animación
const FPS_P3 = 15;
let LAYOUT = null; // caché (se reconstruye con niveles/semilla)

function setup() {
  Tema.init();
  const cnv = createCanvas(W, H); // 2D: preview
  cnv.parent('lienzo');
  noLoop();
  reconstruir();
  cablearPanel();
  syncPanel();
  renderListaPresets();
  sembrarDefecto();
}

function reconstruir() {
  LAYOUT = Sankey.layout({
    nOrg: P3.nOrg, nHub: P3.nHub, nDes: P3.nDes, semilla: P3.semilla,
    soltura: P3.soltura,
  });
}

function cfgFrame() {
  return {
    curva: P3.curva, anchoMax: P3.anchoMax,
    viaDens: P3.viaDens, viaTam: P3.viaTam,
    vel: P3.anim.vel, amp: P3.anim.on ? P3.anim.amp : P3.anim.amp,
  };
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
    line: cuenta((x1, y1, x2, y2) => g.line(x1, y1, x2, y2)),
    circle: cuenta((x, y, d) => g.circle(x, y, d)),
    bezier: cuenta((a, b, c, d, e, f, h, i) => g.bezier(a, b, c, d, e, f, h, i)),
  } : {
    background, noStroke, noFill, fill, stroke, strokeWeight,
    line: cuenta(line), circle: cuenta(circle), bezier: cuenta(bezier),
  };

  R.background(Tema.rol('fondo'));
  R.noFill();

  const ops = Sankey.frame(LAYOUT, T3.t, cfgFrame());
  for (const o of ops) {
    if (o.k === 'bezier') {
      R.noFill();
      R.stroke(Tema.rol(o.c));
      R.strokeWeight(Math.max(0.5, o.w * W));
      const p = o.pts;
      R.bezier(p[0] * W, p[1] * H, p[2] * W, p[3] * H, p[4] * W, p[5] * H, p[6] * W, p[7] * H);
    } else if (o.k === 'circle') {
      R.noStroke();
      R.fill(Tema.rol(o.c));
      R.circle(o.x * W, o.y * H, Math.max(1, o.d * W));
    } else {
      R.stroke(Tema.rol(o.c));
      R.strokeWeight(2);
      R.line(o.x1 * W, o.y1 * H, o.x2 * W, o.y2 * H);
    }
  }

  return { nodos };
}

function draw() {
  if (P3.anim.on) T3.t += P3.anim.vel;
  const { nodos } = renderar(null);
  const extra = P3.anim.on ? ` · t=${T3.t.toFixed(1)} · ${getFrameRate().toFixed(1)}fps` : '';
  print(`P3 · ${P3.nOrg}/${P3.nHub}/${P3.nDes} · ${nodos} nodos · paleta “${Tema.paleta.nombre}”${extra}`);
}

function guardarSVG() {
  const svg = createGraphics(W, H, SVG);
  const { nodos } = renderar(svg);
  save(svg, 'p3-sankey.svg'); // p5.svg enruta Graphics+SVG → saveSVG
  svg.remove();
  print(`SVG guardado: p3-sankey.svg (${nodos} nodos)`);
}

// ── Animación ──────────────────────────────────────────
function setPlay(on) {
  P3.anim.on = on;
  $('btnPlay').textContent = on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  if (on) {
    frameRate(FPS_P3);
    loop();
  } else {
    noLoop();
    redraw(); // congela el fotograma actual
  }
}

// ── Presets (esquema p3) ───────────────────────────────
function estadoActual(nombre) {
  return {
    v: Presets.p3.VERSION,
    nombre,
    params: {
      nOrg: P3.nOrg,
      nHub: P3.nHub,
      nDes: P3.nDes,
      semilla: P3.semilla,
      soltura: P3.soltura,
      curva: P3.curva,
      anchoMax: P3.anchoMax,
      viaDens: P3.viaDens,
      viaTam: P3.viaTam,
      paletaIdx: Tema.paletaIdx,
      anim: { ...P3.anim },
    },
  };
}

function aplicarEstado(est) {
  const q0 = Presets.p3.normalizar(est);
  if (!q0) { print(`Preset “${est && est.nombre}” inválido`); return; }
  const q = q0.params;
  const rearmar = q.nOrg !== P3.nOrg || q.nHub !== P3.nHub || q.nDes !== P3.nDes || q.semilla !== P3.semilla;
  P3.nOrg = q.nOrg;
  P3.nHub = q.nHub;
  P3.nDes = q.nDes;
  P3.semilla = q.semilla;
  P3.soltura = q.soltura;
  P3.curva = q.curva;
  P3.anchoMax = q.anchoMax;
  P3.viaDens = q.viaDens;
  P3.viaTam = q.viaTam;
  P3.anim = { ...q.anim };
  Tema.setPaleta(q.paletaIdx);
  if (rearmar) reconstruir();
  syncPanel();
  setPlay(P3.anim.on);
  if (!P3.anim.on) redraw();
  print(`Preset aplicado: “${q0.nombre}”`);
}

function renderListaPresets() {
  const ul = $('listaPresets');
  ul.textContent = '';
  const lista = Presets.p3.listar();
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
    del.onclick = () => { Presets.p3.eliminar(p.nombre); renderListaPresets(); };
    li.style.display = 'flex';
    li.style.gap = '6px';
    li.appendChild(btn);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

function sembrarDefecto() {
  if (Presets.p3.listar().length) return;
  fetch('presets-defecto.json')
    .then((r) => { if (!r.ok) throw new Error('sin defecto'); return r.text(); })
    .then((txt) => {
      if (Presets.p3.listar().length) return;
      const res = Presets.p3.importar(txt);
      renderListaPresets();
      const lista = Presets.p3.listar();
      const alvo = lista.find((p) => p.nombre === 'sankey') || lista[0];
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

  const rearmar = (id, clave) => {
    $(id).oninput = (e) => { P3[clave] = +e.target.value; reconstruir(); syncEtiquetas(); redraw(); };
  };
  rearmar('inNOrg', 'nOrg');
  rearmar('inNHub', 'nHub');
  rearmar('inNDes', 'nDes');
  rearmar('inSoltura', 'soltura');

  const liga = (id, clave) => {
    $(id).oninput = (e) => { P3[clave] = +e.target.value; syncEtiquetas(); redraw(); };
  };
  liga('inCurva', 'curva');
  liga('inAncho', 'anchoMax');
  liga('inViaDens', 'viaDens');
  liga('inViaTam', 'viaTam');

  $('inSemilla').onchange = (e) => { fijaSemilla(+e.target.value || 1); };
  $('btnSemilla').onclick = () => fijaSemilla(Math.floor(Math.random() * 9999) + 1);

  $('btnPlay').onclick = () => setPlay(!P3.anim.on);
  $('inVel').oninput = (e) => { P3.anim.vel = +e.target.value; syncEtiquetas(); };
  $('inAmp').oninput = (e) => { P3.anim.amp = +e.target.value; syncEtiquetas(); };

  $('btnGuardarPreset').onclick = () => {
    const nombre = $('inPresetNombre').value.trim() || `preset-${Date.now() % 100000}`;
    const err = Presets.p3.guardar(estadoActual(nombre));
    if (err) { print(`No se guardó: ${err}`); return; }
    $('inPresetNombre').value = '';
    renderListaPresets();
    print(`Preset guardado: “${nombre}”`);
  };
  $('btnExportPresets').onclick = () => {
    const blob = new Blob([Presets.p3.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presets-p3.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('btnImportPresets').onclick = () => $('inImportPresets').click();
  $('inImportPresets').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = Presets.p3.importar(rd.result);
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
  P3.semilla = s;
  reconstruir();
  syncPanel();
  redraw();
}

function syncEtiquetas() {
  $('vNOrg').textContent = P3.nOrg;
  $('vNHub').textContent = P3.nHub;
  $('vNDes').textContent = P3.nDes;
  $('vSoltura').textContent = P3.soltura.toFixed(2);
  $('vCurva').textContent = P3.curva.toFixed(2);
  $('vAncho').textContent = P3.anchoMax.toFixed(3);
  $('vViaDens').textContent = P3.viaDens.toFixed(2);
  $('vViaTam').textContent = P3.viaTam.toFixed(2);
  $('vSemilla').textContent = P3.semilla;
  $('vVel').textContent = P3.anim.vel.toFixed(1);
  $('vAmp').textContent = P3.anim.amp.toFixed(2);
}

function syncPanel() {
  $('selPaleta').value = Tema.paletaIdx;
  $('inNOrg').value = P3.nOrg;
  $('inNHub').value = P3.nHub;
  $('inNDes').value = P3.nDes;
  $('inSoltura').value = P3.soltura;
  $('inCurva').value = P3.curva;
  $('inAncho').value = P3.anchoMax;
  $('inViaDens').value = P3.viaDens;
  $('inViaTam').value = P3.viaTam;
  $('inSemilla').value = P3.semilla;
  $('inVel').value = P3.anim.vel;
  $('inAmp').value = P3.anim.amp;
  $('btnPlay').textContent = P3.anim.on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  syncEtiquetas();
}

function keyPressed() {
  if (key === ' ') { setPlay(!P3.anim.on); return false; }
  if (key === 's' || key === 'S') guardarSVG();
  else if (key === 'c' || key === 'C') { Tema.ciclarPaleta(); syncPanel(); redraw(); }
  else if (key === 'r' || key === 'R') fijaSemilla(Math.floor(Math.random() * 9999) + 1);
}
