import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** When true, the navy half ("Ima") flips to white — for navy backgrounds */
  inverted?: boolean
}

/**
 * Imaro wordmark. Two-tone: navy "Ima" + orange "ro".
 * Uses `font-display` (DM Serif Display) — heading-only font per the spec.
 * Pure text — no PNG dependency until we have an Imaro logo asset.
 */
export function Wordmark({ className, inverted = false }: Props) {
  return (
    <span
      className={cn(
        'font-display text-2xl leading-none tracking-tight',
        className,
      )}
    >
      <span className={inverted ? 'text-white' : 'text-[var(--primary)]'}>
        Ima
      </span>
      <span className="text-[var(--accent)]">ro</span>
    </span>
  )
}
