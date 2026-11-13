import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export const MODES = {
  focus: { label: '집중', short: '집중' },
  short: { label: '짧은 휴식', short: '짧은 휴식' },
  long: { label: '긴 휴식', short: '긴 휴식' },
}

export const DEFAULT_SETTINGS = {
  focus: 25,
  short: 5,
  long: 15,
  longInterval: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  bell: true,
}

/**
 * 타이머 상태는 "종료 시각(endAt) 타임스탬프"로 관리합니다.
 * setInterval은 화면 갱신용일 뿐이며, 남은 시간은 매번 endAt - Date.now()로 계산하므로
 * 모바일 Safari 백그라운드/탭 전환/절전으로 interval이 멈춰도 시간이 어긋나지 않습니다.
 * endAt은 LocalStorage에 저장되어 새로고침·앱 재실행 후에도 이어서 진행됩니다.
 */
export function usePomodoro(settings, onSessionEnd) {
  const [mode, setMode] = useLocalStorage('pomo.mode', 'focus')
  const [cycle, setCycle] = useLocalStorage('pomo.cycle', 0)
  const [endAt, setEndAt] = useLocalStorage('pomo.endAt', null)
  const [pausedLeft, setPausedLeft] = useLocalStorage('pomo.left', null)
  const [now, setNow] = useState(() => Date.now())

  const minutesFor = useCallback((m) => settings[m] * 60_000, [settings])
  const duration = minutesFor(mode)
  const running = endAt != null
  const remaining = running ? Math.max(0, endAt - now) : Math.min(pausedLeft ?? duration, duration)

  // 화면 갱신 틱 + 포그라운드 복귀 시 즉시 재계산
  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [running])

  const advance = useCallback(
    (completed) => {
      let next
      let nextCycle = cycle
      if (mode === 'focus') {
        if (completed) {
          nextCycle = cycle + 1
          next = nextCycle >= settings.longInterval ? 'long' : 'short'
        } else {
          next = 'short'
        }
      } else {
        next = 'focus'
        if (mode === 'long') nextCycle = 0
      }
      const auto = completed && (next === 'focus' ? settings.autoStartFocus : settings.autoStartBreak)
      const t = Date.now()
      setCycle(nextCycle)
      setMode(next)
      setPausedLeft(null)
      setEndAt(auto ? t + minutesFor(next) : null)
      setNow(t)
    },
    [cycle, mode, settings, minutesFor, setCycle, setMode, setPausedLeft, setEndAt],
  )

  // 세션 완료 감지
  const endRef = useRef(onSessionEnd)
  endRef.current = onSessionEnd
  const firedFor = useRef(null)
  useEffect(() => {
    if (running && now >= endAt && firedFor.current !== endAt) {
      firedFor.current = endAt
      const finishedMode = mode
      const finishedMinutes = settings[mode]
      advance(true)
      endRef.current?.(finishedMode, finishedMinutes)
    }
  }, [running, now, endAt, mode, settings, advance])

  const start = useCallback(() => {
    const t = Date.now()
    setEndAt(t + remaining)
    setPausedLeft(null)
    setNow(t)
  }, [remaining, setEndAt, setPausedLeft])

  const pause = useCallback(() => {
    if (endAt == null) return
    setPausedLeft(Math.max(0, endAt - Date.now()))
    setEndAt(null)
  }, [endAt, setEndAt, setPausedLeft])

  const reset = useCallback(() => {
    setEndAt(null)
    setPausedLeft(null)
  }, [setEndAt, setPausedLeft])

  const switchMode = useCallback(
    (m) => {
      setMode(m)
      setEndAt(null)
      setPausedLeft(null)
    },
    [setMode, setEndAt, setPausedLeft],
  )

  const skip = useCallback(() => advance(false), [advance])

  return {
    mode,
    cycle,
    running,
    remaining,
    duration,
    progress: duration > 0 ? remaining / duration : 0,
    isFresh: !running && pausedLeft == null,
    start,
    pause,
    reset,
    skip,
    switchMode,
  }
}

export function formatTime(ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
