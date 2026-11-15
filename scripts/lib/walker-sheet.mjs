// 手绘小人"四连格"(一张图里横排 idle / walk-a / walk-b / cheer)→ 四张同尺寸姿势图的纯逻辑。
// 为什么要同尺寸:ingest 把每张姿势图 contain 进 128×160 帧,只有四张画布一样大、人物脚底在同一条线上,
// 四帧的缩放比例才一致,走路时身体才不会一帧大一帧小。

import { FRAME, POSES } from './map-assets.mjs'

/** 按列有无不透明像素(alpha ≥ 128)把图切成若干人物区间;minGap 以下的空隙不算分隔(手臂和身体之间的缝) */
export function findFigureSpans(alphaColumns, { minGap = 8 } = {}) {
  const spans = []
  let start = -1
  let gap = 0
  for (let x = 0; x < alphaColumns.length; x++) {
    if (alphaColumns[x] > 0) {
      if (start < 0) start = x
      gap = 0
    } else if (start >= 0) {
      gap++
      if (gap >= minGap) {
        spans.push([start, x - gap])
        start = -1
        gap = 0
      }
    }
  }
  if (start >= 0) spans.push([start, alphaColumns.length - 1 - gap])
  return spans
}

/**
 * 四个人物区间 → 四张画布的裁切/摆放参数。画布统一高 = 整张图的高,宽 = 高 × 128/160(与帧同比例,
 * 保证 contain 时按高度缩放);人物在画布里水平居中、垂直位置照搬原图(脚底线一致)。
 */
export function planSlices(spans, sheetWidth, sheetHeight) {
  if (spans.length !== POSES.length) {
    throw new Error(`四连格里找到 ${spans.length} 个人物,需要正好 ${POSES.length} 个(从左到右 ${POSES.join(' / ')})`)
  }
  const canvasH = sheetHeight
  const widest = Math.max(...spans.map(([a, b]) => b - a + 1))
  let canvasW = Math.floor((canvasH * FRAME.w) / FRAME.h)
  if (canvasW < widest + 2) {
    // 人物比帧还宽(手臂张得很开):把画布加宽,同时按比例加高,四张仍然同尺寸
    canvasW = widest + 2
  }
  return spans.map(([a, b], i) => {
    const w = b - a + 1
    return {
      pose: POSES[i],
      extract: { left: a, top: 0, width: w, height: sheetHeight },
      canvas: { width: canvasW, height: canvasH },
      left: Math.floor((canvasW - w) / 2),
      top: 0,
    }
  })
}
