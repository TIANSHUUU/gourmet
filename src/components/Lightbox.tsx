'use client'

import { useEffect, useCallback } from 'react'

export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[]
  index: number | null
  onClose: () => void
  onIndexChange: (i: number) => void
}) {
  const open = index !== null
  const count = images.length

  const prev = useCallback(() => {
    if (index === null) return
    onIndexChange((index - 1 + count) % count)
  }, [index, count, onIndexChange])

  const next = useCallback(() => {
    if (index === null) return
    onIndexChange((index + 1) % count)
  }, [index, count, onIndexChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, prev, next])

  if (index === null) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-4 text-white/80 hover:text-white text-4xl leading-none"
      >
        ×
      </button>

      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous"
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-5xl px-2 leading-none"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next"
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-5xl px-2 leading-none"
          >
            ›
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] w-auto h-auto object-contain select-none"
      />

      {count > 1 && (
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/60 font-label text-xs tracking-widest">
          {index + 1} / {count}
        </div>
      )}
    </div>
  )
}
