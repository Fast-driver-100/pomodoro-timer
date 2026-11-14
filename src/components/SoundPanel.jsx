import { useEffect, useState } from 'react'
import { CloudRain, Flame, Waves } from 'lucide-react'
import { SOUNDS, setSoundVolume, startSound, stopSound, unlockAudio } from '../lib/audio'
import { useLocalStorage } from '../hooks/useLocalStorage'

const ICONS = { rain: CloudRain, fire: Flame, brown: Waves }

export default function SoundPanel() {
  const [volumes, setVolumes] = useLocalStorage('pomo.soundVolumes', { rain: 0.6, fire: 0.6, brown: 0.5 })
  // 재생 상태는 저장하지 않음 (브라우저 정책상 사용자 제스처 없이 자동 재생 불가)
  const [playing, setPlaying] = useState({})
  const playingCount = Object.values(playing).filter(Boolean).length

  useEffect(() => () => SOUNDS.forEach((s) => stopSound(s.id)), [])

  const toggle = (id) => {
    unlockAudio()
    if (playing[id]) {
      stopSound(id)
      setPlaying((p) => ({ ...p, [id]: false }))
    } else if (startSound(id, volumes[id] ?? 0.5)) {
      setPlaying((p) => ({ ...p, [id]: true }))
    }
  }

  const changeVolume = (id, v) => {
    setVolumes((vs) => ({ ...vs, [id]: v }))
    setSoundVolume(id, v)
  }

  return (
    <section className="glass rounded-[1.75rem] p-5 sm:p-6">
      <header className="mb-4 flex items-baseline justify-between px-0.5">
        <h2 className="text-[19px] font-semibold tracking-[-0.022em]">집중 사운드</h2>
        {playingCount > 0 && <span className="accent-text text-[13px] font-medium">{playingCount}개 재생 중</span>}
      </header>

      <div className="space-y-4">
        {SOUNDS.map((s) => {
          const Icon = ICONS[s.id]
          const on = !!playing[s.id]
          const vol = volumes[s.id] ?? 0.5
          return (
            <div key={s.id} className="flex items-center gap-3.5">
              <button
                role="switch"
                aria-checked={on}
                aria-label={`${s.label} ${on ? '끄기' : '켜기'}`}
                onClick={() => toggle(s.id)}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${on ? 'btn-primary' : 'btn-glass'}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                  <span className={`text-[15px] font-medium tracking-[-0.01em] ${on ? 'text-fg' : 'text-fg/80'}`}>
                    {s.label}
                  </span>
                  <span className="truncate text-xs text-faint">{s.desc}</span>
                </div>
                {/* 제어 센터 슬라이더: 채워진 면적이 곧 볼륨 */}
                <div className="relative h-7 overflow-hidden rounded-full bg-fg/[0.07] shadow-[inset_0_0_0_1px_var(--hairline)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color-mix(in_srgb,var(--accent)_75%,transparent)]">
                  <div
                    className={`pointer-events-none absolute inset-y-0 left-0 rounded-full transition-[background-color,box-shadow] duration-500 ${
                      on
                        ? 'bg-[color-mix(in_srgb,var(--fg)_88%,transparent)] shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_40%,transparent)]'
                        : 'bg-fg/25'
                    }`}
                    style={{ width: `calc(1.75rem + (100% - 1.75rem) * ${vol})` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vol}
                    onChange={(e) => changeVolume(s.id, Number(e.target.value))}
                    aria-label={`${s.label} 볼륨`}
                    className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
