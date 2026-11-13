import { useState } from 'react'
import { Check, Crosshair, Plus, Trash2, ListTodo } from 'lucide-react'
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
    <section className="glass flex min-h-0 flex-col rounded-3xl p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg/90">
          <ListTodo className="h-[18px] w-[18px] accent-text" />
          오늘의 할 일
        </h2>
        <span className="text-xs text-faint">
          {doneCount}/{tasks.length} 완료
        </span>
      </header>

      <form onSubmit={add} className="mb-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="집중해서 끝낼 작업 추가…"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-2xl border border-fg/10 bg-fg/[0.04] px-4 py-3 text-base text-fg placeholder:text-faint outline-none transition focus:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] focus:bg-fg/[0.06]"
          />
          <button
            type="submit"
            aria-label="작업 추가"
            className="accent-bg grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg transition active:scale-95 disabled:opacity-40"
            disabled={!text.trim()}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* 예상 뽀모도로 수: n번째 토마토를 탭해 1~8 선택 */}
        <div className="mt-2.5 flex items-center gap-2 px-1">
          <span className="shrink-0 text-xs text-muted">예상</span>
          <div className="flex flex-1 items-center" role="radiogroup" aria-label="예상 뽀모도로 수">
            {Array.from({ length: MAX_ESTIMATE }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={estimate === n}
                aria-label={`${n}개`}
                onClick={() => setEstimate(n)}
                className={`grid h-8 flex-1 place-items-center rounded-lg text-[15px] transition active:scale-90 ${
                  n <= estimate ? 'opacity-100' : 'opacity-20 grayscale hover:opacity-40'
                }`}
              >
                🍅
              </button>
            ))}
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-fg/70">
            {estimate}개
          </span>
        </div>
      </form>

      <ul className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1 md:max-h-[calc(100dvh-30rem)] md:min-h-[8rem]">
        {tasks.length === 0 && (
          <li className="py-8 text-center text-sm text-faint">
            작업을 추가하고 <Crosshair className="inline h-3.5 w-3.5" /> 를 눌러
            <br />
            현재 집중할 작업으로 지정하세요.
          </li>
        )}
        {tasks.map((t) => {
          const active = t.id === activeId
          const reached = t.completed >= t.estimated
          return (
            <li
              key={t.id}
              className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                active
                  ? 'accent-soft'
                  : reached && !t.done
                    ? 'border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_9%,transparent),transparent_70%)]'
                    : 'border-transparent bg-fg/[0.025] hover:bg-fg/[0.05]'
              }`}
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? '완료 취소' : '완료로 표시'}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                  t.done ? 'accent-bg border-transparent' : 'border-fg/25 hover:border-fg/50'
                }`}
              >
                {t.done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </button>

              <button
                onClick={() => !t.done && setActiveId(active ? null : t.id)}
                className={`min-w-0 flex-1 text-left text-[15px] leading-snug ${
                  t.done ? 'text-faint line-through' : 'text-fg/85'
                }`}
              >
                <span className="line-clamp-2 break-words">{t.text}</span>
              </button>

              <span
                title={reached ? '예상한 뽀모도로를 모두 채웠어요' : `완료 ${t.completed} / 예상 ${t.estimated}`}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums transition ${
                  reached ? 'accent-soft accent-text border font-semibold' : 'bg-fg/[0.06] text-muted'
                } ${t.done ? 'opacity-50' : ''}`}
              >
                🍅 {t.completed}/{t.estimated}
              </span>

              {!t.done && (
                <button
                  onClick={() => setActiveId(active ? null : t.id)}
                  aria-label={active ? '현재 작업 해제' : '현재 작업으로 지정'}
                  title={active ? '현재 작업 해제' : '현재 작업으로 지정'}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                    active ? 'accent-text' : 'text-faint hover:text-fg/70'
                  }`}
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                aria-label="삭제"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-faint transition hover:text-red-400 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>

      {doneCount > 0 && (
        <button
          onClick={clearDone}
          className="mt-3 self-end text-xs text-faint transition hover:text-fg/70"
        >
          완료된 항목 지우기
        </button>
      )}
    </section>
  )
}
