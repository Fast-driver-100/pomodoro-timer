import { Minimize2, Pause, Square } from 'lucide-react'
import TimerRing from './TimerRing'
import { formatTime } from '../hooks/usePomodoro'

/**
 * 집중 모드: 남은 시간과 최소 컨트롤만 화면 중앙에 크게.
 * 기존 레이아웃 위에 덮어 씌우는 방식이라(언마운트하지 않음) 백색소음·입력 상태가 그대로 유지됨.
 */
export default function FocusView({ visible, remaining, progress, modeLabel, onPause, onStop, onShowFull }) {
  return (
    <div
      className={`fixed inset-0 z-30 flex flex-col items-center justify-center gap-[clamp(1rem,5dvh,2.5rem)] px-4 transition-[opacity,transform,visibility] duration-500 ease-out ${
        visible ? 'visible scale-100 opacity-100' : 'pointer-events-none invisible scale-[1.04] opacity-0'
      }`}
      inert={!visible}
      aria-hidden={!visible}
      role="region"
      aria-label="집중 모드"
    >
      <div className="bg-glow" aria-hidden />

      {/* 우측 상단 고정: 전체 화면으로 전환 (타이머는 계속 진행) */}
      <button
        onClick={onShowFull}
        aria-label="전체 화면 보기"
        className="glass fixed top-[calc(max(0.75rem,env(safe-area-inset-top))_+_0.75rem)] right-[max(1rem,env(safe-area-inset-right))] flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-fg/80 transition hover:text-fg active:scale-95 md:right-[max(2rem,env(safe-area-inset-right))]"
      >
        <Minimize2 className="h-4 w-4" />
        전체 화면 보기
      </button>

      <TimerRing progress={progress} className="w-[min(84vw,64dvh,36rem)]">
        <span className="accent-text text-[clamp(0.8rem,2.4dvh,1.1rem)] font-semibold tracking-wide">
          {modeLabel}
        </span>
        <span className="time-digits mt-1 text-[min(21vw,15dvh,8.5rem)] leading-none font-semibold text-fg">
          {formatTime(remaining)}
        </span>
      </TimerRing>

      <div className="flex items-center gap-6">
        <button
          onClick={onStop}
          aria-label="정지"
          title="정지 (R)"
          className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.07] text-fg/70 transition hover:bg-fg/[0.12] hover:text-fg active:scale-90"
        >
          <Square className="h-5 w-5" fill="currentColor" />
        </button>
        <button
          onClick={onPause}
          aria-label="일시정지"
          title="일시정지 (Space)"
          className="accent-bg grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition active:scale-90"
        >
          <Pause className="h-8 w-8" fill="currentColor" />
        </button>
      </div>
    </div>
  )
}
