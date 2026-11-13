import { Bell, X } from 'lucide-react'

/** 첫 실행 시 알림 권한을 요청하는 작은 안내 배너 */
export default function NotifyBanner({ onEnable, onDismiss }) {
  return (
    <div
      role="region"
      aria-label="알림 안내"
      className="glass anim-pop mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 md:mb-6"
    >
      <div className="accent-soft grid h-9 w-9 shrink-0 place-items-center rounded-xl border">
        <Bell className="accent-text h-[18px] w-[18px]" />
      </div>
      <p className="min-w-0 flex-1 text-sm leading-snug text-white/75">
        세션이 끝나면 <span className="font-semibold text-white/90">알림</span>으로 알려드릴까요?
        <span className="hidden text-white/45 sm:inline"> 다른 탭에 있어도 놓치지 않아요.</span>
      </p>
      <button
        onClick={onEnable}
        className="accent-bg shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-lg transition active:scale-95"
      >
        알림 켜기
      </button>
      <button
        onClick={onDismiss}
        aria-label="다음에"
        title="다음에"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white/80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
