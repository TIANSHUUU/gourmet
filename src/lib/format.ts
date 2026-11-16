const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatVisited(visited: string, lang: 'en' | 'zh'): string {
  const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(visited ?? '')
  if (!m) return ''
  const year = m[1]
  const monthIdx = parseInt(m[2], 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return ''
  if (lang === 'zh') return `造访于 ${year} 年 ${monthIdx + 1} 月`
  return `Visited ${EN_MONTHS[monthIdx]} ${year}`
}

/** 评论正文按空行分段(Takeout 原评论常有多段);段内单个换行保留,由 HTML 折叠成空格 */
export function splitParagraphs(text: string): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p !== '')
}
