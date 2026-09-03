// A3 @ 72 DPI = 841.89 × 1190.55 pt (p5.js usa puntos 1/72")
const MM_TO_PT = 72 / 25.4;
const W = 297 * MM_TO_PT;  // ≈ 841.89
const H = 420 * MM_TO_PT;  // ≈ 1190.55

function setup() {
  createCanvas(W, H, SVG);
  noLoop();
}

function draw() {
  background(255);
  stroke(0);
  strokeWeight(2);
  noFill();

  // Marco A3 con sangrado de 5mm
  const bleed = 5 * MM_TO_PT;
  rect(bleed, bleed, W - bleed * 2, H - bleed * 2);

  // Texto principal
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(56);
  text('Hola Mundo — A3 Vectorial', W / 2, H / 2 - 80);

  textSize(28);
  text(`${nf(W, 0, 1)} × ${nf(H, 0, 1)} pt`, W / 2, H / 2 - 20);
  text(`${nf(W / MM_TO_PT, 0, 1)} × ${nf(H / MM_TO_PT, 0, 1)} mm`, W / 2, H / 2 + 20);

  // Grid de puntos (simulando micro-glifos de la huella)
  fill(180, 40, 40);
  noStroke();
  const step = 50;
  const margin = 80;
  for (let x = margin; x < W - margin; x += step) {
    for (let y = margin + 100; y < H - margin; y += step) {
      // Variación pseudo-aleatoria por posición (seed determinista)
      const n = noise(x * 0.01, y * 0.01);
      const d = map(n, 0, 1, 2, 10);
      circle(x, y, d);
    }
  }

  // Guardar SVG al hacer click
  save('cartel-a3.svg');
  print('SVG guardado: cartel-a3.svg');
  print(`Tamaño: ${W.toFixed(1)} × ${H.toFixed(1)} pt (${(W/MM_TO_PT).toFixed(1)} × ${(H/MM_TO_PT).toFixed(1)} mm)`);
}

function keyPressed() {
  if (key === 's' || key === 'S') save('cartel-a3.svg');
}