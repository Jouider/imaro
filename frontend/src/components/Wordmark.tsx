import { cn } from '@/lib/utils'

type Variant = 'horizontal' | 'stacked'

type Props = {
  /**
   * Applied to the outer element.
   * - horizontal: set width + height (e.g. "w-44 h-14") — the image is cropped to show the logo
   * - stacked: set height only (e.g. "h-32 w-auto") — the image is contained as-is
   */
  className?: string
  /** Layout variant. 'horizontal' = icon + text side-by-side (default). 'stacked' = icon above text. */
  variant?: Variant
  /** Use the white/outlined version — for navy or dark backgrounds */
  inverted?: boolean
}

const SRC: Record<`${Variant}${'' | '-inverted'}`, string> = {
  horizontal: '/logo-horizontal.png',
  'horizontal-inverted': '/logo-horizontal-inverted.png',
  stacked: '/logo-stacked.png',
  'stacked-inverted': '/logo-stacked-inverted.png',
}

/**
 * Imaro logo — renders the official PNG asset.
 *
 * The PNG canvases have generous whitespace, so:
 * - horizontal: uses object-cover in a clipping container to zoom into the mark.
 *   Pass both width + height via className (e.g. "w-44 h-14").
 * - stacked: uses object-contain. Pass height only (e.g. "h-32 w-auto mx-auto").
 *
 * @example
 * // Nav header (light bg)
 * <Wordmark className="w-44 h-14" />
 *
 * // Login card (centred, stacked)
 * <Wordmark variant="stacked" className="h-36 w-auto mx-auto" />
 *
 * // Navy sidebar
 * <Wordmark inverted className="w-44 h-14" />
 */
export function Wordmark({
  className,
  variant = 'horizontal',
  inverted = false,
}: Props) {
  const key: keyof typeof SRC = inverted ? `${variant}-inverted` : variant

  if (variant === 'horizontal') {
    // object-cover + overflow-hidden crops the excess whitespace of the 1:1 canvas,
    // zooming in on the centred logo mark.
    return (
      <div className={cn('overflow-hidden', className)}>
        <img
          src={SRC[key]}
          alt="Imaro"
          className="h-full w-full object-cover object-center"
        />
      </div>
    )
  }

  // stacked — square canvas, content fills more of the frame → contain is fine
  return (
    <img
      src={SRC[key]}
      alt="Imaro"
      className={cn('object-contain', className)}
    />
  )
}
