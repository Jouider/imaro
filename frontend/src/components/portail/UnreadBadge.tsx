import { cn } from '@/lib/utils'

type Props = {
  /** Number to display. If 0 (or undefined), badge is hidden. */
  count?: number
  /** Cap at 9+. Default true. */
  cap?: boolean
  className?: string
}

/**
 * Small red unread indicator with a number.
 * Used on bottom-nav tab icons and notification bell.
 */
export function UnreadBadge({ count, cap = true, className }: Props) {
  if (!count || count <= 0) return null
  const label = cap && count > 9 ? '9+' : String(count)
  return (
    <span
      className={cn(
        'absolute -end-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-card',
        className,
      )}
    >
      {label}
    </span>
  )
}
