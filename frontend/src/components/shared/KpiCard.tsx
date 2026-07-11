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
    <Card
      className={cn(
        'hover-lift border-[var(--color-imaro-primary)]/10 shadow-[0_1px_3px_0_rgb(29_78_216_/_0.05),0_1px_2px_-1px_rgb(29_78_216_/_0.04)]',
        className,
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="bg-gradient-imaro flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
            {icon}
          </div>
          {trend && (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                isPositive
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
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
          <p className="text-lg font-semibold tabular-nums tracking-tight text-[var(--primary)] sm:text-2xl">
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
