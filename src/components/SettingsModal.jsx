import { useEffect, useState } from 'react'
import { Check, Minus, Moon, Plus, Sun, X } from 'lucide-react'
import { ACCENTS } from '../lib/theme'

function Stepper({ label, unit, value, min, max, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[15px] text-fg/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          aria-label={`${label} 줄이기`}
          className="grid h-9 w-9 place-items-center rounded-xl bg-fg/[0.06] text-fg/70 transition active:scale-95"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          onBlur={(e) => onChange(clamp(e.target.value))}
          className="time-digits w-14 rounded-xl border border-fg/10 bg-fg/[0.04] py-1.5 text-center text-base text-fg outline-none focus:border-fg/30"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`${label} 늘리기`}
          className="grid h-9 w-9 place-items-center rounded-xl bg-fg/[0.06] text-fg/70 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="w-6 text-xs text-faint">{unit}</span>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-2.5 text-left"
    >
      <span className="text-[15px] text-fg/80">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'accent-bg' : 'bg-fg/15'}`}>
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

const NOTIFY_LABEL = {
  granted: '켜짐',
  denied: '차단됨 · 브라우저 설정에서 변경',
  unsupported: '이 브라우저에서 미지원',
}

export default function SettingsModal({
  open,
  settings,
  onSave,
  onClose,
  onResetToday,
  notifyPermission,
  onEnableNotify,
  theme,
  onThemeChange,
}) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    const fix = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))
    onSave({
      ...draft,
      focus: fix(draft.focus, 1, 180),
      short: fix(draft.short, 1, 60),
      long: fix(draft.long, 1, 90),
      longInterval: fix(draft.longInterval, 2, 12),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="설정"
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-[var(--surface)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">설정</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-fg/10 hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-xs font-medium tracking-wide text-faint">시간</p>
        <div className="divide-y divide-fg/5">
          <Stepper label="집중" unit="분" value={draft.focus} min={1} max={180} onChange={set('focus')} />
          <Stepper label="짧은 휴식" unit="분" value={draft.short} min={1} max={60} onChange={set('short')} />
          <Stepper label="긴 휴식" unit="분" value={draft.long} min={1} max={90} onChange={set('long')} />
          <Stepper
            label="긴 휴식 간격"
            unit="회"
            value={draft.longInterval}
            min={2}
            max={12}
            onChange={set('longInterval')}
          />
        </div>

        <p className="mt-4 text-xs font-medium tracking-wide text-faint">동작</p>
        <div className="divide-y divide-fg/5">
          <Toggle label="휴식 자동 시작" checked={draft.autoStartBreak} onChange={set('autoStartBreak')} />
          <Toggle label="집중 자동 시작" checked={draft.autoStartFocus} onChange={set('autoStartFocus')} />
          <Toggle label="종료 알림음" checked={draft.bell} onChange={set('bell')} />
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[15px] text-fg/80">세션 종료 알림</span>
            {notifyPermission === 'default' ? (
              <button
                type="button"
                onClick={onEnableNotify}
                className="accent-soft accent-text rounded-xl border px-3 py-1.5 text-sm font-semibold transition active:scale-95"
              >
                알림 켜기
              </button>
            ) : (
              <span className="text-right text-xs text-muted">{NOTIFY_LABEL[notifyPermission]}</span>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs font-medium tracking-wide text-faint">
          테마 <span className="font-normal">· 즉시 적용</span>
        </p>
        <div className="divide-y divide-fg/5">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[15px] text-fg/80">화면</span>
            <div className="flex rounded-xl bg-fg/[0.06] p-1" role="radiogroup" aria-label="화면 테마">
              {[
                { id: 'dark', label: '다크', Icon: Moon },
                { id: 'light', label: '라이트', Icon: Sun },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme.mode === id}
                  onClick={() => onThemeChange({ mode: id })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    theme.mode === id ? 'bg-[var(--surface)] text-fg shadow' : 'text-muted hover:text-fg/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[15px] text-fg/80">집중 색상</span>
            <div className="flex gap-2" role="radiogroup" aria-label="집중 모드 포인트 색상">
              {ACCENTS.map((a) => {
                const selected = theme.accent === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => onThemeChange({ accent: a.id })}
                    className={`swatch-${a.id} grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${
                      selected ? 'ring-2 ring-fg/70 ring-offset-2 ring-offset-[var(--bg)]' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <p className="mt-1 text-xs text-faint">집중 모드에 선택한 색상이, 휴식 모드에는 청록·파랑이 적용돼요.</p>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onResetToday}
            className="rounded-2xl px-4 py-3 text-sm text-muted transition hover:bg-fg/5 hover:text-red-300"
          >
            오늘 기록 초기화
          </button>
          <button
            onClick={save}
            className="accent-bg ml-auto rounded-2xl px-6 py-3 text-[15px] font-semibold text-white shadow-lg transition active:scale-95"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
