/**
 * public/favicon.svg から各種アイコン（PNG / apple-touch-icon / maskable / favicon.ico）を生成する。
 * ロゴを差し替えたら `npm run icons` で再生成する。
 */
import sharp from 'sharp';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg');
mkdirSync('public/icons', { recursive: true });

const square = (size) => sharp(svg).resize(size, size).png().toBuffer();

writeFileSync('public/icons/icon-192.png', await square(192));
writeFileSync('public/icons/icon-512.png', await square(512));
// Apple は角丸を OS 側で付けるため、角丸なしの矩形版を使う
writeFileSync(
  'public/icons/apple-touch-icon.png',
  await sharp(Buffer.from(svg.toString().replace('rx="12"', 'rx="0"'))).resize(180, 180).png().toBuffer()
);
// マスカブル: セーフゾーン（中央 80%）にシンボルを収める
const inner = await square(410);
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#f7f5f0' } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile('public/icons/icon-maskable-512.png');

// favicon.ico（16 / 32 / 48px の PNG を ICO コンテナに格納）
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map(square));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0);
  e.writeUInt8(icoSizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...entries, ...pngs]));
console.log('icons generated');
