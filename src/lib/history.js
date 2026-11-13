// 집중 세션 기록: localStorage 'pomo.history' = [{ date: 'YYYY-MM-DD', minutes, taskId, taskText }]
// (taskText는 작업이 삭제된 뒤에도 통계에 이름을 보여주기 위한 보조 필드)
import { todayKey } from '../hooks/useLocalStorage'

export const HISTORY_KEY = 'pomo.history'
export const HISTORY_LIMIT = 20000

/**
 * 이전 버전의 'pomo.today' { date, count, minutes } 를 history로 1회 이관 후 키 삭제.
 * 같은 날짜 기록이 이미 history에 있으면 중복 생성하지 않음.
 */
export function migrateLegacyToday() {
  try {
    const raw = localStorage.getItem('pomo.today')
    if (raw == null) return
    const t = JSON.parse(raw)
    let history = []
    try {
      history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
      if (!Array.isArray(history)) history = []
    } catch {
      history = []
    }
    const count = Math.max(0, Math.floor(Number(t?.count) || 0))
    if (count > 0 && typeof t.date === 'string' && !history.some((h) => h.date === t.date)) {
      const per = Math.max(1, Math.round((Number(t.minutes) || 0) / count))
      for (let i = 0; i < count; i++) history.push({ date: t.date, minutes: per, taskId: null, taskText: '' })
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    }
    localStorage.removeItem('pomo.today')
  } catch {
    /* 저장소 접근 불가 시 무시 */
  }
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** 월요일 시작 주의 첫날 (로컬 자정) */
export function startOfWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dow = (d.getDay() + 6) % 7 // 월=0 … 일=6
  return addDays(d, -dow)
}

export function summarizeDay(history, key = todayKey()) {
  let count = 0
  let minutes = 0
  for (const h of history) {
    if (h.date === key) {
      count++
      minutes += Number(h.minutes) || 0
    }
  }
  return { count, minutes }
}

export function countByDate(history) {
  const map = new Map()
  for (const h of history) {
    const cur = map.get(h.date) || { count: 0, minutes: 0 }
    cur.count++
    cur.minutes += Number(h.minutes) || 0
    map.set(h.date, cur)
  }
  return map
}

/** 하루 뽀모도로 수 → 히트맵 농도 0~4 (5단계) */
export function heatLevel(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

/** 작업별 누적 뽀모도로 상위 n개 */
export function topTasks(history, tasks, n = 5) {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const map = new Map()
  for (const h of history) {
    const key = h.taskId ?? (h.taskText ? `text:${h.taskText}` : null)
    if (!key) continue
    const cur = map.get(key) || { key, count: 0, minutes: 0, text: '' }
    cur.count++
    cur.minutes += Number(h.minutes) || 0
    if (h.taskText) cur.text = h.taskText
    map.set(key, cur)
  }
  return [...map.values()]
    .map((r) => ({ ...r, text: byId.get(r.key)?.text || r.text || '(삭제된 작업)', done: !!byId.get(r.key)?.done }))
    .sort((a, b) => b.count - a.count || b.minutes - a.minutes)
    .slice(0, n)
}
