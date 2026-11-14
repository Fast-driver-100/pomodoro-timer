import { useState } from 'react'
import { ArrowUp, Check, Crosshair, X } from 'lucide-react'
import { MAX_ESTIMATE, uid } from '../lib/tasks'

export default function TaskList({ tasks, setTasks, activeId, setActiveId }) {
  const [text, setText] = useState('')
  const [estimate, setEstimate] = useState(1)
  const doneCount = tasks.filter((t) => t.done).length

  const add = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    const task = { id: uid(), text: value, done: false, estimated: estimate, completed: 0 }
    setTasks((ts) => [...ts, task])
    if (!activeId) setActiveId(task.id)
    setText('')
    setEstimate(1)
  }

  const toggle = (id) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    const t = tasks.find((x) => x.id === id)
    if (t && !t.done && activeId === id) setActiveId(null)
  }

  const remove = (id) => {
    setTasks((ts) => ts.filter((t) => t.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const clearDone = () => {
    setTasks((ts) => ts.filter((t) => !t.done))
    if (tasks.find((t) => t.id === activeId)?.done) setActiveId(null)
  }

  return (
    <section className="glass flex min-h-0 flex-col rounded-[1.75rem] p-5 sm:p-6">
      <header className="mb-4 flex items-baseline justify-between px-0.5">
        <h2 className="text-[19px] font-semibold tracking-[-0.022em]">할 일</h2>
        {tasks.length > 0 && (
          <span className="text-[13px] tabular-nums text-faint">
            {doneCount}/{tasks.length} 완료
          </span>
        )}
      </header>

      <form onSubmit={add} className="mb-4">
        <div className="relative">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="집중해서 끝낼 작업"
            aria-label="새 작업"
            enterKeyHint="done"
            className="h-12 w-full rounded-full bg-fg/[0.06] pr-14 pl-5 text-base text-fg shadow-[inset_0_0_0_1px_var(--hairline)] outline-none transition placeholder:text-faint focus:bg-fg/[0.08] focus:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent),0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
          />
          <button
            type="submit"
            aria-label="작업 추가"
            disabled={!text.trim()}
            className="btn-primary absolute top-1.5 right-1.5 grid h-9 w-9 place-items-center rounded-full disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </button>
        </div>

        {/* 예상 뽀모도로 수: n번째 점을 탭해 1~8 선택 */}
        <div className="mt-3 flex items-center gap-3 pl-5">
          <span className="shrink-0 text-[13px] text-muted">예상</span>
          <div className="flex flex-1 items-center" role="radiogroup" aria-label="예상 뽀모도로 수">
            {Array.from({ length: MAX_ESTIMATE }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={estimate === n}
                aria-label={`${n}개`}
                onClick={() => setEstimate(n)}
                className="group grid h-8 flex-1 place-items-center rounded-full"
              >
                <span
                  className={`block rounded-full transition-all duration-300 ease-[var(--ease-spring)] group-active:scale-75 ${
                    n <= estimate
                      ? 'h-2.5 w-2.5 bg-[var(--accent)] shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_70%,transparent)]'
                      : 'h-1.5 w-1.5 bg-fg/20 group-hover:bg-fg/35'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="shrink-0 rounded-full bg-fg/[0.06] px-2.5 py-1 text-xs font-semibold tabular-nums text-fg/75">
            🍅 {estimate}
          </span>
        </div>
      </form>

      <ul className="-mx-1.5 flex-1 space-y-1 overflow-y-auto px-1.5 md:max-h-[calc(100dvh-30rem)] md:min-h-[8rem]">
        {tasks.length === 0 && (
          <li className="px-6 py-10 text-center text-[15px] leading-relaxed text-faint">
            작업을 추가하면 바로 집중할 작업으로 지정돼요.
          </li>
        )}
        {tasks.map((t) => {
          const active = t.id === activeId
          const reached = t.completed >= t.estimated
          return (
            <li
              key={t.id}
              className={`group flex items-center gap-3 rounded-2xl py-2.5 pr-1.5 pl-3 transition-colors duration-300 ${
                active ? 'accent-soft' : 'hover:bg-fg/[0.04]'
              }`}
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? '완료 취소' : '완료로 표시'}
                className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full transition-all duration-300 ease-[var(--ease-spring)] active:scale-90 ${
                  t.done
                    ? 'accent-bg shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_50%,transparent)]'
                    : 'shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--fg)_28%,transparent)] hover:shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--fg)_50%,transparent)]'
                }`}
              >
                {t.done && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
              </button>

              <button
                onClick={() => !t.done && setActiveId(active ? null : t.id)}
                className={`min-w-0 flex-1 text-left text-[15px] leading-snug tracking-[-0.01em] transition-colors ${
                  t.done ? 'text-faint line-through decoration-fg/30' : active ? 'font-medium text-fg' : 'text-fg/85'
                }`}
              >
                <span className="line-clamp-2 break-words">{t.text}</span>
              </button>

              <span
                title={reached ? '예상한 뽀모도로를 모두 채웠어요' : `완료 ${t.completed} / 예상 ${t.estimated}`}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition ${
                  reached ? 'accent-text bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]' : 'bg-fg/[0.06] text-muted'
                } ${t.done ? 'opacity-50' : ''}`}
              >
                🍅 {t.completed}/{t.estimated}
              </span>

              {!t.done && (
                <button
                  onClick={() => setActiveId(active ? null : t.id)}
                  aria-label={active ? '현재 작업 해제' : '현재 작업으로 지정'}
                  title={active ? '현재 작업 해제' : '현재 작업으로 지정'}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                    active ? 'accent-text' : 'text-faint hover:bg-fg/[0.06] hover:text-fg/75'
                  }`}
                >
                  <Crosshair className="h-4 w-4" strokeWidth={1.9} />
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                aria-label="삭제"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint transition hover:bg-red-500/10 hover:text-red-400 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          )
        })}
      </ul>

      {doneCount > 0 && (
        <button
          onClick={clearDone}
          className="mt-3 self-end rounded-full px-3 py-1.5 text-[13px] text-faint transition hover:bg-fg/[0.05] hover:text-fg/75"
        >
          완료된 항목 지우기
        </button>
      )}
    </section>
  )
}
