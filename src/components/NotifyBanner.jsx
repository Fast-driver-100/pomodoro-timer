import { Bell, X } from 'lucide-react'

/** 첫 실행 시 알림 권한을 요청하는 작은 안내 배너 */
export default function NotifyBanner({ onEnable, onDismiss }) {
  return (
    <div
      role="region"
      aria-label="알림 안내"
      className="glass anim-pop mb-5 flex items-center gap-3 rounded-3xl py-2 pr-2 pl-2.5 md:mb-7"
    >
      <div className="accent-soft grid h-9 w-9 shrink-0 place-items-center rounded-full">
        <Bell className="accent-text h-[18px] w-[18px]" />
      </div>
      <p className="min-w-0 flex-1 text-sm leading-snug text-fg/80">
        세션이 끝나면 알림으로 알려드릴까요?
        <span className="hidden text-muted sm:inline"> 다른 탭에 있어도 놓치지 않아요.</span>
      </p>
      <button
        onClick={onEnable}
        className="btn-primary h-9 shrink-0 rounded-full px-4 text-sm font-semibold"
      >
        알림 켜기
      </button>
      <button
        onClick={onDismiss}
        aria-label="다음에"
        title="다음에"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition hover:bg-fg/10 hover:text-fg/80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
