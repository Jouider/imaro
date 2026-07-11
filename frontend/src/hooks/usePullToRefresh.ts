import { useEffect, useRef, useState } from 'react'

const TRIGGER_DISTANCE = 70
const MAX_PULL = 110

type Options = {
  /** Called when user pulls past trigger distance. Should return a promise. */
  onRefresh: () => Promise<unknown>
  /** Disable behavior (e.g. on non-touch devices or when scrolled). Default false. */
  disabled?: boolean
}

type Result = {
  /** Attach this ref to the scrollable container (or window-level if undefined). */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Current pull distance in px (0 = idle). Bind to a banner translateY. */
  pullDistance: number
  /** True while onRefresh is pending. */
  isRefreshing: boolean
  /** Progress ratio 0-1 used for visual feedback. */
  progress: number
}

/**
 * Mobile pull-to-refresh — touch-only, ~50 lines.
 * Tracks touchstart → touchmove → touchend on the container. When the user
 * drags down from scrollTop = 0 past TRIGGER_DISTANCE, fires onRefresh.
 *
 * The component using this hook should render a banner that follows
 * `pullDistance` (translateY) and shows a spinner while `isRefreshing`.
 */
export function usePullToRefresh({
  onRefresh,
  disabled = false,
}: Options): Result {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)

  useEffect(() => {
    if (disabled) return
    const el = containerRef.current ?? document.body
    if (!el) return

    const isAtTop = () => {
      const scrollEl = containerRef.current ?? document.documentElement
      return scrollEl.scrollTop <= 0
    }

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      if (!isAtTop()) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || startYRef.current == null) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }
      // Resistance curve — easier near 0, harder near MAX_PULL
      const eased = Math.min(MAX_PULL, delta * 0.6)
      setPullDistance(eased)
      if (delta > 10) e.preventDefault()
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return
      pullingRef.current = false
      const dist = pullDistance
      startYRef.current = null

      if (dist >= TRIGGER_DISTANCE) {
        setIsRefreshing(true)
        setPullDistance(TRIGGER_DISTANCE)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [onRefresh, disabled, isRefreshing, pullDistance])

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress: Math.min(1, pullDistance / TRIGGER_DISTANCE),
  }
}
