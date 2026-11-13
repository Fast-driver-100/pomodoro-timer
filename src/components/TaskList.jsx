import { useState } from 'react'
import { Check, Crosshair, Plus, Trash2, ListTodo } from 'lucide-react'

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export default function TaskList({ tasks, setTasks, activeId, setActiveId }) {
  const [text, setText] = useState('')
  const doneCount = tasks.filter((t) => t.done).length

  const add = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    const task = { id: uid(), text: value, done: false, pomos: 0 }
    setTasks((ts) => [...ts, task])
    if (!activeId) setActiveId(task.id)
    setText('')
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
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white/90">
          <ListTodo className="h-[18px] w-[18px] accent-text" />
          오늘의 할 일
        </h2>
        <span className="text-xs text-white/40">
          {doneCount}/{tasks.length} 완료
        </span>
      </header>

      <form onSubmit={add} className="mb-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="집중해서 끝낼 작업 추가…"
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/30 outline-none transition focus:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] focus:bg-white/[0.06]"
        />
        <button
          type="submit"
          aria-label="작업 추가"
          className="accent-bg grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg transition active:scale-95 disabled:opacity-40"
          disabled={!text.trim()}
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <ul className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1 md:max-h-[calc(100dvh-30rem)] md:min-h-[8rem]">
        {tasks.length === 0 && (
          <li className="py-8 text-center text-sm text-white/35">
            작업을 추가하고 <Crosshair className="inline h-3.5 w-3.5" /> 를 눌러
            <br />
            현재 집중할 작업으로 지정하세요.
          </li>
        )}
        {tasks.map((t) => {
          const active = t.id === activeId
          return (
            <li
              key={t.id}
              className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                active ? 'accent-soft' : 'border-transparent bg-white/[0.025] hover:bg-white/[0.05]'
              }`}
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? '완료 취소' : '완료로 표시'}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                  t.done ? 'accent-bg border-transparent' : 'border-white/25 hover:border-white/50'
                }`}
              >
                {t.done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </button>

              <button
                onClick={() => !t.done && setActiveId(active ? null : t.id)}
                className={`min-w-0 flex-1 text-left text-[15px] leading-snug ${
                  t.done ? 'text-white/30 line-through' : 'text-white/85'
                }`}
              >
                <span className="line-clamp-2 break-words">{t.text}</span>
              </button>

              {t.pomos > 0 && (
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-white/55">
                  🍅 {t.pomos}
                </span>
              )}

              {!t.done && (
                <button
                  onClick={() => setActiveId(active ? null : t.id)}
                  aria-label={active ? '현재 작업 해제' : '현재 작업으로 지정'}
                  title={active ? '현재 작업 해제' : '현재 작업으로 지정'}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                    active ? 'accent-text' : 'text-white/30 hover:text-white/70'
                  }`}
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                aria-label="삭제"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white/30 transition hover:text-red-400 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
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
          className="mt-3 self-end text-xs text-white/35 transition hover:text-white/70"
        >
          완료된 항목 지우기
        </button>
      )}
    </section>
  )
}
