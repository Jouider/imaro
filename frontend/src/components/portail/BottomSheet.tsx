import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** Show the drag handle bar at top. Default true. */
  handle?: boolean
  /** Show a close X button. Default true. */
  closable?: boolean
  children: ReactNode
  /** Max content height; defaults to 85svh. */
  maxHeight?: string
  className?: string
}

/**
 * Bottom sheet — mobile-first modal that slides up from the bottom.
 * Tap outside or drag handle (with X) to close. Body scroll locked while open.
 *
 * @example
 * <BottomSheet open={open} onOpenChange={setOpen} title="Nouvelle réclamation">
 *   <form>...</form>
 * </BottomSheet>
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  handle = true,
  closable = true,
  children,
  maxHeight = '85svh',
  className,
}: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bs-title' : undefined}
        style={{ maxHeight }}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-card',
          open ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
      >
        {/* Handle bar */}
        {handle && (
          <div className="flex shrink-0 justify-center pt-2">
            <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}

        {/* Title row */}
        {(title || closable) && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            {title && (
              <h2
                id="bs-title"
                className="font-display text-lg tracking-tight text-[var(--primary)]"
              >
                {title}
              </h2>
            )}
            {closable && (
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => onOpenChange(false)}
                className="ms-auto flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--color-imaro-primary-tint)]"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-2">
          {children}
        </div>
      </div>
    </>
  )
}
