import { useEffect, useMemo } from 'react'
import { NotebookPen, Trash2, X } from 'lucide-react'
import { todayKey } from '../hooks/useLocalStorage'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = todayKey()
  const yesterday = todayKey(new Date(Date.now() - 86_400_000))
  const base = `${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`
  if (key === today) return `오늘 · ${base}`
  if (key === yesterday) return `어제 · ${base}`
  return y === new Date().getFullYear() ? base : `${y}년 ${base}`
}

const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })

/** 최근 세션 메모를 날짜별로 묶어 보여주는 모달 */
export default function JournalModal({ open, entries, onClose, onDelete }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
    const map = new Map()
    for (const e of sorted) {
      const key = todayKey(new Date(e.date))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    return [...map.entries()]
  }, [entries])

  if (!open) return null

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="집중 일지"
        onClick={(e) => e.stopPropagation()}
        className="glass flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-[var(--surface)] pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-4"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <NotebookPen className="accent-text h-5 w-5" />
            집중 일지
          </h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-fg/10 hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          {groups.length === 0 ? (
            <p className="py-12 text-center text-sm leading-relaxed text-faint">
              아직 기록이 없어요.
              <br />
              집중 세션이 끝나면 한 줄 메모를 남겨보세요.
            </p>
          ) : (
            groups.map(([key, items]) => (
              <section key={key} className="mb-5 last:mb-2">
                <h3 className="sticky top-0 z-10 -mx-1 mb-2 flex items-center justify-between bg-[var(--surface)] px-1 py-1.5 text-xs font-semibold text-muted backdrop-blur">
                  <span>{dayLabel(key)}</span>
                  <span className="font-normal text-faint">{items.length}개</span>
                </h3>
                <ul className="space-y-2">
                  {items.map((e) => (
                    <li key={e.date} className="group rounded-2xl bg-fg/[0.035] px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] text-faint">
                        <span className="tabular-nums">{timeLabel(e.date)}</span>
                        <span>·</span>
                        <span className="tabular-nums">{e.minutes}분</span>
                        {e.taskText && (
                          <>
                            <span>·</span>
                            <span className="min-w-0 truncate">🍅 {e.taskText}</span>
                          </>
                        )}
                        <button
                          onClick={() => onDelete(e.date)}
                          aria-label="메모 삭제"
                          className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-lg text-faint transition hover:text-red-400 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-[15px] leading-snug break-words text-fg/85">{e.note}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
