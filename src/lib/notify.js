// 브라우저 알림 (Notification API)
// - iOS Safari는 '홈 화면에 추가'한 웹앱(iOS 16.4+)에서만 Notification을 제공 → 일반 탭에서는 'unsupported'
// - Android Chrome 등은 new Notification()이 막혀 있어 서비스워커 registration.showNotification을 우선 사용

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notifyPermission() {
  if (!notifySupported()) return 'unsupported'
  try {
    return Notification.permission
  } catch {
    return 'unsupported'
  }
}

/** 반드시 사용자 클릭 핸들러 안에서 호출 (Safari는 제스처 없이 요청하면 무시) */
export function requestNotifyPermission() {
  if (!notifySupported()) return Promise.resolve('unsupported')
  return new Promise((resolve) => {
    try {
      // 구형 Safari는 콜백 방식, 최신 브라우저는 Promise 반환
      const p = Notification.requestPermission((res) => resolve(res))
      if (p && typeof p.then === 'function') p.then(resolve, () => resolve(notifyPermission()))
    } catch {
      resolve(notifyPermission())
    }
  })
}

export async function showNotification(title, body) {
  if (notifyPermission() !== 'granted') return false
  const options = {
    body,
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icon-192.png`,
    tag: 'pomodoro-session',
    renotify: true,
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg?.showNotification) {
      await reg.showNotification(title, options)
      return true
    }
  } catch {
    /* 서비스워커 없음 → 아래 fallback */
  }
  try {
    const n = new Notification(title, options)
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return true
  } catch {
    return false
  }
}
