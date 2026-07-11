import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export type Statut = 'paye' | 'impaye' | 'partiel' | 'retard'

type Props = {
  statut: Statut
  className?: string
}

const CONFIG: Record<
  Statut,
  { labelKey: string; bg: string; text: string; ring: string }
> = {
  paye: {
    labelKey: 'statut.paye',
    bg: 'bg-green-100',
    text: 'text-green-800',
    ring: 'ring-green-600/20',
  },
  impaye: {
    labelKey: 'statut.impaye',
    bg: 'bg-red-100',
    text: 'text-red-800',
    ring: 'ring-red-600/20',
  },
  partiel: {
    labelKey: 'statut.partiel',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    ring: 'ring-orange-600/20',
  },
  retard: {
    labelKey: 'statut.retard',
    bg: 'bg-red-100',
    text: 'text-red-800',
    ring: 'ring-red-600/20',
  },
}

/**
 * Badge de statut financier.
 * payé = vert, impayé = rouge, partiel = orange, retard = rouge.
 */
export function StatutBadge({ statut, className }: Props) {
  const { t } = useTranslation()
  const { labelKey, bg, text, ring } = CONFIG[statut]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        bg,
        text,
        ring,
        className,
      )}
    >
      {t(labelKey)}
    </span>
  )
}
