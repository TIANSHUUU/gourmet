import type { PlaceKind } from './places'

/**
 * 没有照片的条目,封面用该分类的手绘徽章占位。
 * 返回 public/ 下的路径,不含 basePath——展示层自己拼 `${basePath}${badgePath(kind)}`。
 * 徽章由 `npm run badges:render` + `npm run map:assets` 生成(见 CLAUDE.md Map 一节)。
 */
export function badgePath(kind: PlaceKind): string {
  return `/map-assets/icons/badge-${kind}.png`
}
