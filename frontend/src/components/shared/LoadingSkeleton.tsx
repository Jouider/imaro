import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Variant = 'card' | 'table' | 'kpi' | 'text'

type Props = {
  variant?: Variant
  /** Nombre de lignes/cartes à afficher. Défaut: 3 */
  count?: number
  className?: string
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
      <Skeleton className="mb-2 h-6 w-24" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b py-3 last:border-b-0">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mb-1 mt-3 h-8 w-28" />
      <Skeleton className="h-4 w-36" />
    </div>
  )
}

function TextSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

/**
 * Squelette de chargement réutilisable.
 * Utilisé sur tout état `isLoading` — jamais de spinner nu.
 */
export function LoadingSkeleton({
  variant = 'card',
  count = 3,
  className,
}: Props) {
  const rows = Array.from({ length: count }, (_, i) => i)

  if (variant === 'table') {
    return (
      <div className={cn('rounded-xl border bg-card px-4', className)}>
        {rows.map((i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (variant === 'kpi') {
    return (
      <div
        className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
      >
        {rows.map((i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-4', className)}>
        {rows.map((i) => (
          <TextSkeleton key={i} />
        ))}
      </div>
    )
  }

  // card (default)
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {rows.map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
