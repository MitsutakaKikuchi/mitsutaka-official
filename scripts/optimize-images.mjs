/**
 * 画像の圧縮スクリプト（`npm run images`）。
 * - src/assets/photos/  … Astro が最適化するが、元ファイルが大きいとビルドが遅くリポジトリも肥大するため長辺 2000px に収める
 * - public/photos/ public/flyers/ … そのまま配信されるため、長辺 1600px・品質 82 に圧縮する
 * 既に十分小さい画像はスキップし、上書き前にサイズが減る場合のみ書き換える。
 */
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const TARGETS = [
  { dir: 'src/assets/photos', maxSide: 2000, quality: 82 },
  { dir: 'public/photos', maxSide: 1600, quality: 82 },
  { dir: 'public/flyers', maxSide: 1600, quality: 82 },
];
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

for (const { dir, maxSide, quality } of TARGETS) {
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => EXT.has(extname(f).toLowerCase()));
  } catch {
    continue;
  }
  for (const file of files) {
    const path = join(dir, file);
    const before = statSync(path).size;
    const input = readFileSync(path);
    const image = sharp(input, { failOn: 'none' }).rotate();
    const meta = await image.metadata();
    const ext = extname(file).toLowerCase();
    let pipeline = image.resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
    if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, palette: true });
    else if (ext === '.webp') pipeline = pipeline.webp({ quality });
    else pipeline = pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
    const output = await pipeline.toBuffer();
    if (output.length < before * 0.95) {
      writeFileSync(path, output);
      console.log(`${path}: ${(before / 1024).toFixed(0)}kB → ${(output.length / 1024).toFixed(0)}kB (${meta.width}×${meta.height})`);
    } else {
      console.log(`${path}: skip (${(before / 1024).toFixed(0)}kB)`);
    }
  }
}
