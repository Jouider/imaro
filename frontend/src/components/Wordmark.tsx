import { cn } from '@/lib/utils'

type Variant = 'horizontal' | 'stacked'

type Props = {
  /** Additional classes applied to the <img> element (use for sizing: h-8, h-24, etc.) */
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
 * Imaro logo. Renders the official PNG asset.
 *
 * Usage in nav (light bg):      <Wordmark className="h-10 w-auto" />
 * Usage in login card (centred): <Wordmark variant="stacked" className="h-28 w-auto mx-auto" />
 * Usage in navy sidebar:         <Wordmark inverted className="h-10 w-auto" />
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
      className={cn('object-contain', className)}
    />
  )
}
