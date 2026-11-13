import { useEffect } from 'react'
import { MODES } from '../hooks/usePomodoro'

export const BREAK_OVERLAY_MS = 2600

/**
 * 세션 종료 직후 중앙 전환 오버레이.
 * - 휴식 종료: 약 2.6초 후 자동으로 사라짐
 * - 집중 종료: 자동으로 닫히지 않음 (확인 버튼 / 바깥 탭 / Esc)
 */
export default function SessionOverlay({ data, onClose }) {
  const isFocusEnd = data.finishedMode === 'focus'

  useEffect(() => {
    if (isFocusEnd) return
    const id = setTimeout(onClose, BREAK_OVERLAY_MS)
    return () => clearTimeout(id)
  }, [isFocusEnd, onClose, data.id])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const emoji = isFocusEnd ? (data.nextMode === 'long' ? '🌿' : '☕') : '🔥'
  const title = isFocusEnd ? `${data.minutes}분 집중 완료!` : `${MODES[data.finishedMode].label} 끝!`
  const subtitle = isFocusEnd
    ? data.nextMode === 'long'
      ? `${data.nextMinutes}분 동안 푹 쉬세요 ${emoji}`
      : `${data.nextMinutes}분 쉬세요 ${emoji}`
    : `다시 ${data.nextMinutes}분 집중해볼까요? ${emoji}`

  return (
    <div
      className="anim-fade fixed inset-0 z-40 grid place-items-center bg-black/55 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="glass anim-pop w-full max-w-sm rounded-[2rem] bg-[#101119]/85 px-6 pt-8 pb-6 text-center"
      >
        <div className="accent-soft mx-auto grid h-16 w-16 place-items-center rounded-full border text-3xl">
          {emoji}
        </div>
        <h2 className="accent-text mt-5 text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-[15px] text-white/70">{subtitle}</p>
        {isFocusEnd && data.taskText && (
          <p className="mx-auto mt-3 line-clamp-1 max-w-[90%] rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/50">
            🍅 {data.taskText}
          </p>
        )}

        {isFocusEnd ? (
          <button
            autoFocus
            onClick={onClose}
            className="accent-bg mt-6 w-full rounded-2xl py-3 text-[15px] font-semibold text-white shadow-lg transition active:scale-95"
          >
            확인
          </button>
        ) : (
          <div className="mx-auto mt-6 h-1 w-24 overflow-hidden rounded-full bg-white/10">
            <div
              key={data.id}
              className="accent-bg anim-shrink h-full origin-left"
              style={{ animationDuration: `${BREAK_OVERLAY_MS}ms` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
