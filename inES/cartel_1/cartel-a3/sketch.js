const p5 = require('p5');

module.exports = () => {
  return ({ width, height, context }) => {
    const s = (p) => {
      p.setup = () => {
        p.createCanvas(width, height, p.SVG);
        p.noLoop();
      };

      p.draw = () => {
        p.background(255);
        p.stroke(0);
        p.strokeWeight(2);
        p.noFill();

        // Marco A3
        p.rect(20, 20, width - 40, height - 40);

        // Texto de prueba
        p.fill(0);
        p.noStroke();
        p.textSize(48);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('Hola Mundo — A3 Vectorial', width / 2, height / 2 - 60);
        p.textSize(24);
        p.text(`${p.nf(width, 0, 1)} × ${p.nf(height, 0, 1)} pt  |  ${p.nf(width / 2.835, 0, 1)} × ${p.nf(height / 2.835, 0, 1)} mm`, width / 2, height / 2 + 20);

        // Puntos de prueba (simulando micro-glifos)
        p.fill(200, 50, 50);
        for (let x = 100; x < width - 100; x += 60) {
          for (let y = 200; y < height - 200; y += 60) {
            p.circle(x, y, 8);
          }
        }
      };
    };
    return new p5(s);
  };
};