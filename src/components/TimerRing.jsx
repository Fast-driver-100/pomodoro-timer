const SIZE = 320
const STROKE = 10
const R = (SIZE - STROKE * 2) / 2 - 4
const C = 2 * Math.PI * R

export default function TimerRing({ progress, children }) {
  const p = Math.min(1, Math.max(0, progress))
  return (
    <div className="relative aspect-square w-[min(82vw,22rem)] md:w-[min(34vw,26rem)]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#ring-grad)"
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
