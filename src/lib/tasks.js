// 작업 데이터 구조: { id, text, done, estimated, completed }

export const MIN_ESTIMATE = 1
export const MAX_ESTIMATE = 8

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/**
 * 저장된 작업을 현재 구조로 맞춤.
 * - 이전 버전은 { id, text, done, pomos } 형태 → pomos를 completed로 이관
 * - 누락 필드는 기본값(estimated=1, completed=0)
 */
export function normalizeTask(t) {
  const legacy = t && typeof t === 'object' ? t : {}
  return {
    id: legacy.id ?? uid(),
    text: String(legacy.text ?? ''),
    done: !!legacy.done,
    estimated: clampInt(legacy.estimated, MIN_ESTIMATE, MAX_ESTIMATE, 1),
    completed: clampInt(legacy.completed ?? legacy.pomos, 0, 9999, 0),
  }
}

export function needsMigration(t) {
  return (
    !t ||
    typeof t !== 'object' ||
    'pomos' in t ||
    typeof t.estimated !== 'number' ||
    typeof t.completed !== 'number'
  )
}
