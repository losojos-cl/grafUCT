// P4 — Árbol generativo: ramificación recursiva en A3 a sangre completa.
// Troncos abajo → copa arriba, código de color por rama, brotes terminales.
// Sin texto. Colores vía Tema (roles); default Noche/Señal.
// Atajos: S guardar · R semilla · C paleta · B barajar · Espacio play/pausa.
//
// RENDER DUAL: preview 2D + SVG oculto solo para exportar.

const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT; // ≈ 841.89
const H = 420 * MM_TO_PT; // ≈ 1190.55

const P4 = {
  troncos: 2,
  profundidad: 5,
  hijos: 2.4, // 2..3 (fracción = prob. de tercer hijo)
  angulo: 0.45, // apertura de bifurcación (rad)
  decaimiento: 0.72, // largo hijo / largo padre
  grosor: 0.02, // fracción del ancho (tronco)
  semilla: 7,
  anim: { on: false, vel: 1, amp: 0.6 },
};

const T4 = { t: 0 }; // reloj de animación
const FPS_P4 = 15;
let ARBOL = null; // caché (se reconstruye con forma/semilla)

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
  ARBOL = Arbol.crecer(P4.semilla, {
    troncos: P4.troncos, profundidad: P4.profundidad, hijos: P4.hijos,
    angulo: P4.angulo, decaimiento: P4.decaimiento, grosor: P4.grosor,
  });
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
    // strokeCap no existe en el renderer SVG → try/catch (exporta con butt).
    strokeCap: (s) => { try { g.strokeCap(s); } catch (e) { /* butt por defecto */ } },
    circle: cuenta((x, y, d) => g.circle(x, y, d)),
    line: cuenta((x1, y1, x2, y2) => g.line(x1, y1, x2, y2)),
  } : {
    background, noStroke, noFill, fill, stroke, strokeWeight, strokeCap,
    circle: cuenta(circle), line: cuenta(line),
  };

  R.background(Tema.rol('fondo'));
  R.noFill();
  R.strokeCap(ROUND);

  const ops = Arbol.frame(ARBOL, T4.t, P4.anim.amp);
  for (const o of ops) {
    if (o.k === 'line') {
      R.stroke(Tema.rol(o.c));
      R.strokeWeight(Math.max(0.5, o.w * W));
      R.line(o.x0 * W, o.y0 * H, o.x1 * W, o.y1 * H);
    } else {
      R.noStroke();
      R.fill(Tema.rol(o.c));
      R.circle(o.x * W, o.y * H, Math.max(1, o.d * W));
    }
  }

  return { nodos };
}

function draw() {
  if (P4.anim.on) T4.t += P4.anim.vel;
  const { nodos } = renderar(null);
  const extra = P4.anim.on ? ` · t=${T4.t.toFixed(1)} · ${getFrameRate().toFixed(1)}fps` : '';
  print(`P4 · ${P4.troncos}×prof${P4.profundidad} · ${nodos} nodos · paleta “${Tema.paleta.nombre}”${extra}`);
}

function guardarSVG() {
  const svg = createGraphics(W, H, SVG);
  const { nodos } = renderar(svg);
  save(svg, 'p4-arbol.svg'); // p5.svg enruta Graphics+SVG → saveSVG
  svg.remove();
  print(`SVG guardado: p4-arbol.svg (${nodos} nodos)`);
}

// ── Animación ──────────────────────────────────────────
function setPlay(on) {
  P4.anim.on = on;
  $('btnPlay').textContent = on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  if (on) {
    frameRate(FPS_P4);
    loop();
  } else {
    noLoop();
    redraw(); // congela el fotograma actual
  }
}

// ── Presets (esquema p4 v2) ────────────────────────────
function estadoActual(nombre) {
  return {
    v: Presets.p4.VERSION,
    nombre,
    params: {
      troncos: P4.troncos,
      profundidad: P4.profundidad,
      hijos: P4.hijos,
      angulo: P4.angulo,
      decaimiento: P4.decaimiento,
      grosor: P4.grosor,
      semilla: P4.semilla,
      paletaIdx: Tema.paletaIdx,
      anim: { ...P4.anim },
      perm: Tema.getPerm(),
    },
  };
}

function aplicarEstado(est) {
  const q0 = Presets.p4.normalizar(est);
  if (!q0) { print(`Preset “${est && est.nombre}” inválido`); return; }
  const q = q0.params;
  const rearmar = q.troncos !== P4.troncos || q.profundidad !== P4.profundidad ||
    q.hijos !== P4.hijos || q.angulo !== P4.angulo || q.decaimiento !== P4.decaimiento ||
    q.grosor !== P4.grosor || q.semilla !== P4.semilla;
  P4.troncos = q.troncos;
  P4.profundidad = q.profundidad;
  P4.hijos = q.hijos;
  P4.angulo = q.angulo;
  P4.decaimiento = q.decaimiento;
  P4.grosor = q.grosor;
  P4.semilla = q.semilla;
  P4.anim = { ...q.anim };
  Tema.setPaleta(q.paletaIdx);
  if (q.perm) Tema.setPerm(q.perm);
  if (rearmar) reconstruir();
  syncPanel();
  setPlay(P4.anim.on);
  if (!P4.anim.on) redraw();
  print(`Preset aplicado: “${q0.nombre}”`);
}

