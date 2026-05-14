import { type ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Trend = {
  /** Variation en % vs période précédente (ex: +12.5 ou -3.2) */
  value: number
  /** Libellé de la période (ex: "vs mois dernier") */
  label?: string
}

type Props = {
  /** Icône lucide-react */
  icon: ReactNode
  /** Valeur principale déjà formatée (ex: "1 500,00 DH" ou "24") */
  value: string | number
  /** Libellé sous la valeur */
  label: string
  trend?: Trend
  className?: string
}

/**
 * Carte KPI : icône + valeur + libellé + variation optionnelle.
 * Utiliser MontantDisplay pour les valeurs financières.
 */
export function KpiCard({ icon, value, label, trend, className }: Props) {
  const isPositive = trend && trend.value >= 0
  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
            {icon}
          </div>
          {trend && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                isPositive ? 'text-green-600' : 'text-red-600',
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-semibold tabular-nums text-[var(--primary)]">
            {value}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
          {trend?.label && (
            <p className="mt-1 text-xs text-muted-foreground">{trend.label}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
