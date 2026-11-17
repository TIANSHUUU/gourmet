import { flagEmoji, starPoints } from '@/lib/map/countries'

// 代码画的圆形国旗(512×512 画布,外层 span 裁成圆)。没画的国家:国旗 emoji 放大后裁圆顶上。
// 澳大利亚:左上米字旗、左下联邦七角星、右侧南十字星(位置按圆形构图重排过,指挥官 2026-11-17 出图核对过)
const AU_STARS: Array<[number, number, number, number]> = [
  [128, 380, 70, 7],
  [384, 96, 36, 7],
  [384, 420, 38, 7],
  [300, 236, 34, 7],
  [462, 208, 30, 7],
  [420, 300, 18, 5],
]

function Australia() {
  return (
    <svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">
      <rect width="512" height="512" fill="#012169" />
      {/* 内层 svg 默认 overflow:hidden,把米字旗裁在左上 256×256 里 */}
      <svg x="0" y="0" width="256" height="256" viewBox="0 0 256 256">
        <path d="M0,0 L256,256 M256,0 L0,256" stroke="#fff" strokeWidth="52" />
        <path d="M0,0 L256,256 M256,0 L0,256" stroke="#C8102E" strokeWidth="17" />
        <path d="M128,0 V256 M0,128 H256" stroke="#fff" strokeWidth="84" />
        <path d="M128,0 V256 M0,128 H256" stroke="#C8102E" strokeWidth="50" />
      </svg>
      {AU_STARS.map(([cx, cy, r, n]) => (
        <polygon key={`${cx}-${cy}`} fill="#fff" points={starPoints(cx, cy, r, n, n === 5 ? 0.42 : 0.44)} />
      ))}
    </svg>
  )
}

function Japan() {
  return (
    <svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">
      <rect width="512" height="512" fill="#fff" />
      <circle cx="256" cy="256" r="154" fill="#BC002D" />
    </svg>
  )
}

export default function FlagCircle({ code, size = 22 }: { code: string; size?: number }) {
  const art = code === 'AU' ? <Australia /> : code === 'JP' ? <Japan /> : null
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      {art ?? <span style={{ fontSize: size * 1.55, lineHeight: 1 }}>{flagEmoji(code)}</span>}
    </span>
  )
}
