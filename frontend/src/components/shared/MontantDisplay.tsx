import { cn } from '@/lib/utils'

type Props = {
  /** Montant en centimes ou en unités (number). Ex: 1500 → "1 500,00 DH" */
  value: number
  className?: string
  /** Affiche en rouge si négatif. Défaut: false */
  colorize?: boolean
}

const formatter = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formate un montant en dirhams marocains.
 * Toujours "DH" — jamais MAD, €, $.
 *
 * @example <MontantDisplay value={1500} />  → "1 500,00 DH"
 * @example <MontantDisplay value={-250} colorize />  → "-250,00 DH" en rouge
 */
export function MontantDisplay({ value, className, colorize = false }: Props) {
  const formatted = `${formatter.format(value)} DH`
  return (
    <span
      className={cn(
        'tabular-nums',
        colorize && value < 0 && 'text-[var(--color-imaro-danger)]',
        className,
      )}
    >
      {formatted}
    </span>
  )
}
