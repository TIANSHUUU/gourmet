// 原图目录 → public/images/<slug>/1.jpg, 2.jpg…(长边 1600、按 EXIF 转正、剥掉全部元数据含 GPS)
//   npm run photos:import -- <原图目录> <slug> [--max 1600] [--out public/images]
// 末尾打印可直接粘进 frontmatter 的 images: 片段。接受 jpg / png / webp(Google 地图评价页下载的是 webp);HEIC 不处理:请先在访达里转成 JPEG(保留拍摄时间便于排序)。
import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { planPhotos } from './lib/photos.mjs'

const [, , srcDir, slug, ...rest] = process.argv
if (!srcDir || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('用法: node scripts/import-photos.mjs <原图目录> <slug(小写英文连字符)> [--max 1600] [--out public/images]')
  process.exit(2)
}
const opt = (flag, fallback) => {
  const i = rest.indexOf(flag)
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback
}
const MAX = Number(opt('--max', '1600'))
const OUT = path.join(opt('--out', 'public/images'), slug)

const { files, targets, skipped } = planPhotos(await readdir(srcDir))
if (skipped.length) console.warn(`⚠ 跳过 HEIC(请先转成 JPEG):${skipped.join(', ')}`)
if (files.length === 0) {
  console.error('目录里没有 jpg / jpeg / png / webp')
  process.exit(1)
}
await mkdir(OUT, { recursive: true })
for (let i = 0; i < files.length; i++) {
  const src = path.join(srcDir, files[i])
  const dest = path.join(OUT, targets[i])
  const info = await sharp(src)
    .rotate() // 按 EXIF 方向转正,之后元数据不再保留
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // 带透明的 PNG 转 JPEG 否则会变黑底;没有 alpha 的图不受影响
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest)
  console.log(`${files[i]} → ${dest} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`)
}
console.log('\nimages:\n' + targets.map(t => `  - "${t}"`).join('\n'))
