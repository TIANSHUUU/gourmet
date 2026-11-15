import { describe, it, expect } from 'vitest'
import { findFigureSpans, planSlices } from './walker-sheet.mjs'

describe('findFigureSpans', () => {
  it('按空列把一行人物切开,小缝不算分隔', () => {
    const cols = new Array(100).fill(0)
    for (let x = 5; x <= 20; x++) cols[x] = 3
    for (let x = 23; x <= 30; x++) cols[x] = 1 // 和前一段只隔 2 列:同一个人物(手臂)
    for (let x = 50; x <= 70; x++) cols[x] = 2
    for (let x = 90; x <= 99; x++) cols[x] = 2 // 贴着右边缘
    expect(findFigureSpans(cols)).toEqual([[5, 30], [50, 70], [90, 99]])
  })
  it('空图没有区间', () => {
    expect(findFigureSpans(new Array(10).fill(0))).toEqual([])
  })
})

describe('planSlices', () => {
  it('四张画布同尺寸、与帧同比例、人物居中、垂直不动', () => {
    const plan = planSlices([[10, 110], [200, 320], [400, 500], [600, 740]], 800, 400)
    expect(plan.map(p => p.pose)).toEqual(['idle', 'walk-a', 'walk-b', 'cheer'])
    for (const p of plan) {
      expect(p.canvas).toEqual({ width: 320, height: 400 }) // 400 × 128/160
      expect(p.top).toBe(0)
      expect(p.extract.top).toBe(0)
      expect(p.extract.height).toBe(400)
      expect(p.left + p.extract.width).toBeLessThanOrEqual(320)
    }
    expect(plan[0].left).toBe(Math.floor((320 - 101) / 2))
  })
  it('人物比帧宽时加宽画布,四张仍同尺寸', () => {
    const plan = planSlices([[0, 399], [500, 600], [700, 800], [900, 1000]], 1100, 400)
    expect(plan.every(p => p.canvas.width === 402 && p.canvas.height === 400)).toBe(true)
  })
  it('不是四个人物就报错', () => {
    expect(() => planSlices([[0, 10], [20, 30]], 100, 50)).toThrow(/需要正好 4 个/)
  })
})
