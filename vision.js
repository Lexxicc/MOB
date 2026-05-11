const Jimp = require('jimp');

const GRID = 8;

// CQ classic theme light square: #e8d8b8 = RGB(232,216,184)
function isLightSquare(r, g, b) {
  return Math.abs(r - 232) < 25 && Math.abs(g - 216) < 25 && Math.abs(b - 184) < 25;
}

// Red piece gradient center: #e05540 = RGB(224,85,64)
function isRed(r, g, b) {
  return r > 160 && g < 120 && b < 100 && r - g > 100;
}

// Cream piece gradient center: #fff8ee = RGB(255,248,238)
function isCream(r, g, b) {
  return r > 245 && g > 235 && b > 215;
}

// Crown gold: #c8943a = RGB(200,148,58)
function isGold(r, g, b) {
  return r > 175 && g > 115 && g < 175 && b < 85 && r - b > 120;
}

async function detectBoard() {
  const { grab } = require('./capture');
  const { img, scale } = await grab();
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  // Find bounding box of all light-square pixels
  let minX = W, maxX = 0, minY = H, maxY = 0;
  let found = 0;

  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const hex = img.getPixelColor(x, y);
      const { r, g, b } = Jimp.intToRGBA(hex);
      if (isLightSquare(r, g, b)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found++;
      }
    }
  }

  if (found < 50) return null;

  // Pad by half a cell to include the enclosing dark squares
  const imgW = maxX - minX;
  const imgH = maxY - minY;
  if (imgW < 100 || imgH < 100) return null;

  const cellW = imgW / 6; // 8 squares, but light squares span 0..6 (columns 0,2,4,6)
  const cellH = imgH / 6;

  const padX = cellW * 0.5;
  const padY = cellH * 0.5;

  const bx = Math.max(0, minX - padX);
  const by = Math.max(0, minY - padY);
  const bw = imgW + padX * 2;
  const bh = imgH + padY * 2;

  // Convert image coords back to screen coords
  return {
    x: Math.round(bx / scale),
    y: Math.round(by / scale),
    w: Math.round(bw / scale),
    h: Math.round(bh / scale),
  };
}

async function parse(rect) {
  const { grab } = require('./capture');
  const { img, scale } = await grab();

  const cs = (rect.w * scale) / GRID;
  const ox = rect.x * scale;
  const oy = rect.y * scale;
  const board = [];

  for (let row = 0; row < GRID; row++) {
    board[row] = [];
    for (let col = 0; col < GRID; col++) {
      const cx = Math.round(ox + col * cs + cs / 2);
      const cy = Math.round(oy + row * cs + cs / 2);

      const centerHex = img.getPixelColor(Math.min(cx, img.bitmap.width - 1), Math.min(cy, img.bitmap.height - 1));
      const { r, g, b } = Jimp.intToRGBA(centerHex);

      // Sample a second point slightly offset
      const cx2 = Math.round(cx + cs * 0.1);
      const hex2 = img.getPixelColor(Math.min(cx2, img.bitmap.width - 1), Math.min(cy, img.bitmap.height - 1));
      const { r: r2, g: g2, b: b2 } = Jimp.intToRGBA(hex2);

      let piece = null;
      if (isRed(r, g, b) || isRed(r2, g2, b2)) {
        piece = 'red';
      } else if (isCream(r, g, b) || isCream(r2, g2, b2)) {
        piece = 'cream';
      }

      let king = false;
      if (piece) {
        const kcy = Math.round(cy - cs * 0.12);
        const kHex = img.getPixelColor(Math.min(cx, img.bitmap.width - 1), Math.max(0, kcy));
        const { r: kr, g: kg, b: kb } = Jimp.intToRGBA(kHex);
        if (isGold(kr, kg, kb)) king = true;
      }

      board[row][col] = { piece, king };
    }
  }

  return board;
}

module.exports = { detectBoard, parse };
