import { Loader2, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  pullDistance: number
  progress: number
  isRefreshing: boolean
}

/**
 * Pull-to-refresh visual banner. Renders above the scrollable content.
 * Mirrors common mobile patterns (Twitter/X, Instagram).
 *
 * Pair with `usePullToRefresh`:
 *   <PullRefreshIndicator {...rest} />
 *   <main ref={containerRef}>…</main>
 */
export function PullRefreshIndicator({
  pullDistance,
  progress,
  isRefreshing,
}: Props) {
  const opacity = isRefreshing ? 1 : Math.min(1, progress)
  const ready = progress >= 1
  return (
    <div
      aria-hidden
      style={{
        height: `${pullDistance}px`,
        opacity,
      }}
      className="pointer-events-none flex w-full items-end justify-center pb-2 transition-opacity"
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-[var(--color-imaro-primary)]/10 dark:bg-card">
        {isRefreshing ? (
          <Loader2 className="size-4 animate-spin text-[var(--primary)]" />
        ) : (
          <ArrowDown
            className={cn(
              'size-4 transition-transform duration-200',
              ready
                ? 'rotate-180 text-emerald-600'
                : 'text-[var(--primary)]/60',
            )}
            style={{ transform: `rotate(${progress * 180}deg)` }}
          />
        )}
      </div>
    </div>
  )
}
