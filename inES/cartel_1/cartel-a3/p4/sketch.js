// P4 — Sankey vegetal: tallos, hojas, flores y savia en A3 a sangre completa.
// Sobre el layout de lib/sankey.js, render botánico de flora.js.
// Sin texto. Colores vía Tema (roles); default Noche/Señal.
// Atajos: S guardar · R semilla · C paleta · B barajar · Espacio play/pausa.
//
// RENDER DUAL: preview 2D + SVG oculto solo para exportar.

const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT; // ≈ 841.89
const H = 420 * MM_TO_PT; // ≈ 1190.55

const P4 = {
  nOrg: 8,
  nHub: 4,
  nDes: 10,
  semilla: 7,
  soltura: 0.7, // 0 = retícula estricta … 1 = suelto
  curva: 0.45,
  anchoMax: 0.035, // fracción del ancho (tallo base)
  hojas: 0.7, // densidad 0..1
  florTam: 1, // escala flores/frutos
  viaDens: 0.5,
  viaTam: 0.5,
  anim: { on: false, vel: 1, amp: 0.6 },
};

const T4 = { t: 0 }; // reloj de animación
const FPS_P4 = 15;
let LAYOUT = null; // caché (se reconstruye con niveles/semilla/soltura)

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
    nOrg: P4.nOrg, nHub: P4.nHub, nDes: P4.nDes, semilla: P4.semilla,
    soltura: P4.soltura,
  });
}

function cfgFrame() {
  return {
    curva: P4.curva, anchoMax: P4.anchoMax,
    hojas: P4.hojas, florTam: P4.florTam,
    viaDens: P4.viaDens, viaTam: P4.viaTam,
    vel: P4.anim.vel, amp: P4.anim.amp,
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
    push: () => g.push(),
    pop: () => g.pop(),
    translate: (x, y) => g.translate(x, y),
    rotate: (a) => g.rotate(a),
    circle: cuenta((x, y, d) => g.circle(x, y, d)),
    ellipse: cuenta((x, y, w, h) => g.ellipse(x, y, w, h)),
  } : {
    background, noStroke, noFill, fill, stroke, strokeWeight, push, pop, translate, rotate,
    circle: cuenta(circle), ellipse: cuenta(ellipse),
  };

  R.background(Tema.rol('fondo'));
  R.noStroke();

  const ops = Flora.frame(LAYOUT, T4.t, cfgFrame());
  for (const o of ops) {
    if (o.k === 'circle') {
      R.noStroke();
      R.fill(Tema.rol(o.c));
      R.circle(o.x * W, o.y * H, Math.max(1, o.d * W));
    } else if (o.k === 'ellipse') {
      if (o.f === 1) { R.noStroke(); R.fill(Tema.rol(o.c)); }
      else { R.noFill(); R.stroke(Tema.rol(o.c)); R.strokeWeight(2); }
      R.ellipse(o.x * W, o.y * H, Math.max(1, o.w * W), Math.max(1, o.h * W));
    } else if (o.k === 'push') R.push();
    else if (o.k === 'pop') R.pop();
    else if (o.k === 'translate') R.translate(o.x * W, o.y * H);
    else if (o.k === 'rotate') R.rotate(o.a);
  }

  return { nodos };
}

function draw() {
  if (P4.anim.on) T4.t += P4.anim.vel;
  const { nodos } = renderar(null);
  const extra = P4.anim.on ? ` · t=${T4.t.toFixed(1)} · ${getFrameRate().toFixed(1)}fps` : '';
  print(`P4 · ${P4.nOrg}/${P4.nHub}/${P4.nDes} · ${nodos} nodos · paleta “${Tema.paleta.nombre}”${extra}`);
}

function guardarSVG() {
  const svg = createGraphics(W, H, SVG);
  const { nodos } = renderar(svg);
  save(svg, 'p4-flora.svg'); // p5.svg enruta Graphics+SVG → saveSVG
  svg.remove();
  print(`SVG guardado: p4-flora.svg (${nodos} nodos)`);
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

// ── Presets (esquema p4) ───────────────────────────────
function estadoActual(nombre) {
  return {
    v: Presets.p4.VERSION,
    nombre,
    params: {
      nOrg: P4.nOrg,
      nHub: P4.nHub,
      nDes: P4.nDes,
      semilla: P4.semilla,
      soltura: P4.soltura,
      curva: P4.curva,
      anchoMax: P4.anchoMax,
      hojas: P4.hojas,
      florTam: P4.florTam,
      viaDens: P4.viaDens,
      viaTam: P4.viaTam,
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
  const rearmar = q.nOrg !== P4.nOrg || q.nHub !== P4.nHub || q.nDes !== P4.nDes ||
    q.semilla !== P4.semilla || q.soltura !== P4.soltura;
  P4.nOrg = q.nOrg;
  P4.nHub = q.nHub;
  P4.nDes = q.nDes;
  P4.semilla = q.semilla;
  P4.soltura = q.soltura;
  P4.curva = q.curva;
  P4.anchoMax = q.anchoMax;
  P4.hojas = q.hojas;
  P4.florTam = q.florTam;
  P4.viaDens = q.viaDens;
  P4.viaTam = q.viaTam;
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
      const alvo = lista.find((p) => p.nombre === 'flora') || lista[0];
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
  rearmar('inNOrg', 'nOrg');
  rearmar('inNHub', 'nHub');
  rearmar('inNDes', 'nDes');
  rearmar('inSoltura', 'soltura');

  const liga = (id, clave) => {
    $(id).oninput = (e) => { P4[clave] = +e.target.value; syncEtiquetas(); redraw(); };
  };
  liga('inCurva', 'curva');
  liga('inAncho', 'anchoMax');
  liga('inHojas', 'hojas');
  liga('inFlor', 'florTam');
  liga('inViaDens', 'viaDens');
  liga('inViaTam', 'viaTam');

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
  $('vNOrg').textContent = P4.nOrg;
  $('vNHub').textContent = P4.nHub;
  $('vNDes').textContent = P4.nDes;
  $('vSoltura').textContent = P4.soltura.toFixed(2);
  $('vCurva').textContent = P4.curva.toFixed(2);
  $('vAncho').textContent = P4.anchoMax.toFixed(3);
  $('vHojas').textContent = P4.hojas.toFixed(2);
  $('vFlor').textContent = P4.florTam.toFixed(2);
  $('vViaDens').textContent = P4.viaDens.toFixed(2);
  $('vViaTam').textContent = P4.viaTam.toFixed(2);
  $('vSemilla').textContent = P4.semilla;
  $('vVel').textContent = P4.anim.vel.toFixed(1);
  $('vAmp').textContent = P4.anim.amp.toFixed(2);
}

function syncPanel() {
  $('selPaleta').value = Tema.paletaIdx;
  $('inNOrg').value = P4.nOrg;
  $('inNHub').value = P4.nHub;
  $('inNDes').value = P4.nDes;
  $('inSoltura').value = P4.soltura;
  $('inCurva').value = P4.curva;
  $('inAncho').value = P4.anchoMax;
  $('inHojas').value = P4.hojas;
  $('inFlor').value = P4.florTam;
  $('inViaDens').value = P4.viaDens;
  $('inViaTam').value = P4.viaTam;
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
