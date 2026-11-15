// 照片导入的纯逻辑:挑出图片文件、自然排序、顺序命名 1.jpg…
const IMAGE = /\.(jpe?g|png)$/i
const HEIC = /\.heic$/i

export function planPhotos(names) {
  const files = names.filter(n => IMAGE.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return {
    files,
    targets: files.map((_, i) => `${i + 1}.jpg`),
    skipped: names.filter(n => HEIC.test(n)),
  }
}
