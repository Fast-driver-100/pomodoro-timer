import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, NotebookPen, Pause, Play, RotateCcw, Settings2, SkipForward, Sun } from 'lucide-react'
import TimerRing from './components/TimerRing'
import TaskList from './components/TaskList'
import SoundPanel from './components/SoundPanel'
import SettingsModal from './components/SettingsModal'
import SessionOverlay from './components/SessionOverlay'
import NotifyBanner from './components/NotifyBanner'
import JournalModal from './components/JournalModal'
import StatsPanel from './components/StatsPanel'
import FocusView from './components/FocusView'
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
  // 집중 모드(타이머 확대 화면) 표시 여부: 시작 시 켜지고, 종료·일시정지·리셋 시 꺼짐
  const [zen, setZen] = useState(false)
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
      setZen(false)

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
      setZen(true) // 시작하면 자동으로 집중 모드
    }
  }, [timer])

  // 일시정지·리셋·스킵 등으로 타이머가 멈추면 원래 화면으로
  useEffect(() => {
    if (!timer.running) setZen(false)
  }, [timer.running])

  // 집중 모드 중에는 뒤의 페이지가 스크롤되지 않게
  useEffect(() => {
    document.documentElement.style.overflow = zen ? 'hidden' : ''
  }, [zen])

  // 탭 제목에 실시간 남은 시간 표시
  useEffect(() => {
    document.title = `${timer.running ? '' : '⏸ '}${formatTime(timer.remaining)} · ${MODES[timer.mode].label}`
  }, [timer.remaining, timer.mode, timer.running])

  // 키보드 단축키: Space(시작/일시정지), R(리셋), S(스킵), 1·2·3(모드)
  // (keyRef.current는 아래 setModeMinutes 선언 이후에 갱신)
  const keyRef = useRef({})
  useEffect(() => {
    const onKey = (e) => {
      const { toggleTimer, timer, settingsOpen, overlay, journalOpen, zen, setModeMinutes, mergedSettings } =
        keyRef.current
      if (settingsOpen || overlay || journalOpen || e.metaKey || e.ctrlKey || e.altKey) return
      if (zen && e.key === 'Escape') {
        setZen(false) // 타이머는 계속, 전체 화면으로
        return
      }
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
  keyRef.current = { toggleTimer, timer, settingsOpen, overlay, journalOpen, zen, setModeMinutes, mergedSettings }

  const saveSettings = (s) => {
    setSettings(s)
    if (!timer.running) timer.reset()
    setSettingsOpen(false)
  }

  const interval = mergedSettings.longInterval
  const filledDots = Math.min(timer.cycle, interval)

  const modeKeys = Object.keys(MODES)
  const modeIndex = Math.max(0, modeKeys.indexOf(timer.mode))

  return (
    <div className="min-h-dvh">
      <div className="bg-glow" aria-hidden />

      <div
        inert={zen}
        aria-hidden={zen}
        className={`mx-auto flex min-h-dvh max-w-6xl flex-col transition-[opacity,transform,filter] duration-700 ease-[var(--ease-glide)] ${
          zen ? 'pointer-events-none scale-[0.96] opacity-0 blur-md' : ''
        } pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] md:px-[max(2.5rem,env(safe-area-inset-left))]`}
      >
        {/* 헤더 */}
        <header className="app-header flex items-center justify-between py-3 md:py-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="relative grid h-7 w-7 place-items-center">
              <span className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-40 blur-md" />
              <span className="accent-bg relative h-3.5 w-3.5 rounded-full shadow-[inset_0_1px_1px_rgb(255_255_255/0.6)]" />
            </span>
            <span
              className={`text-[19px] font-semibold tracking-[-0.022em] max-[380px]:hidden ${timer.running ? 'max-[430px]:hidden' : ''}`}
            >
              Pomodoro
            </span>
          </div>
          <div className="flex items-center gap-2">
            {wakeLockActive && (
              <span
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted sm:flex"
                title="타이머 작동 중 화면 꺼짐 방지"
              >
                <Sun className="h-3.5 w-3.5" /> 화면 유지
              </span>
            )}
            <span
              className="glass flex h-10 items-center gap-2 rounded-full px-4 text-sm"
              title={`오늘 ${todayCount}회, ${todayMinutes}분 집중`}
            >
              <span aria-hidden>🍅</span>
              <span className="font-semibold tabular-nums">{todayCount}</span>
              <span className={`tabular-nums text-faint ${timer.running ? 'max-[430px]:hidden' : ''}`}>
                {todayMinutes}분
              </span>
            </span>
            <button
              onClick={() => setJournalOpen(true)}
              aria-label="일지"
              title="집중 일지"
              className="glass grid h-10 w-10 place-items-center rounded-full text-fg/75 transition hover:text-fg active:scale-[0.94]"
            >
              <NotebookPen className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="설정"
              className="glass grid h-10 w-10 place-items-center rounded-full text-fg/75 transition hover:text-fg active:scale-[0.94]"
            >
              <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            {/* 우측 상단: 타이머가 도는 동안 집중 모드로 다시 전환 */}
            {timer.running && (
              <button
                onClick={() => setZen(true)}
                aria-label="집중 모드"
                title="집중 모드 (타이머 확대)"
                className="accent-soft accent-text anim-pop flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition active:scale-[0.96]"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">집중 모드</span>
              </button>
            )}
          </div>
        </header>

        {showNotifyBanner && (
          <NotifyBanner onEnable={enableNotifications} onDismiss={() => setNotifyPromptDismissed(true)} />
        )}

        <main className="app-main grid flex-1 gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-7 lg:gap-9">
          {/* 타이머 */}
          {/* md 이상: 오른쪽 열 길이에 맞춰 늘어나지 않도록 self-start + 스크롤 시 고정 */}
          <section className="timer-card glass flex flex-col items-center gap-7 rounded-[2.5rem] px-5 pt-5 pb-8 sm:px-10 md:sticky md:top-6 md:self-start md:pt-6 md:pb-10">
            {/* 모드 전환: Segmented control */}
            <div
              role="tablist"
              aria-label="타이머 모드"
              className="mode-tabs relative grid w-full max-w-[22rem] grid-cols-3 rounded-full bg-fg/[0.06] p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]"
            >
              <span
                aria-hidden
                className="seg-thumb absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full transition-transform duration-500 ease-[var(--ease-spring)] motion-reduce:transition-none"
                style={{ transform: `translateX(${modeIndex * 100}%)` }}
              />
              {Object.entries(MODES).map(([key, m]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={timer.mode === key}
                  onClick={() => timer.switchMode(key)}
                  className={`relative z-10 rounded-full py-2 text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-300 sm:text-sm ${
                    timer.mode === key ? 'text-fg' : 'text-muted hover:text-fg/80'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 현재 작업 */}
            <div className="timer-task flex min-h-11 w-full max-w-md items-center justify-center px-2 text-center">
              {activeTask ? (
                <p className="flex min-w-0 items-center gap-2.5 text-[17px] font-medium tracking-[-0.015em] text-fg/90">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
                  />
                  <span className="sr-only">현재 작업: </span>
                  <span className="line-clamp-2">{activeTask.text}</span>
                </p>
              ) : (
                <p className="text-[15px] text-faint">할 일에서 집중할 작업을 골라보세요</p>
              )}
            </div>

            <div className="timer-body flex flex-col items-center gap-8">
              <TimerRing progress={timer.progress}>
                <span className="accent-text text-[13px] font-semibold tracking-[0.02em]">
                  {MODES[timer.mode].label}
                </span>
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
                      className="time-digits w-[2.4ch] border-b border-[var(--accent)] bg-transparent text-center text-[clamp(4.25rem,20vw,7rem)] leading-none font-extralight text-fg caret-[var(--accent)] outline-none md:text-[clamp(3rem,min(8.5vw,10.5dvh),7.5rem)]"
                    />
                    <span className="text-2xl font-light text-muted">분</span>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={beginEdit}
                    disabled={timer.running}
                    title={timer.running ? undefined : '탭하여 시간 수정'}
                    aria-label={timer.running ? undefined : `남은 시간 ${formatTime(timer.remaining)}, 탭하여 수정`}
                    className="time-digits timer-digits my-1 rounded-3xl px-3 text-[clamp(4.25rem,20vw,7rem)] leading-none font-extralight text-fg transition enabled:hover:bg-fg/[0.04] enabled:active:scale-[0.97] disabled:cursor-default md:text-[clamp(3rem,min(8.5vw,10.5dvh),7.5rem)]"
                  >
                    {formatTime(timer.remaining)}
                  </button>
                )}
                <div className="mt-3 flex items-center gap-2" aria-label={`${filledDots}/${interval} 세트`}>
                  {Array.from({ length: interval }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                        i < filledDots ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]' : 'bg-fg/20'
                      }`}
                    />
                  ))}
                </div>
                <span
                  className={`timer-hint mt-3 h-4 text-[11px] text-faint transition-opacity duration-500 ${
                    !timer.running && !editing ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  숫자를 탭해 시간 수정
                </span>
              </TimerRing>

              {/* 컨트롤 */}
              <div className="timer-controls flex items-center gap-5 sm:gap-7">
                <button
                  onClick={timer.reset}
                  aria-label="리셋"
                  className="btn-glass grid h-[52px] w-[52px] place-items-center rounded-full"
                >
                  <RotateCcw className="h-5 w-5" strokeWidth={1.9} />
                </button>
                <button
                  onClick={toggleTimer}
                  aria-label={timer.running ? '일시정지' : '시작'}
                  className="play-btn btn-primary flex h-16 min-w-[10rem] items-center justify-center gap-2.5 rounded-full px-8 text-[17px] font-semibold tracking-[-0.01em]"
                >
                  {timer.running ? (
                    <Pause className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                  )}
                  <span className="play-label">{timer.running ? '일시정지' : timer.isFresh ? '시작' : '계속'}</span>
                </button>
                <button
                  onClick={timer.skip}
                  aria-label="다음 세션으로 건너뛰기"
                  className="btn-glass grid h-[52px] w-[52px] place-items-center rounded-full"
                >
                  <SkipForward className="h-5 w-5" fill="currentColor" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <p className="timer-hints hidden flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-faint [@media(hover:hover)_and_(pointer:fine)]:flex">
              {[
                ['Space', '시작/정지'],
                ['R', '리셋'],
                ['S', '스킵'],
                ['1 2 3', '모드'],
                ['↑↓', '±1분'],
              ].map(([k, label]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <kbd className="rounded-md bg-fg/[0.07] px-1.5 py-0.5 font-sans text-[11px] text-muted shadow-[inset_0_-1px_0_var(--hairline)]">
                    {k}
                  </kbd>
                  {label}
                </span>
              ))}
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

      <FocusView
        visible={zen && timer.running}
        remaining={timer.remaining}
        progress={timer.progress}
        modeLabel={MODES[timer.mode].label}
        onPause={toggleTimer}
        onStop={timer.reset}
        onShowFull={() => setZen(false)}
      />

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
