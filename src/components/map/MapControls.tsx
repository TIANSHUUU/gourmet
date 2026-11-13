'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'

/** 右下角(手机)/ 左下角(桌面)两个圆按钮:回到菠萝子、切换俯视 */
export default function MapControls({ onRecenter, onTogglePitch }: { onRecenter: () => void; onTogglePitch: () => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const btn = 'w-11 h-11 rounded-full bg-[#1E242C]/85 text-[#F8F2DD] shadow-lg grid place-items-center hover:bg-[#F0742A] transition-colors font-label text-xs font-bold'
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={btn} aria-label={ui.recenter} title={ui.recenter} onClick={onRecenter}><span className="text-xl leading-none">🍍</span></button>
      <button type="button" className={btn} aria-label={ui.togglePitch} title={ui.togglePitch} onClick={onTogglePitch}>3D</button>
    </div>
  )
}
