import { useEffect, useState } from 'react'
import { Check, Minus, Moon, Plus, Sun, X } from 'lucide-react'
import { ACCENTS } from '../lib/theme'

function Stepper({ label, unit, value, min, max, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
      <span className="text-[15px] tracking-[-0.01em] text-fg/90">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full bg-fg/[0.07] p-0.5">
          <button
            type="button"
            onClick={() => onChange(clamp(value - 1))}
            aria-label={`${label} 줄이기`}
            className="grid h-8 w-9 place-items-center rounded-full text-fg/75 transition hover:bg-fg/[0.08] active:scale-90"
          >
            <Minus className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            aria-label={`${label} (${unit})`}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={(e) => onChange(clamp(e.target.value))}
            className="time-digits w-10 bg-transparent text-center text-base font-medium text-fg outline-none"
          />
          <button
            type="button"
            onClick={() => onChange(clamp(value + 1))}
            aria-label={`${label} 늘리기`}
            className="grid h-8 w-9 place-items-center rounded-full text-fg/75 transition hover:bg-fg/[0.08] active:scale-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
        <span className="w-4 text-[13px] text-faint">{unit}</span>
      </div>
    </div>
  )
}

function Switch({ on }) {
  return (
    <span
      aria-hidden
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ${
        on ? 'accent-bg' : 'bg-fg/[0.16]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-transform duration-300 ease-[var(--ease-spring)] ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </span>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2 text-left"
    >
      <span className="text-[15px] tracking-[-0.01em] text-fg/90">{label}</span>
      <Switch on={checked} />
    </button>
  )
}

function Group({ title, children, note }) {
  return (
    <div className="mt-6 first:mt-2">
      <h3 className="mb-2 px-4 text-[13px] text-muted">{title}</h3>
      <div className="group-box divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl">{children}</div>
      {note && <p className="mt-2 px-4 text-xs leading-relaxed text-faint">{note}</p>}
    </div>
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
      className="scrim anim-fade fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="설정"
        onClick={(e) => e.stopPropagation()}
        className="sheet anim-sheet max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[2rem] px-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[2rem] sm:pt-5 sm:pb-5"
      >
        <span aria-hidden className="mx-auto mb-2 block h-1.5 w-9 rounded-full bg-fg/20 sm:hidden" />
        <div className="flex items-center justify-between px-2 pb-1">
          <h2 className="text-[22px] font-bold tracking-[-0.025em]">설정</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="btn-glass grid h-8 w-8 place-items-center rounded-full"
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>

        <Group title="시간">
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
        </Group>

        <Group title="동작">
          <Toggle label="휴식 자동 시작" checked={draft.autoStartBreak} onChange={set('autoStartBreak')} />
          <Toggle label="집중 자동 시작" checked={draft.autoStartFocus} onChange={set('autoStartFocus')} />
          <Toggle label="종료 알림음" checked={draft.bell} onChange={set('bell')} />
          <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
            <span className="text-[15px] tracking-[-0.01em] text-fg/90">세션 종료 알림</span>
            {notifyPermission === 'default' ? (
              <button
                type="button"
                onClick={onEnableNotify}
                className="accent-soft accent-text rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.96]"
              >
                알림 켜기
              </button>
            ) : (
              <span className="text-right text-[13px] text-muted">{NOTIFY_LABEL[notifyPermission]}</span>
            )}
          </div>
        </Group>

        <Group title="테마" note="집중 모드에는 선택한 색상이, 휴식 모드에는 청록·파랑이 적용돼요. 바로 반영됩니다.">
          <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
            <span className="text-[15px] tracking-[-0.01em] text-fg/90">화면</span>
            <div
              className="relative grid grid-cols-2 rounded-full bg-fg/[0.07] p-0.5"
              role="radiogroup"
              aria-label="화면 테마"
            >
              <span
                aria-hidden
                className="seg-thumb absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/2)] rounded-full transition-transform duration-500 ease-[var(--ease-spring)]"
                style={{ transform: theme.mode === 'light' ? 'translateX(100%)' : undefined }}
              />
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
                  className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    theme.mode === id ? 'text-fg' : 'text-muted hover:text-fg/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
            <span className="text-[15px] tracking-[-0.01em] text-fg/90">집중 색상</span>
            <div className="flex gap-2.5" role="radiogroup" aria-label="집중 모드 포인트 색상">
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
                    className={`swatch-${a.id} grid h-8 w-8 place-items-center rounded-full shadow-[inset_0_1px_1px_rgb(255_255_255/0.45)] transition duration-300 ease-[var(--ease-spring)] active:scale-90 ${
                      selected ? 'scale-110 outline-2 outline-offset-2 outline-fg/60' : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.2} />}
                  </button>
                )
              })}
            </div>
          </div>
        </Group>

        <div className="mt-7 flex items-center gap-3 px-1">
          <button
            onClick={onResetToday}
            className="rounded-full px-4 py-3 text-[15px] text-red-500 transition hover:bg-red-500/10"
          >
            오늘 기록 초기화
          </button>
          <button
            onClick={save}
            className="btn-primary ml-auto h-12 rounded-full px-8 text-[16px] font-semibold"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
