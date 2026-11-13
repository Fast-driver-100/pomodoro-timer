const SIZE = 320
const STROKE = 10
const R = (SIZE - STROKE * 2) / 2 - 4
const C = 2 * Math.PI * R

import { useId } from 'react'

// 기본 크기: 폭뿐 아니라 화면 높이(dvh)로도 제한해 낮은 화면에서 넘치지 않게
const DEFAULT_SIZE = 'w-[min(82vw,22rem)] md:w-[max(13rem,min(34vw,26rem,calc(100dvh_-_24rem)))]'

export default function TimerRing({ progress, children, className = DEFAULT_SIZE }) {
  const p = Math.min(1, Math.max(0, progress))
  // 링이 화면에 두 개(일반/집중 모드) 동시에 있을 수 있어 gradient id를 고유하게
  const gradId = `ring-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <div className={`timer-ring relative aspect-square ${className}`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--accent-2)' }} />
          </linearGradient>
        </defs>
        {/* 눈금 */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R + STROKE + 6}
          fill="none"
          style={{ stroke: 'color-mix(in srgb, var(--fg) 9%, transparent)' }}
          strokeWidth="2"
          strokeDasharray="1.5 10.5"
        />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} style={{ stroke: 'color-mix(in srgb, var(--fg) 7%, transparent)' }} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          style={{
            opacity: p <= 0.001 ? 0 : 1,
            transition: 'stroke-dashoffset 0.35s linear, opacity 0.3s',
            filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 55%, transparent))',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
