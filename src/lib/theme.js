// 테마 설정: localStorage 'pomo.theme' = { mode: 'dark' | 'light', accent: 'orange' | 'mint' | 'purple' | 'rose' }
// 실제 색상 값은 index.css의 CSS 변수(--orange-a 등)가 단일 출처

export const THEME_KEY = 'pomo.theme'
export const DEFAULT_THEME = { mode: 'dark', accent: 'orange' }

export const ACCENTS = [
  { id: 'orange', label: '오렌지' },
  { id: 'mint', label: '민트' },
  { id: 'purple', label: '보라' },
  { id: 'rose', label: '로즈' },
]

const BG = { dark: '#07080c', light: '#f2f2f5' }

export function normalizeTheme(t) {
  const mode = t?.mode === 'light' ? 'light' : 'dark'
  const accent = ACCENTS.some((a) => a.id === t?.accent) ? t.accent : DEFAULT_THEME.accent
  return { mode, accent }
}

/** <html data-theme data-accent> 적용 + 브라우저 UI 색(theme-color) 동기화 */
export function applyTheme(theme) {
  const { mode, accent } = normalizeTheme(theme)
  const root = document.documentElement
  root.dataset.theme = mode
  root.dataset.accent = accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[mode])
}
