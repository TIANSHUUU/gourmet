// 分类徽章(全站共用,7 种 kind):实色圆底 + 奶油色剪影图案,SVG 96×96 → 地图上 32 CSS px(pixelRatio 3)。
// 渲染:`npm run badges:render`(scripts/render-badges.mjs)写 PNG 进收件箱,再 `npm run map:assets` 入库。
// 设计约束:缩到 32 px 还要分得清 → 每个图案只有一个粗剪影,不画细线、不写字、不加阴影。

/** 必须与 src/lib/map/kinds.ts 的 KIND_COLORS 一致(badges.test.mjs 校验),顺序 = KIND_ORDER */
export const BADGE_COLORS = {
  food: '#E8603C',
  cafe: '#8C5A3C',
  bar: '#7B4B94',
  sight: '#2F8F83',
  activity: '#3C8ABF',
  shop: '#D58A2B',
  stay: '#5A6B9E',
}
export const BADGE_KINDS = Object.keys(BADGE_COLORS)
export const CREAM = '#F8F2DD'
export const INK = '#13314A'
export const SIZE = 96

// 图案都画在 96×96、以 (48,48) 为中心、约 52 px 见方的范围里。c = 圆底色,用来"挖"镂空。
const GLYPHS = {
  // 面碗 + 一双筷子
  food: (c) => `
    <path d="M40 24 L62 50" stroke="${CREAM}" stroke-width="5" stroke-linecap="round"/>
    <path d="M49 21 L69 47" stroke="${CREAM}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 48 H72 Q72 68 58 72 H38 Q24 68 24 48 Z" fill="${CREAM}"/>
    <rect x="38" y="72" width="20" height="5" rx="2" fill="${CREAM}"/>
    <rect x="28" y="53" width="40" height="3" fill="${c}"/>`,
  // 带把手的咖啡杯 + 碟
  cafe: (c) => `
    <path d="M62 42 Q80 42 80 51 Q80 60 62 60" fill="none" stroke="${CREAM}" stroke-width="6"/>
    <path d="M26 34 H66 V54 Q66 68 52 68 H40 Q26 68 26 54 Z" fill="${CREAM}"/>
    <rect x="20" y="72" width="56" height="6" rx="3" fill="${CREAM}"/>
    <path d="M38 22 Q34 27 38 32 M50 20 Q46 25 50 30" fill="none" stroke="${CREAM}" stroke-width="4" stroke-linecap="round"/>`,
  // 红酒杯(杯肚半满)
  bar: (c) => `
    <path d="M28 22 H68 V38 Q68 58 48 60 Q28 58 28 38 Z" fill="${CREAM}"/>
    <rect x="45" y="60" width="6" height="14" fill="${CREAM}"/>
    <rect x="33" y="73" width="30" height="5" rx="2.5" fill="${CREAM}"/>
    <path d="M32 26 H64 V36 H32 Z" fill="${c}"/>`,
  // 老相机:机身 + 取景器凸起 + 镜头
  sight: (c) => `
    <rect x="22" y="36" width="52" height="36" rx="7" fill="${CREAM}"/>
    <rect x="34" y="27" width="20" height="12" rx="3" fill="${CREAM}"/>
    <circle cx="48" cy="54" r="12" fill="${c}"/>
    <circle cx="48" cy="54" r="6.5" fill="${CREAM}"/>
    <rect x="62" y="42" width="7" height="5" rx="1.5" fill="${c}"/>`,
  // 登山靴(侧面朝右)+ 鞋带
  activity: (c) => `
    <path d="M28 66 V34 Q28 28 34 28 H46 Q51 28 51 33 V47 Q53 56 66 58 H74 Q78 59 78 64 V66 Z" fill="${CREAM}"/>
    <rect x="22" y="64" width="56" height="9" rx="3" fill="${CREAM}"/>
    <rect x="34" y="37" width="11" height="3.5" rx="1.5" fill="${c}"/>
    <rect x="34" y="45" width="11" height="3.5" rx="1.5" fill="${c}"/>
    <rect x="34" y="53" width="11" height="3.5" rx="1.5" fill="${c}"/>`,
  // 纸袋 + 提手
  shop: (c) => `
    <path d="M37 44 V35 Q37 24 48 24 Q59 24 59 35 V44" fill="none" stroke="${CREAM}" stroke-width="5.5"/>
    <path d="M27 40 H69 L72 74 H24 Z" fill="${CREAM}"/>`,
  // 床(侧面):床头板 + 枕头 + 床垫 + 床脚
  stay: (c) => `
    <rect x="20" y="28" width="9" height="44" rx="2.5" fill="${CREAM}"/>
    <rect x="20" y="52" width="56" height="15" rx="3" fill="${CREAM}"/>
    <rect x="32" y="42" width="18" height="9" rx="4" fill="${CREAM}"/>
    <rect x="67" y="40" width="9" height="32" rx="2.5" fill="${CREAM}"/>
    <rect x="22" y="67" width="6" height="8" fill="${CREAM}"/>
    <rect x="68" y="67" width="6" height="8" fill="${CREAM}"/>`,
}

/** 一枚徽章的完整 SVG(墨线外圈 → 奶油贴纸边 → 分类色圆底 → 奶油剪影) */
export function badgeSvg(kind) {
  const c = BADGE_COLORS[kind]
  if (!c) throw new Error(`unknown badge kind: ${kind}(可选:${BADGE_KINDS.join(', ')})`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <circle cx="48" cy="48" r="46" fill="${INK}"/>
  <circle cx="48" cy="48" r="43.5" fill="${CREAM}"/>
  <circle cx="48" cy="48" r="38.5" fill="${c}"/>
  <g transform="translate(48 48) scale(1.1) translate(-48 -48)">${GLYPHS[kind](c)}
  </g>
</svg>
`
}
