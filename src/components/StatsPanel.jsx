import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { todayKey } from '../hooks/useLocalStorage'
import { addDays, countByDate, heatLevel, startOfWeek, topTasks } from '../lib/history'

const WEEKS = 12
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
// 히트맵 농도: 집중 포인트 컬러(--focus-a)를 단계별로 섞음
const HEAT_MIX = [0, 28, 50, 75, 100]
const heatStyle = (level) =>
  level === 0 ? undefined : { background: `color-mix(in srgb, var(--focus-a) ${HEAT_MIX[level]}%, transparent)` }

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
    <section className="glass rounded-3xl p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white/90">
          <BarChart3 className="accent-text h-[18px] w-[18px]" />
          통계
        </h2>
        <span className="text-xs text-white/40">최근 12주 {total12}회</span>
      </header>

      {/* 12주 히트맵 */}
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <span />
        <div className="grid grid-cols-12 gap-[3px] pb-1 text-[10px] text-white/40">
          {months.map((m, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {m}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-none text-white/40">
          {DAY_LABELS.map((d, i) => (
            <span key={d} className="flex items-center">
              {i % 2 === 0 ? d : ''}
            </span>
          ))}
        </div>
        <div
          className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px]"
          role="img"
          aria-label={`최근 12주 집중 기록 히트맵, 총 ${total12}회`}
        >
          {cells.map((c) => (
            <span
              key={c.key}
              title={c.future ? undefined : `${c.date.getMonth() + 1}월 ${c.date.getDate()}일 · ${c.count}회`}
              style={heatStyle(c.level)}
              className={`aspect-square rounded-[3px] ${
                c.future ? 'opacity-0' : c.level === 0 ? 'bg-white/[0.06]' : ''
              } ${c.key === today ? 'ring-1 ring-white/60' : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-white/40">
        <span className="mr-0.5">적음</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            style={heatStyle(l)}
            className={`h-2.5 w-2.5 rounded-[3px] ${l === 0 ? 'bg-white/[0.06]' : ''}`}
          />
        ))}
        <span className="ml-0.5">많음</span>
      </div>

      {/* 이번 주 요일별 집중 분 */}
      <div className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold text-white/75">이번 주</h3>
          <span className="text-xs text-white/45">{formatMinutes(weekTotal)} 집중</span>
        </div>
        <div className="flex h-32 items-end gap-2" role="img" aria-label={`이번 주 집중 ${formatMinutes(weekTotal)}`}>
          {week.map((d) => {
            const isToday = d.key === today
            const pct = (d.minutes / maxDay) * 100
            return (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className={`text-[10px] tabular-nums ${d.minutes ? 'text-white/60' : 'text-transparent'}`}>
                  {d.minutes || 0}
                </span>
                <div className="flex w-full max-w-7 flex-1 items-end overflow-hidden rounded-lg bg-white/[0.04]">
                  <div
                    className="w-full rounded-lg transition-[height] duration-500"
                    style={{
                      height: d.minutes ? `max(6px, ${pct}%)` : 0,
                      background: 'linear-gradient(to top, var(--focus-b), var(--focus-a))',
                      opacity: isToday ? 1 : 0.6,
                    }}
                  />
                </div>
                <span
                  className={`text-[11px] ${
                    isToday ? 'accent-text font-semibold' : d.future ? 'text-white/30' : 'text-white/50'
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
      <div className="mt-6">
        <h3 className="mb-3 text-[13px] font-semibold text-white/75">작업별 누적 TOP 5</h3>
        {top.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.025] py-5 text-center text-xs text-white/40">
            작업을 지정하고 집중을 완료하면 여기에 쌓여요.
          </p>
        ) : (
          <ol className="space-y-2">
            {top.map((t, i) => (
              <li key={t.key} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center text-xs font-semibold tabular-nums text-white/40">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[13px] ${t.done ? 'text-white/45 line-through' : 'text-white/80'}`}>
                      {t.text}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-white/55">🍅 {t.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.count / topMax) * 100}%`,
                        background: 'linear-gradient(90deg, var(--focus-a), var(--focus-b))',
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
