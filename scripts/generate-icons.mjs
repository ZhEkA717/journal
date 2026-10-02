/**
 * Генерация PNG-иконок для PWA из фигур favicon.svg (без внешних зависимостей).
 * Рендер — аналитический, с supersampling 4×; PNG-энкодер — на node:zlib.
 *
 * Запуск: npm run icons → src/assets/icons/icon-{192,512}.png, icon-maskable-512.png
 */
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'assets', 'icons');
const SS = 4; // supersampling: SS×SS сэмплов на итоговый пиксель

const BLUE = [37, 99, 235, 255]; // #2563eb
const WHITE = [255, 255, 255, 255];
const GREEN = [22, 163, 74, 255]; // #16a34a

/** Попадание точки в скруглённый прямоугольник. */
function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const nx = Math.max(x + r, Math.min(px, x + w - r));
  const ny = Math.max(y + r, Math.min(py, y + h - r));
  return (px - nx) ** 2 + (py - ny) ** 2 <= r * r;
}

/** Попадание точки в круг. */
function inCircle(px, py, cx, cy, r) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

/** Расстояние от точки до отрезка (для штриха галочки — «капсула»). */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Наложение цвета src поверх dst (source-over). */
function blend(dst, src) {
  const sa = src[3] / 255;
  const da = dst[3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA === 0) return [0, 0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    dst[i] = Math.round((src[i] * sa + dst[i] * da * (1 - sa)) / outA);
  }
  dst[3] = Math.round(outA * 255);
}

/** Содержимое иконки (без фона) — фигуры из favicon.svg в координатах 64×64. */
function paintContent(x, y, color) {
  const white = [255, 255, 255, 255];
  const blue35 = [37, 99, 235, Math.round(255 * 0.35)];
  // Документ.
  if (inRoundedRect(x, y, 14, 12, 28, 40, 4)) blend(color, white);
  // Строки текста на документе.
  if (inRoundedRect(x, y, 18, 20, 20, 3, 1.5)) blend(color, blue35);
  if (inRoundedRect(x, y, 18, 28, 20, 3, 1.5)) blend(color, blue35);
  if (inRoundedRect(x, y, 18, 36, 12, 3, 1.5)) blend(color, blue35);
  // Зелёный бейдж: белая обводка (r + stroke/2), затем заливка.
  if (inCircle(x, y, 45, 44, 12.5)) blend(color, white);
  if (inCircle(x, y, 45, 44, 11)) blend(color, GREEN);
  // Белая галочка (stroke 3.2, round caps/joins).
  const half = 1.6;
  if (
    distToSegment(x, y, 40, 44.2, 43.4, 47.6) <= half ||
    distToSegment(x, y, 43.4, 47.6, 50.5, 40.5) <= half
  ) {
    blend(color, white);
  }
}

/** Рендер иконки size×size; maskable — фон на весь холст, контент ужат до 80%. */
function renderIcon(size, { maskable = false } = {}) {
  const scale = size / 64;
  const raw = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const x = (px + (sx + 0.5) / SS) / scale;
          const y = (py + (sy + 0.5) / SS) / scale;
          const sample = [0, 0, 0, 0];
          if (maskable) {
            // Фон — квадрат на весь холст, контент — масштаб 0.8 от центра.
            blend(sample, BLUE);
            const cx = 32 + (x - 32) * 0.8;
            const cy = 32 + (y - 32) * 0.8;
            paintContent(cx, cy, sample);
          } else {
            if (inRoundedRect(x, y, 0, 0, 64, 64, 14)) blend(sample, BLUE);
            paintContent(x, y, sample);
          }
          for (let c = 0; c < 4; c += 1) acc[c] += sample[c];
        }
      }
      const offset = (py * size + px) * 4;
      for (let c = 0; c < 4; c += 1) {
        raw[offset + c] = Math.round(acc[c] / (SS * SS));
      }
    }
  }
  return raw;
}

/** Сборка PNG (RGBA, 8 бит) из пикселей. */
function encodePng(width, height, pixels) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    raw[row * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, row * stride, stride).copy(raw, row * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
];
for (const [name, size, maskable] of targets) {
  const png = encodePng(size, size, renderIcon(size, { maskable }));
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`${name}: ${png.length} bytes`);
}
