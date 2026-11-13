// frontmatter 里的 coords 行:文本级判断与插入,不重新序列化 frontmatter(避免引号/顺序被改动)

/** 返回首个 --- ... --- 之间的文本;没有 frontmatter 返回 null */
export function frontmatterBlock(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return m ? m[1] : null
}

/** frontmatter 里是否已有 `coords: [` 开头的行(正文里出现不算) */
export function hasCoordsLine(raw) {
  const fm = frontmatterBlock(raw)
  return fm !== null && /^coords:\s*\[/m.test(fm)
}

/**
 * 在 `map_url:` 行之后插入 `coords: [lng, lat]`。
 * 已有 coords → 原样返回;找不到 map_url 行 → 抛错(宁可人工处理也不要插错位置)。
 */
export function insertCoords(raw, [lng, lat], note = '') {
  if (hasCoordsLine(raw)) return raw
  const line = `coords: [${lng}, ${lat}]${note ? `   # ${note}` : ''}`
  const out = raw.replace(/^(map_url:.*)$/m, `$1\n${line}`)
  if (out === raw) throw new Error('frontmatter 里没有 map_url 行,无法定位插入点')
  return out
}
