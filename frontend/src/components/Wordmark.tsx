import { cn } from '@/lib/utils'

type Variant = 'horizontal' | 'stacked'

type Props = {
  /**
   * Applied to the <img>. The logo is contained (never cropped), so:
   * - horizontal (~3.3:1): set height, width auto — e.g. "h-12 w-auto"
   *   (passing a fixed width also works; the logo fits inside, centered)
   * - stacked (~1.3:1): set height, width auto — e.g. "h-32 w-auto mx-auto"
   */
  className?: string
  /** Layout variant. 'horizontal' = icon + text side-by-side (default). 'stacked' = icon above text. */
  variant?: Variant
  /** Use the white/orange version — for navy or dark backgrounds */
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
 * The PNGs are tightly trimmed to the artwork (transparent background), so the
 * image is simply contained within the box you size — no cropping. Size by
 * height and let width be auto to preserve the aspect ratio.
 *
 * @example
 * // Nav header (light bg)
 * <Wordmark className="h-12 w-auto" />
 *
 * // Login card (centred, stacked)
 * <Wordmark variant="stacked" className="h-32 w-auto mx-auto" />
 *
 * // Navy sidebar
 * <Wordmark inverted className="h-12 w-auto" />
 */
export function Wordmark({
  className,
  variant = 'horizontal',
  inverted = false,
}: Props) {
  const key: keyof typeof SRC = inverted ? `${variant}-inverted` : variant

  return (
    <img
      src={SRC[key]}
      alt="Imaro"
      className={cn('object-contain object-left', className)}
    />
  )
}
