import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-reveal hook for landing sections.
 *
 * Returns a ref to attach to the element and a boolean `shown` that flips to
 * true the first time the element scrolls into view. Pair with the `.l-reveal`
 * / `.l-shown` utilities (see animations.ts) or drive your own transition.
 *
 * Respects `prefers-reduced-motion`: users who opt out see content immediately.
 *
 * @example
 * const { ref, shown } = useReveal<HTMLDivElement>()
 * <div ref={ref} className={cn('l-reveal', shown && 'l-shown')}>…</div>
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  /** 0–1 — how much of the element must be visible. Default 0.15. */
  threshold?: number
  /** Root margin, e.g. "0px 0px -10% 0px". Default triggers slightly early. */
  rootMargin?: string
  /** Re-trigger every time it enters (default: once). */
  repeat?: boolean
}) {
  const ref = useRef<T | null>(null)
  // Lazy init: reduced-motion users start "shown" (no animation, no observer).
  const [shown, setShown] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced-motion: already shown via initializer — skip observation.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          if (!options?.repeat) obs.disconnect()
        } else if (options?.repeat) {
          setShown(false)
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? '0px 0px -8% 0px',
      },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [options?.threshold, options?.rootMargin, options?.repeat])

  return { ref, shown }
}
