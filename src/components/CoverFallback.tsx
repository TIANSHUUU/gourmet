import Image from 'next/image'
import { basePath } from '@/lib/basePath'
import { badgePath } from '@/lib/cover'
import { KIND_COLORS } from '@/lib/map/kinds'
import type { Category } from '@/lib/restaurants'

/**
 * 没有照片的条目(Takeout 成稿多数如此)用的封面占位:分类色 12% 淡底 + 居中手绘分类徽章。
 * 父元素必须是 `relative` 且有固定宽高比(两张卡片的图片框本来就是)。
 */
export default function CoverFallback({ category, size }: { category: Category; size: number }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: `${KIND_COLORS[category]}1F` }}
    >
      <Image
        src={`${basePath}${badgePath(category)}`}
        alt=""
        width={size}
        height={size}
        className="group-hover:scale-110 transition-transform duration-500"
      />
    </div>
  )
}
