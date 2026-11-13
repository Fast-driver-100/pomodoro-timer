import { useEffect, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'

function Stepper({ label, unit, value, min, max, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[15px] text-white/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          aria-label={`${label} 줄이기`}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70 transition active:scale-95"
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
          className="time-digits w-14 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 text-center text-base text-white outline-none focus:border-white/30"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`${label} 늘리기`}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="w-6 text-xs text-white/40">{unit}</span>
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
      <span className="text-[15px] text-white/80">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'accent-bg' : 'bg-white/15'}`}>
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

export default function SettingsModal({ open, settings, onSave, onClose, onResetToday }) {
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
        className="glass w-full max-w-md rounded-t-3xl bg-[#101119]/90 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">설정</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-xs font-medium tracking-wide text-white/35">시간</p>
        <div className="divide-y divide-white/5">
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

        <p className="mt-4 text-xs font-medium tracking-wide text-white/35">동작</p>
        <div className="divide-y divide-white/5">
          <Toggle label="휴식 자동 시작" checked={draft.autoStartBreak} onChange={set('autoStartBreak')} />
          <Toggle label="집중 자동 시작" checked={draft.autoStartFocus} onChange={set('autoStartFocus')} />
          <Toggle label="종료 알림음" checked={draft.bell} onChange={set('bell')} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onResetToday}
            className="rounded-2xl px-4 py-3 text-sm text-white/45 transition hover:bg-white/5 hover:text-red-300"
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
