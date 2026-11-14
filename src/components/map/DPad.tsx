'use client'

import { useRef, type PointerEvent } from 'react'
import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { normalize, type Vec } from '@/lib/map/walker'

type Key = 'up' | 'down' | 'left' | 'right'
const VEC: Record<Key, Vec> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }

/** 手机虚拟方向键:按住持续移动,松开停;同时按两个方向走对角线 */
export default function DPad({ onDir }: { onDir: (d: Vec) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const held = useRef(new Set<Key>())

  const emit = () => {
    let x = 0, y = 0
    for (const k of held.current) { x += VEC[k].x; y += VEC[k].y }
    onDir(normalize({ x, y }))
  }
  const press = (k: Key) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId) // 手指滑出按钮也能收到 pointerup
    held.current.add(k)
    emit()
  }
  const release = (k: Key) => () => {
    if (!held.current.delete(k)) return
    emit()
  }
  const btn = (k: Key, glyph: string, label: string) => (
    <button
      type="button"
      aria-label={label}
      className="w-12 h-12 rounded-xl bg-[#1E242C]/85 text-[#F8F2DD] text-lg grid place-items-center select-none touch-none active:bg-[#F0742A]"
      onPointerDown={press(k)}
      onPointerUp={release(k)}
      onPointerCancel={release(k)}
      onContextMenu={e => e.preventDefault()}
    >
      {glyph}
    </button>
  )

  return (
    <div role="group" aria-label={ui.dpad} className="grid grid-cols-3 grid-rows-3 gap-1 w-[9.5rem]">
      <span />{btn('up', '▲', ui.up)}<span />
      {btn('left', '◀', ui.left)}<span />{btn('right', '▶', ui.right)}
      <span />{btn('down', '▼', ui.down)}<span />
    </div>
  )
}
