import { useMemo } from 'react'
import { todayKey } from '../hooks/useLocalStorage'
import { addDays, countByDate, heatLevel, startOfWeek, topTasks } from '../lib/history'

const WEEKS = 12
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
// 히트맵 농도: 집중 포인트 컬러(--focus-a)를 유리 위 보석처럼 — 단계가 오를수록 진하고 은은하게 발광
const HEAT_MIX = [0, 22, 42, 66, 92]
const HEAT_GLOW = [0, 0, 0, 6, 12]
const heatStyle = (level) =>
  level === 0
    ? undefined
    : {
        background: `linear-gradient(160deg, color-mix(in oklab, var(--focus-a) ${HEAT_MIX[level]}%, transparent), color-mix(in oklab, var(--focus-b) ${HEAT_MIX[level]}%, transparent))`,
        boxShadow: `inset 0 1px 0 rgb(255 255 255 / ${0.08 + level * 0.06})${
          HEAT_GLOW[level] ? `, 0 0 ${HEAT_GLOW[level]}px color-mix(in srgb, var(--focus-a) 45%, transparent)` : ''
        }`,
      }

function formatMinutes(min) {
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

export default function StatsPanel({ history, tasks }) {
  const today = todayKey()

  const { cells, months, total12, week, weekTotal, maxDay, top, topMax } = useMemo(() => {
    const byDate = countByDate(history)
    const thisMonday = startOfWeek(new Date())
    const start = addDays(thisMonday, -(WEEKS - 1) * 7)

    const cells = []
    const months = []
    let total12 = 0
    for (let w = 0; w < WEEKS; w++) {
      const monday = addDays(start, w * 7)
      // 그 주에 달이 바뀌면(1일 포함) 열 위에 월 표시
      const firstOfMonth = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).find((d) => d.getDate() === 1)
      months.push(w === 0 ? `${monday.getMonth() + 1}월` : firstOfMonth ? `${firstOfMonth.getMonth() + 1}월` : '')
      for (let d = 0; d < 7; d++) {
        const date = addDays(monday, d)
        const key = todayKey(date)
        const count = byDate.get(key)?.count || 0
        const future = key > today
        if (!future) total12 += count
        cells.push({ key, date, count, future, level: future ? 0 : heatLevel(count) })
      }
    }

    if (months[1]) months[0] = '' // 첫 두 열 라벨 겹침 방지

    const week = DAY_LABELS.map((label, i) => {
      const key = todayKey(addDays(thisMonday, i))
      return { label, key, minutes: byDate.get(key)?.minutes || 0, future: key > today }
    })
    const weekTotal = week.reduce((s, d) => s + d.minutes, 0)
    const maxDay = Math.max(1, ...week.map((d) => d.minutes))

    const top = topTasks(history, tasks, 5)
    const topMax = Math.max(1, ...top.map((t) => t.count))
    return { cells, months, total12, week, weekTotal, maxDay, top, topMax }
  }, [history, tasks, today])

  return (
    <section className="glass rounded-[1.75rem] p-5 sm:p-6">
      <header className="mb-5 flex items-baseline justify-between px-0.5">
        <h2 className="text-[19px] font-semibold tracking-[-0.022em]">통계</h2>
        <span className="text-[13px] tabular-nums text-faint">최근 12주 {total12}회</span>
      </header>

      {/* 12주 히트맵 */}
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <span />
        <div className="grid grid-cols-12 gap-1 pb-1.5 text-[10px] text-faint">
          {months.map((m, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {m}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-7 gap-1 text-[10px] leading-none text-faint">
          {DAY_LABELS.map((d, i) => (
            <span key={d} className="flex items-center">
              {i % 2 === 0 ? d : ''}
            </span>
          ))}
        </div>
        <div
          className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-1"
          role="img"
          aria-label={`최근 12주 집중 기록 히트맵, 총 ${total12}회`}
        >
          {cells.map((c) => (
            <span
              key={c.key}
              title={c.future ? undefined : `${c.date.getMonth() + 1}월 ${c.date.getDate()}일 · ${c.count}회`}
              style={heatStyle(c.level)}
              className={`aspect-square rounded-[5px] transition-[background,box-shadow] duration-700 ${
                c.future ? 'opacity-0' : c.level === 0 ? 'bg-fg/[0.055]' : ''
              } ${c.key === today ? 'outline-1 outline-offset-1 outline-fg/55' : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-faint">
        <span className="mr-0.5">적음</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            style={heatStyle(l)}
            className={`h-2.5 w-2.5 rounded-[3px] ${l === 0 ? 'bg-fg/[0.055]' : ''}`}
          />
        ))}
        <span className="ml-0.5">많음</span>
      </div>

      {/* 이번 주 요일별 집중 분 */}
      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between px-0.5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg/85">이번 주</h3>
          <span className="text-[13px] tabular-nums text-muted">{formatMinutes(weekTotal)} 집중</span>
        </div>
        <div className="flex h-32 items-end gap-2.5" role="img" aria-label={`이번 주 집중 ${formatMinutes(weekTotal)}`}>
          {week.map((d) => {
            const isToday = d.key === today
            const pct = (d.minutes / maxDay) * 100
            return (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className={`text-[10px] tabular-nums ${d.minutes ? 'text-muted' : 'text-transparent'}`}>
                  {d.minutes || 0}
                </span>
                <div className="flex w-full max-w-6 flex-1 items-end overflow-hidden rounded-full bg-fg/[0.045]">
                  <div
                    className="w-full rounded-full transition-[height] duration-700 ease-[var(--ease-glide)]"
                    style={{
                      height: d.minutes ? `max(8px, ${pct}%)` : 0,
                      background: isToday
                        ? 'linear-gradient(to top, color-mix(in oklab, var(--focus-b) 70%, transparent), var(--focus-a))'
                        : 'linear-gradient(to top, color-mix(in oklab, var(--focus-b) 22%, transparent), color-mix(in oklab, var(--focus-a) 55%, transparent))',
                      boxShadow: isToday
                        ? 'inset 0 1px 0 rgb(255 255 255 / 0.4), 0 0 14px color-mix(in srgb, var(--focus-a) 45%, transparent)'
                        : 'inset 0 1px 0 rgb(255 255 255 / 0.2)',
                    }}
                  />
                </div>
                <span
                  className={`text-[11px] ${
                    isToday ? 'accent-text font-semibold' : d.future ? 'text-faint' : 'text-muted'
                  }`}
                >
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 작업별 누적 뽀모도로 TOP 5 */}
      <div className="mt-8">
        <h3 className="mb-3 px-0.5 text-[15px] font-semibold tracking-[-0.01em] text-fg/85">작업별 누적 TOP 5</h3>
        {top.length === 0 ? (
          <p className="rounded-2xl bg-fg/[0.035] px-4 py-6 text-center text-[13px] text-faint">
            작업을 지정하고 집중을 완료하면 여기에 쌓여요.
          </p>
        ) : (
          <ol className="space-y-3">
            {top.map((t, i) => (
              <li key={t.key} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center text-xs font-semibold tabular-nums text-faint">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[13px] ${t.done ? 'text-muted line-through' : 'text-fg/80'}`}>
                      {t.text}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">🍅 {t.count}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fg/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.count / topMax) * 100}%`,
                        background:
                          'linear-gradient(90deg, color-mix(in oklab, var(--focus-a) 45%, transparent), var(--focus-a))',
                        boxShadow: '0 0 8px color-mix(in srgb, var(--focus-a) 40%, transparent)',
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
