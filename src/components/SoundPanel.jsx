import { useEffect, useState } from 'react'
import { CloudRain, Flame, Waves, Volume1, Volume2, Headphones } from 'lucide-react'
import { SOUNDS, setSoundVolume, startSound, stopSound, unlockAudio } from '../lib/audio'
import { useLocalStorage } from '../hooks/useLocalStorage'

const ICONS = { rain: CloudRain, fire: Flame, brown: Waves }

export default function SoundPanel() {
  const [volumes, setVolumes] = useLocalStorage('pomo.soundVolumes', { rain: 0.6, fire: 0.6, brown: 0.5 })
  // 재생 상태는 저장하지 않음 (브라우저 정책상 사용자 제스처 없이 자동 재생 불가)
  const [playing, setPlaying] = useState({})

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
    <section className="glass rounded-3xl p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg/90">
          <Headphones className="h-[18px] w-[18px] accent-text" />
          집중 사운드
        </h2>
        <span className="text-xs text-faint">Web Audio 합성</span>
      </header>

      <div className="space-y-2.5">
        {SOUNDS.map((s) => {
          const Icon = ICONS[s.id]
          const on = !!playing[s.id]
          const vol = volumes[s.id] ?? 0.5
          return (
            <div
              key={s.id}
              className={`rounded-2xl border p-3 transition ${on ? 'accent-soft' : 'border-fg/5 bg-fg/[0.025]'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                    on ? 'accent-bg text-white' : 'bg-fg/[0.06] text-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-fg/90">{s.label}</div>
                  <div className="text-xs text-faint">{s.desc}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={`${s.label} ${on ? '끄기' : '켜기'}`}
                  onClick={() => toggle(s.id)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    on ? 'accent-bg' : 'bg-fg/15'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${
                      on ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2.5 pl-1">
                <Volume1 className="h-4 w-4 shrink-0 text-faint" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={vol}
                  onChange={(e) => changeVolume(s.id, Number(e.target.value))}
                  aria-label={`${s.label} 볼륨`}
                  className="h-1.5 w-full cursor-pointer"
                />
                <Volume2 className="h-4 w-4 shrink-0 text-faint" />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
