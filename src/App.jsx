import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NotebookPen, Pause, Play, RotateCcw, Settings2, SkipForward, Sun, Timer } from 'lucide-react'
import TimerRing from './components/TimerRing'
import TaskList from './components/TaskList'
import SoundPanel from './components/SoundPanel'
import SettingsModal from './components/SettingsModal'
import SessionOverlay from './components/SessionOverlay'
import NotifyBanner from './components/NotifyBanner'
import JournalModal from './components/JournalModal'
import StatsPanel from './components/StatsPanel'
import { DEFAULT_SETTINGS, MODES, formatTime, usePomodoro } from './hooks/usePomodoro'
import { todayKey, useLocalStorage } from './hooks/useLocalStorage'
import { useWakeLock } from './hooks/useWakeLock'
import { playBell, unlockAudio } from './lib/audio'
import { needsMigration, normalizeTask } from './lib/tasks'
import { DEFAULT_THEME, THEME_KEY, applyTheme, normalizeTheme } from './lib/theme'
import { HISTORY_KEY, HISTORY_LIMIT, migrateLegacyToday, summarizeDay } from './lib/history'
import { notifyPermission, requestNotifyPermission, showNotification } from './lib/notify'

export default function App() {
  const [settings, setSettings] = useLocalStorage('pomo.settings', DEFAULT_SETTINGS)
  const mergedSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings])
  // 이전 버전 pomo.today → pomo.history 1회 이관 (history 훅 초기화보다 먼저 실행되어야 함)
  useState(migrateLegacyToday)
  const [rawHistory, setHistory] = useLocalStorage(HISTORY_KEY, [])
  const history = useMemo(() => (Array.isArray(rawHistory) ? rawHistory : []), [rawHistory])
  const [rawTasks, setTasks] = useLocalStorage('pomo.tasks', [])
  // 이전 버전 작업 데이터({ pomos } 등) → { id, text, done, estimated, completed }
  const tasks = useMemo(() => (Array.isArray(rawTasks) ? rawTasks : []).map(normalizeTask), [rawTasks])
  useEffect(() => {
    if (!Array.isArray(rawTasks) || rawTasks.some(needsMigration)) setTasks(tasks)
  }, [rawTasks, tasks, setTasks])
  const [activeId, setActiveId] = useLocalStorage('pomo.activeTask', null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rawTheme, setTheme] = useLocalStorage(THEME_KEY, DEFAULT_THEME)
  const theme = useMemo(() => normalizeTheme(rawTheme), [rawTheme])
  useEffect(() => applyTheme(theme), [theme])
  const [overlay, setOverlay] = useState(null)
  const [journalOpen, setJournalOpen] = useState(false)
  const [journal, setJournal] = useLocalStorage('pomo.journal', [])
  const JOURNAL_LIMIT = 500
  const saveNote = useCallback(
    (note, d) =>
      setJournal((j) =>
        [
          ...(Array.isArray(j) ? j : []),
          { date: new Date(d.id).toISOString(), taskText: d.taskText || '', minutes: d.minutes, note },
        ].slice(-JOURNAL_LIMIT),
      ),
    [setJournal],
  )
  const deleteNote = useCallback((date) => setJournal((j) => j.filter((e) => e.date !== date)), [setJournal])
  const closeOverlay = useCallback(() => setOverlay(null), [])

  // 알림 권한 안내 배너: 지원 환경 + 아직 묻지 않음 + 사용자가 닫지 않음
  const [notifyPerm, setNotifyPerm] = useState(() => notifyPermission())
  const [notifyPromptDismissed, setNotifyPromptDismissed] = useLocalStorage('pomo.notifyPromptDismissed', false)
  const showNotifyBanner = notifyPerm === 'default' && !notifyPromptDismissed
  const enableNotifications = useCallback(() => {
    requestNotifyPermission().then((p) => {
      setNotifyPerm(p)
      if (p !== 'default') setNotifyPromptDismissed(true)
    })
  }, [setNotifyPromptDismissed])

  // onSessionEnd는 타이머 훅보다 먼저 선언되므로 최신 값은 ref로 읽음 (선언 순서 TDZ 방지)
  const latest = useRef({})

  // 오늘 횟수/분은 history에서 파생 (날짜가 바뀌면 자연히 0부터)
  const todayStr = todayKey()
  const { count: todayCount, minutes: todayMinutes } = useMemo(
    () => summarizeDay(history, todayStr),
    [history, todayStr],
  )

  const onSessionEnd = useCallback(
    (finishedMode, minutes) => {
      if (mergedSettings.bell) playBell(3)
      navigator.vibrate?.([200, 100, 200])

      // 다음 모드 계산 (usePomodoro의 advance 규칙과 동일)
      const { cycle, activeTask } = latest.current
      const nextMode =
        finishedMode === 'focus' ? (cycle + 1 >= mergedSettings.longInterval ? 'long' : 'short') : 'focus'
      const nextMinutes = mergedSettings[nextMode]
      const taskText = finishedMode === 'focus' ? activeTask?.text ?? '' : ''
      const data = { id: Date.now(), finishedMode, minutes, nextMode, nextMinutes, taskText }
      // 메모를 남길 수 있는 집중 종료 오버레이는 휴식 종료 오버레이로 덮어쓰지 않음
      setOverlay((cur) => (cur?.finishedMode === 'focus' && finishedMode !== 'focus' ? cur : data))

      // 화면을 보고 있지 않을 때만 시스템 알림 (보고 있으면 오버레이로 충분)
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        const title = finishedMode === 'focus' ? `${minutes}분 집중 완료! 🍅` : '휴식 끝! 🔥'
        const body =
          finishedMode === 'focus'
            ? `${nextMinutes}분 ${nextMode === 'long' ? '긴 휴식' : '휴식'}을 시작하세요.`
            : `다시 ${nextMinutes}분 집중해볼까요?`
        showNotification(title, body)
      }
      if (finishedMode === 'focus') {
        setHistory((h) =>
          [
            ...(Array.isArray(h) ? h : []),
            { date: todayKey(), minutes, taskId: activeId ?? null, taskText: activeTask?.text ?? '' },
          ].slice(-HISTORY_LIMIT),
        )
        if (activeId)
          setTasks((ts) =>
            ts.map(normalizeTask).map((t) => (t.id === activeId ? { ...t, completed: t.completed + 1 } : t)),
          )
      }
    },
    [mergedSettings, activeId, setHistory, setTasks],
  )

  const timer = usePomodoro(mergedSettings, onSessionEnd)
  const wakeLockActive = useWakeLock(timer.running)
  const activeTask = tasks.find((t) => t.id === activeId && !t.done)
  latest.current = { cycle: timer.cycle, activeTask }

  // 모드에 따라 <html data-mode>를 바꿔 CSS 변수 테마 전환 (transition 0.6s)
  useEffect(() => {
    document.documentElement.dataset.mode = timer.mode
  }, [timer.mode])

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
      const { toggleTimer, timer, settingsOpen, overlay, journalOpen, setModeMinutes, mergedSettings } = keyRef.current
      if (settingsOpen || overlay || journalOpen || e.metaKey || e.ctrlKey || e.altKey) return
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
  keyRef.current = { toggleTimer, timer, settingsOpen, overlay, journalOpen, setModeMinutes, mergedSettings }

  const saveSettings = (s) => {
    setSettings(s)
    if (!timer.running) timer.reset()
    setSettingsOpen(false)
  }

  const interval = mergedSettings.longInterval
  const filledDots = Math.min(timer.cycle, interval)

  return (
    <div className="min-h-dvh">
      <div className="bg-glow" aria-hidden />

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] md:px-[max(2rem,env(safe-area-inset-left))]">
        {/* 헤더 */}
        <header className="flex items-center justify-between py-3 md:py-5">
          <div className="flex items-center gap-2.5">
            <div className="accent-bg grid h-9 w-9 place-items-center rounded-xl shadow-lg">
              <Timer className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight max-[380px]:hidden">Pomodoro</span>
          </div>
          <div className="flex items-center gap-2">
            {wakeLockActive && (
              <span
                className="hidden items-center gap-1 rounded-full bg-fg/[0.06] px-2.5 py-1.5 text-xs text-muted sm:flex"
                title="타이머 작동 중 화면 꺼짐 방지"
              >
                <Sun className="h-3.5 w-3.5" /> 화면 유지
              </span>
            )}
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
              <span>🍅</span>
              <span className="font-semibold tabular-nums">{todayCount}</span>
              <span className="text-faint">· {todayMinutes}분</span>
            </span>
            <button
              onClick={() => setJournalOpen(true)}
              aria-label="일지"
              title="집중 일지"
              className="glass grid h-10 w-10 place-items-center rounded-full text-fg/70 transition hover:text-fg active:scale-95"
            >
              <NotebookPen className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="설정"
              className="glass grid h-10 w-10 place-items-center rounded-full text-fg/70 transition hover:text-fg active:scale-95"
            >
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {showNotifyBanner && (
          <NotifyBanner onEnable={enableNotifications} onDismiss={() => setNotifyPromptDismissed(true)} />
        )}

        <main className="grid flex-1 gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-6 lg:gap-8">
          {/* 타이머 */}
          <section className="glass flex flex-col items-center justify-between gap-6 rounded-[2rem] px-4 py-6 sm:px-8 md:py-8">
            {/* 모드 탭 */}
            <div className="flex w-full max-w-sm rounded-2xl bg-fg/[0.05] p-1">
              {Object.entries(MODES).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => timer.switchMode(key)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ${
                    timer.mode === key ? 'accent-bg text-white shadow-lg' : 'text-muted hover:text-fg/80'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 현재 작업 */}
            <div className="flex min-h-12 w-full max-w-md flex-col items-center text-center">
              <span className="text-[11px] font-medium tracking-[0.18em] text-faint uppercase">현재 작업</span>
              <span
                className={`mt-1 line-clamp-2 px-2 text-base font-medium sm:text-lg ${
                  activeTask ? 'text-fg/90' : 'text-faint'
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
                    className="time-digits w-[2.6ch] border-b-2 border-[var(--accent)] bg-transparent text-center text-[clamp(4rem,19vw,6.5rem)] leading-none font-semibold text-fg outline-none md:text-[clamp(4rem,8vw,7rem)]"
                  />
                  <span className="text-2xl font-medium text-muted">분</span>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={beginEdit}
                  disabled={timer.running}
                  title={timer.running ? undefined : '탭하여 시간 수정'}
                  aria-label={timer.running ? undefined : `남은 시간 ${formatTime(timer.remaining)}, 탭하여 수정`}
                  className="time-digits my-1 rounded-2xl px-2 text-[clamp(4rem,19vw,6.5rem)] leading-none font-semibold text-fg transition enabled:hover:bg-fg/[0.04] enabled:active:scale-95 disabled:cursor-default md:text-[clamp(4rem,8vw,7rem)]"
                >
                  {formatTime(timer.remaining)}
                </button>
              )}
              <div className="mt-2 flex items-center gap-1.5" aria-label={`${filledDots}/${interval} 세트`}>
                {Array.from({ length: interval }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i < filledDots ? 'accent-bg w-4' : 'w-1.5 bg-fg/20'
                    }`}
                  />
                ))}
              </div>
              <span
                className={`mt-3 h-4 text-[11px] text-faint transition-opacity ${
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
                className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.07] text-fg/70 transition hover:bg-fg/[0.12] hover:text-fg active:scale-90"
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
                className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.07] text-fg/70 transition hover:bg-fg/[0.12] hover:text-fg active:scale-90"
              >
                <SkipForward className="h-[22px] w-[22px]" fill="currentColor" />
              </button>
            </div>

            <p className="hidden gap-4 text-xs text-faint [@media(hover:hover)_and_(pointer:fine)]:flex">
              <span>
                <kbd className="rounded bg-fg/10 px-1.5 py-0.5 font-sans">Space</kbd> 시작/정지
              </span>
              <span>
                <kbd className="rounded bg-fg/10 px-1.5 py-0.5 font-sans">R</kbd> 리셋
              </span>
              <span>
                <kbd className="rounded bg-fg/10 px-1.5 py-0.5 font-sans">S</kbd> 스킵
              </span>
              <span>
                <kbd className="rounded bg-fg/10 px-1.5 py-0.5 font-sans">1·2·3</kbd> 모드
              </span>
              <span>
                <kbd className="rounded bg-fg/10 px-1.5 py-0.5 font-sans">↑↓</kbd> ±1분
              </span>
            </p>
          </section>

          {/* 우측 패널 (모바일에서는 하단) */}
          <aside className="flex min-h-0 flex-col gap-5 md:gap-6">
            <TaskList tasks={tasks} setTasks={setTasks} activeId={activeId} setActiveId={setActiveId} />
            {/* 데스크톱: 할 일 바로 아래 / 모바일: 맨 아래 */}
            <div className="order-last md:order-none">
              <StatsPanel history={history} tasks={tasks} />
            </div>
            <SoundPanel />
          </aside>
        </main>
      </div>

      {overlay && <SessionOverlay data={overlay} onClose={closeOverlay} onSaveNote={saveNote} />}

      <JournalModal
        open={journalOpen}
        entries={Array.isArray(journal) ? journal : []}
        onClose={() => setJournalOpen(false)}
        onDelete={deleteNote}
      />

      <SettingsModal
        open={settingsOpen}
        theme={theme}
        onThemeChange={(patch) => setTheme((t) => normalizeTheme({ ...normalizeTheme(t), ...patch }))}
        notifyPermission={notifyPerm}
        onEnableNotify={enableNotifications}
        settings={mergedSettings}
        onSave={saveSettings}
        onClose={() => setSettingsOpen(false)}
        onResetToday={() => {
          setHistory((h) => (Array.isArray(h) ? h : []).filter((e) => e.date !== todayKey()))
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
