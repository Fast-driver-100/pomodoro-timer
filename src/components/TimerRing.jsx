import { useId } from 'react'

const SIZE = 320
const STROKE = 4
const R = 140
const C = 2 * Math.PI * R
const TICK_R = R + 15
const TICK_C = 2 * Math.PI * TICK_R

// 기본 크기: 폭뿐 아니라 화면 높이(dvh)로도 제한해 낮은 화면에서 넘치지 않게
const DEFAULT_SIZE = 'w-[min(80vw,22rem)] md:w-[max(13rem,min(34vw,25rem,calc(100dvh_-_24rem)))]'

export default function TimerRing({ progress, children, className = DEFAULT_SIZE }) {
  const p = Math.min(1, Math.max(0, progress))
  const visible = p > 0.001
  // 링이 화면에 두 개(일반/집중 모드) 동시에 있을 수 있어 id를 고유하게
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gradId = `ring-grad-${uid}`
  const blurId = `ring-blur-${uid}`
  const move = 'stroke-dashoffset 0.35s linear, opacity 0.4s'

  return (
    <div className={`timer-ring relative aspect-square ${className}`}>
      {/* 링 안쪽에서 은은하게 번지는 빛 */}
      <div
        aria-hidden
        className="absolute inset-[14%] rounded-full transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)',
          opacity: visible ? 1 : 0.4,
        }}
      />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 h-full w-full -rotate-90 overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in oklab, var(--accent) 70%, #fff)' }} />
            <stop offset="55%" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--accent-2)' }} />
          </linearGradient>
          <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* 60분 눈금 */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={TICK_R}
          fill="none"
          style={{ stroke: 'color-mix(in srgb, var(--fg) 13%, transparent)' }}
          strokeWidth="5"
          strokeDasharray={`0.9 ${TICK_C / 60 - 0.9}`}
        />
        {/* 트랙 */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          style={{ stroke: 'color-mix(in srgb, var(--fg) 8%, transparent)' }}
        />
        {/* 진행 링의 번짐(글로우) */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE + 6}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          filter={`url(#${blurId})`}
          style={{ opacity: visible ? 0.45 : 0, transition: move }}
        />
        {/* 진행 링 */}
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
          style={{ opacity: visible ? 1 : 0, transition: move }}
        />
        {/* 끝점 발광 */}
        <g
          style={{
            transform: `rotate(${p * 360}deg)`,
            transformOrigin: '50% 50%',
            transition: 'transform 0.35s linear, opacity 0.4s',
            opacity: visible ? 1 : 0,
          }}
        >
          <circle cx={SIZE / 2 + R} cy={SIZE / 2} r="11" style={{ fill: 'var(--accent)' }} filter={`url(#${blurId})`} />
          <circle
            cx={SIZE / 2 + R}
            cy={SIZE / 2}
            r="4.5"
            fill="#fff"
            style={{ filter: 'drop-shadow(0 0 4px var(--accent))' }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
