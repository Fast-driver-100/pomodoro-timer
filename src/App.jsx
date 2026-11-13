import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Settings2, SkipForward, Sun, Timer } from 'lucide-react'
import TimerRing from './components/TimerRing'
import TaskList from './components/TaskList'
import SoundPanel from './components/SoundPanel'
import SettingsModal from './components/SettingsModal'
import { DEFAULT_SETTINGS, MODES, formatTime, usePomodoro } from './hooks/usePomodoro'
import { todayKey, useLocalStorage } from './hooks/useLocalStorage'
import { useWakeLock } from './hooks/useWakeLock'
import { playBell, unlockAudio } from './lib/audio'

const THEMES = {
  focus: { a: '#f8734f', b: '#e5484d' }, // 차분한 오렌지 → 레드
  short: { a: '#10b981', b: '#14b8a6' }, // 에메랄드
  long: { a: '#3b82f6', b: '#10b981' }, // 블루 → 에메랄드
}

export default function App() {
  const [settings, setSettings] = useLocalStorage('pomo.settings', DEFAULT_SETTINGS)
  const mergedSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings])
  const [today, setToday] = useLocalStorage('pomo.today', { date: todayKey(), count: 0, minutes: 0 })
  const [tasks, setTasks] = useLocalStorage('pomo.tasks', [])
  const [activeId, setActiveId] = useLocalStorage('pomo.activeTask', null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 날짜가 바뀌면 오늘 카운트 자동 초기화
  const isToday = today.date === todayKey()
  const todayCount = isToday ? today.count : 0
  const todayMinutes = isToday ? today.minutes || 0 : 0

  const onSessionEnd = useCallback(
    (finishedMode, minutes) => {
      if (mergedSettings.bell) playBell(3)
      navigator.vibrate?.([200, 100, 200])
      if (finishedMode === 'focus') {
        const key = todayKey()
        setToday((t) => ({
          date: key,
          count: (t.date === key ? t.count : 0) + 1,
          minutes: (t.date === key ? t.minutes || 0 : 0) + minutes,
        }))
        if (activeId) setTasks((ts) => ts.map((t) => (t.id === activeId ? { ...t, pomos: (t.pomos || 0) + 1 } : t)))
      }
    },
    [mergedSettings.bell, activeId, setToday, setTasks],
  )

  const timer = usePomodoro(mergedSettings, onSessionEnd)
  const wakeLockActive = useWakeLock(timer.running)
  const theme = THEMES[timer.mode]
  const activeTask = tasks.find((t) => t.id === activeId && !t.done)

  // iOS 오디오 정책: '시작' 탭 시점에 AudioContext 활성화
  const toggleTimer = useCallback(() => {
    if (timer.running) timer.pause()
    else {
      unlockAudio()
      timer.start()
    }
  }, [timer])

  // 탭 제목에 실시간 남은 시간 표시
  useEffect(() => {
    document.title = `${timer.running ? '' : '⏸ '}${formatTime(timer.remaining)} · ${MODES[timer.mode].label}`
  }, [timer.remaining, timer.mode, timer.running])

  // 키보드 단축키: Space(시작/일시정지), R(리셋), S(스킵), 1·2·3(모드)
  // (keyRef.current는 아래 setModeMinutes 선언 이후에 갱신)
  const keyRef = useRef({})
  useEffect(() => {
    const onKey = (e) => {
      const { toggleTimer, timer, settingsOpen, setModeMinutes, mergedSettings } = keyRef.current
      if (settingsOpen || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.code === 'Space') {
        e.preventDefault()
        toggleTimer()
      } else if (e.code === 'KeyR') timer.reset()
      else if (e.code === 'KeyS') timer.skip()
      else if (e.key === '1') timer.switchMode('focus')
      else if (e.key === '2') timer.switchMode('short')
      else if (e.key === '3') timer.switchMode('long')
      else if ((e.code === 'ArrowUp' || e.code === 'ArrowDown') && !timer.running) {
        e.preventDefault()
        setModeMinutes(mergedSettings[timer.mode] + (e.code === 'ArrowUp' ? 1 : -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 타이머 숫자를 탭해서 현재 모드 시간을 바로 수정
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const MAX_MIN = { focus: 180, short: 60, long: 90 }
  const setModeMinutes = useCallback(
    (m) => {
      const mode = timer.mode
      const v = Math.min(MAX_MIN[mode], Math.max(1, Math.round(Number(m))))
      if (!Number.isFinite(v)) return
      setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, [mode]: v }))
      timer.reset()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timer.mode, timer.reset, setSettings],
  )
  const beginEdit = () => {
    if (timer.running) return
    setEditValue(String(mergedSettings[timer.mode]))
    setEditing(true)
  }
  const commitEdit = () => {
    if (editValue.trim() !== '') setModeMinutes(editValue)
    setEditing(false)
  }
  useEffect(() => {
    if (timer.running) setEditing(false)
  }, [timer.running])

  // 키보드 단축키 핸들러가 항상 최신 값을 보도록 (모든 의존 값 선언 이후에 할당해야 함)
  keyRef.current = { toggleTimer, timer, settingsOpen, setModeMinutes, mergedSettings }

  const saveSettings = (s) => {
    setSettings(s)
    if (!timer.running) timer.reset()
    setSettingsOpen(false)
  }

  const interval = mergedSettings.longInterval
  const filledDots = Math.min(timer.cycle, interval)

  return (
    <div className="theme-root min-h-dvh" style={{ '--accent': theme.a, '--accent-2': theme.b }}>
      <div className="bg-glow" aria-hidden />

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] md:px-[max(2rem,env(safe-area-inset-left))]">
        {/* 헤더 */}
        <header className="flex items-center justify-between py-3 md:py-5">
          <div className="flex items-center gap-2.5">
            <div className="accent-bg grid h-9 w-9 place-items-center rounded-xl shadow-lg">
              <Timer className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pomodoro</span>
          </div>
          <div className="flex items-center gap-2">
            {wakeLockActive && (
              <span
                className="hidden items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1.5 text-xs text-white/55 sm:flex"
                title="타이머 작동 중 화면 꺼짐 방지"
              >
                <Sun className="h-3.5 w-3.5" /> 화면 유지
              </span>
            )}
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
              <span>🍅</span>
              <span className="font-semibold tabular-nums">{todayCount}</span>
              <span className="text-white/40">· {todayMinutes}분</span>
            </span>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="설정"
              className="glass grid h-10 w-10 place-items-center rounded-full text-white/70 transition hover:text-white active:scale-95"
            >
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-6 lg:gap-8">
          {/* 타이머 */}
          <section className="glass flex flex-col items-center justify-between gap-6 rounded-[2rem] px-4 py-6 sm:px-8 md:py-8">
            {/* 모드 탭 */}
            <div className="flex w-full max-w-sm rounded-2xl bg-white/[0.05] p-1">
              {Object.entries(MODES).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => timer.switchMode(key)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ${
                    timer.mode === key ? 'accent-bg text-white shadow-lg' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 현재 작업 */}
            <div className="flex min-h-12 w-full max-w-md flex-col items-center text-center">
              <span className="text-[11px] font-medium tracking-[0.18em] text-white/35 uppercase">현재 작업</span>
              <span
                className={`mt-1 line-clamp-2 px-2 text-base font-medium sm:text-lg ${
                  activeTask ? 'text-white/90' : 'text-white/30'
                }`}
              >
                {activeTask ? activeTask.text : '할 일 목록에서 작업을 선택하세요'}
              </span>
            </div>

            <TimerRing progress={timer.progress}>
              <span className="accent-text text-sm font-semibold tracking-wide">{MODES[timer.mode].label}</span>
              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    commitEdit()
                  }}
                  className="my-1 flex items-baseline gap-2"
                >
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="done"
                    maxLength={3}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`${MODES[timer.mode].label} 시간(분)`}
                    className="time-digits w-[2.6ch] border-b-2 border-[var(--accent)] bg-transparent text-center text-[clamp(4rem,19vw,6.5rem)] leading-none font-semibold text-white outline-none md:text-[clamp(4rem,8vw,7rem)]"
                  />
                  <span className="text-2xl font-medium text-white/50">분</span>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={beginEdit}
                  disabled={timer.running}
                  title={timer.running ? undefined : '탭하여 시간 수정'}
                  aria-label={timer.running ? undefined : `남은 시간 ${formatTime(timer.remaining)}, 탭하여 수정`}
                  className="time-digits my-1 rounded-2xl px-2 text-[clamp(4rem,19vw,6.5rem)] leading-none font-semibold text-white transition enabled:hover:bg-white/[0.04] enabled:active:scale-95 disabled:cursor-default md:text-[clamp(4rem,8vw,7rem)]"
                >
                  {formatTime(timer.remaining)}
                </button>
              )}
              <div className="mt-2 flex items-center gap-1.5" aria-label={`${filledDots}/${interval} 세트`}>
                {Array.from({ length: interval }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i < filledDots ? 'accent-bg w-4' : 'w-1.5 bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <span
                className={`mt-3 h-4 text-[11px] text-white/35 transition-opacity ${
                  !timer.running && !editing ? 'opacity-100' : 'opacity-0'
                }`}
              >
                숫자를 탭해 시간 수정
              </span>
            </TimerRing>

            {/* 컨트롤 */}
            <div className="flex items-center gap-6 sm:gap-8">
              <button
                onClick={timer.reset}
                aria-label="리셋"
                className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.07] text-white/70 transition hover:bg-white/[0.12] hover:text-white active:scale-90"
              >
                <RotateCcw className="h-[22px] w-[22px]" />
              </button>
              <button
                onClick={toggleTimer}
                aria-label={timer.running ? '일시정지' : '시작'}
                className="accent-bg grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition active:scale-90"
              >
                {timer.running ? (
                  <Pause className="h-8 w-8" fill="currentColor" />
                ) : (
                  <Play className="ml-1 h-8 w-8" fill="currentColor" />
                )}
              </button>
              <button
                onClick={timer.skip}
                aria-label="다음 세션으로 건너뛰기"
                className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.07] text-white/70 transition hover:bg-white/[0.12] hover:text-white active:scale-90"
              >
                <SkipForward className="h-[22px] w-[22px]" fill="currentColor" />
              </button>
            </div>

            <p className="hidden gap-4 text-xs text-white/30 [@media(hover:hover)_and_(pointer:fine)]:flex">
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Space</kbd> 시작/정지
              </span>
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">R</kbd> 리셋
              </span>
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">S</kbd> 스킵
              </span>
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">1·2·3</kbd> 모드
              </span>
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">↑↓</kbd> ±1분
              </span>
            </p>
          </section>

          {/* 우측 패널 (모바일에서는 하단) */}
          <aside className="flex min-h-0 flex-col gap-5 md:gap-6">
            <TaskList tasks={tasks} setTasks={setTasks} activeId={activeId} setActiveId={setActiveId} />
            <SoundPanel />
          </aside>
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        settings={mergedSettings}
        onSave={saveSettings}
        onClose={() => setSettingsOpen(false)}
        onResetToday={() => {
          setToday({ date: todayKey(), count: 0, minutes: 0 })
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
