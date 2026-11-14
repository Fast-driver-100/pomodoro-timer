import { useEffect, useState } from 'react'
import { MODES } from '../hooks/usePomodoro'

export const BREAK_OVERLAY_MS = 2600

/**
 * 세션 종료 직후 중앙 전환 오버레이.
 * - 휴식 종료: 약 2.6초 후 자동으로 사라짐
 * - 집중 종료: 메모를 쓸 수 있도록 자동으로 닫히지 않음 (저장·건너뛰기 / 바깥 탭 / Esc)
 */
const prefersFinePointer = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

export default function SessionOverlay({ data, onClose, onSaveNote }) {
  const isFocusEnd = data.finishedMode === 'focus'
  const [note, setNote] = useState('')

  const save = () => {
    const text = note.trim()
    if (text) onSaveNote?.(text, data)
    onClose()
  }

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
      className="scrim anim-fade fixed inset-0 z-40 grid place-items-center p-5"
      // 집중 종료: 바깥 탭 시 작성 중인 메모는 저장하고 닫음 (Esc는 저장 없이 닫기)
      onClick={isFocusEnd ? save : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet anim-pop w-full max-w-sm rounded-[2.25rem] px-6 pt-9 pb-6 text-center"
      >
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          <span aria-hidden className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-35 blur-2xl" />
          <span className="accent-soft relative grid h-16 w-16 place-items-center rounded-full text-3xl">{emoji}</span>
        </div>
        <h2 className="mt-5 text-[26px] font-bold tracking-[-0.03em]">{title}</h2>
        <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
        {isFocusEnd && data.taskText && (
          <p className="mx-auto mt-4 line-clamp-1 max-w-[90%] rounded-full bg-fg/[0.06] px-3 py-1 text-xs text-muted">
            🍅 {data.taskText}
          </p>
        )}

        {isFocusEnd ? (
          <form
            className="mt-6 text-left"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <label htmlFor="session-note" className="mb-2 block px-4 text-[13px] text-muted">
              이번 세션 어땠어요? <span className="text-faint">(선택)</span>
            </label>
            <input
              id="session-note"
              // 데스크톱에서만 자동 포커스 (모바일은 키보드가 갑자기 올라오지 않게)
              autoFocus={prefersFinePointer()}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              enterKeyHint="done"
              placeholder="예: 초반에 집중이 잘 됐어요"
              className="h-12 w-full rounded-full bg-fg/[0.06] px-5 text-base text-fg shadow-[inset_0_0_0_1px_var(--hairline)] outline-none transition placeholder:text-faint focus:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent),0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
            />
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn-glass h-12 flex-1 rounded-full text-[15px] font-semibold"
              >
                건너뛰기
              </button>
              <button
                type="submit"
                disabled={!note.trim()}
                className="btn-primary h-12 flex-1 rounded-full text-[15px] font-semibold disabled:opacity-40 disabled:shadow-none"
              >
                저장
              </button>
            </div>
          </form>
        ) : (
          <div className="mx-auto mt-7 h-1 w-24 overflow-hidden rounded-full bg-fg/10">
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
