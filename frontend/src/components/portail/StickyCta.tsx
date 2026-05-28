import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  /** The CTA button or buttons */
  children: ReactNode
  /** Extra info shown above the CTA (e.g. "Total dû : 1 500,00 DH") */
  context?: ReactNode
  className?: string
}

/**
 * Sticky CTA strip — pinned just above the bottom nav.
 * Used on PortailFinancesPage for "Payer maintenant".
 *
 * The portail layout reserves pb-20 for the bottom nav, so this component
 * positions itself at bottom-20 (above the nav). Safe-area-inset respected.
 */
export function StickyCta({ children, context, className }: Props) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-16 z-30 border-t border-[var(--color-imaro-primary)]/10 bg-white/95 px-4 py-3 backdrop-blur-md shadow-[0_-4px_12px_-4px_rgb(29_78_216_/_0.10)] dark:bg-card/95',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
        {context && (
          <div className="text-xs text-muted-foreground">{context}</div>
        )}
        <div className="flex w-full items-center gap-2">{children}</div>
      </div>
    </div>
  )
}