function renderListaPresets() {
  const ul = $('listaPresets');
  ul.textContent = '';
  const lista = Presets.p4.listar();
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
    del.onclick = () => { Presets.p4.eliminar(p.nombre); renderListaPresets(); };
    li.style.display = 'flex';
    li.style.gap = '6px';
    li.appendChild(btn);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

function sembrarDefecto() {
  if (Presets.p4.listar().length) return;
  fetch('presets-defecto.json')
    .then((r) => { if (!r.ok) throw new Error('sin defecto'); return r.text(); })
    .then((txt) => {
      if (Presets.p4.listar().length) return;
      const res = Presets.p4.importar(txt);
      renderListaPresets();
      const lista = Presets.p4.listar();
      const alvo = lista.find((p) => p.nombre === 'arbol') || lista[0];
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

  const rearmar = (id, clave) => {
    $(id).oninput = (e) => { P4[clave] = +e.target.value; reconstruir(); syncEtiquetas(); redraw(); };
  };
  rearmar('inTroncos', 'troncos');
  rearmar('inProf', 'profundidad');
  rearmar('inHijos', 'hijos');
  rearmar('inAngulo', 'angulo');
  rearmar('inDecaim', 'decaimiento');
  rearmar('inGrosor', 'grosor');

  $('inSemilla').onchange = (e) => { fijaSemilla(+e.target.value || 1); };
  $('btnSemilla').onclick = () => fijaSemilla(Math.floor(Math.random() * 9999) + 1);

  $('btnPlay').onclick = () => setPlay(!P4.anim.on);
  $('inVel').oninput = (e) => { P4.anim.vel = +e.target.value; syncEtiquetas(); };
  $('inAmp').oninput = (e) => { P4.anim.amp = +e.target.value; syncEtiquetas(); };

  $('btnGuardarPreset').onclick = () => {
    const nombre = $('inPresetNombre').value.trim() || `preset-${Date.now() % 100000}`;
    const err = Presets.p4.guardar(estadoActual(nombre));
    if (err) { print(`No se guardó: ${err}`); return; }
    $('inPresetNombre').value = '';
    renderListaPresets();
    print(`Preset guardado: “${nombre}”`);
  };
  $('btnExportPresets').onclick = () => {
    const blob = new Blob([Presets.p4.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presets-p4.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('btnImportPresets').onclick = () => $('inImportPresets').click();
  $('inImportPresets').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = Presets.p4.importar(rd.result);
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
  P4.semilla = s;
  reconstruir();
  syncPanel();
  redraw();
}

function syncEtiquetas() {
  $('vTroncos').textContent = P4.troncos;
  $('vProf').textContent = P4.profundidad;
  $('vHijos').textContent = P4.hijos.toFixed(1);
  $('vAngulo').textContent = P4.angulo.toFixed(2);
  $('vDecaim').textContent = P4.decaimiento.toFixed(2);
  $('vGrosor').textContent = P4.grosor.toFixed(3);
  $('vSemilla').textContent = P4.semilla;
  $('vVel').textContent = P4.anim.vel.toFixed(1);
  $('vAmp').textContent = P4.anim.amp.toFixed(2);
}

function syncPanel() {
  $('selPaleta').value = Tema.paletaIdx;
  $('inTroncos').value = P4.troncos;
  $('inProf').value = P4.profundidad;
  $('inHijos').value = P4.hijos;
  $('inAngulo').value = P4.angulo;
  $('inDecaim').value = P4.decaimiento;
  $('inGrosor').value = P4.grosor;
  $('inSemilla').value = P4.semilla;
  $('inVel').value = P4.anim.vel;
  $('inAmp').value = P4.anim.amp;
  $('btnPlay').textContent = P4.anim.on ? '❚❚ Pausar (Espacio)' : '▶ Animar (Espacio)';
  syncEtiquetas();
}

function keyPressed() {
  if (key === ' ') { setPlay(!P4.anim.on); return false; }
  if (key === 'b' || key === 'B') { Tema.barajar(); redraw(); }
  else if (key === 's' || key === 'S') guardarSVG();
  else if (key === 'c' || key === 'C') { Tema.ciclarPaleta(); syncPanel(); redraw(); }
  else if (key === 'r' || key === 'R') fijaSemilla(Math.floor(Math.random() * 9999) + 1);
}
