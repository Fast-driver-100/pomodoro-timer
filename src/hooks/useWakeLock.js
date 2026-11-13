import { useEffect, useState } from 'react'

/** 타이머 실행 중 화면 꺼짐 방지 (Screen Wake Lock API, iOS 16.4+ / 미지원 환경은 조용히 무시) */
export function useWakeLock(enabled) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false

    const request = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) {
          l.release().catch(() => {})
          return
        }
        lock = l
        setActive(true)
        l.addEventListener('release', () => setActive(false))
      } catch {
        setActive(false) // 저전력 모드, 권한 거부 등
      }
    }

    // 탭이 백그라운드로 가면 자동 해제되므로 다시 보일 때 재요청
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) request()
    }

    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (lock && !lock.released) lock.release().catch(() => {})
      setActive(false)
    }
  }, [enabled])

  return active
}
