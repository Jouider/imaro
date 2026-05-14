import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MontantDisplay,
  StatutBadge,
  LoadingSkeleton,
  EmptyState,
} from '@/components/shared'
import {
  getOperations,
  type Operation,
  type OperationType,
} from '@/services/portail.service'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'appel_fonds' | 'paiement'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function OperationRow({ op }: { op: Operation }) {
  const { t } = useTranslation()
  const isDebit = op.montant < 0

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      {/* Icon circle */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isDebit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600',
        )}
      >
        {isDebit ? (
          <ArrowDown className="size-4" aria-hidden="true" />
        ) : (
          <ArrowUp className="size-4" aria-hidden="true" />
        )}
      </div>

      {/* Label + date */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-base leading-snug truncate">
          {op.libelle}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(op.date)}</p>
      </div>

      {/* Amount + badge + download */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <MontantDisplay
          value={op.montant}
          colorize
          className="text-sm font-semibold"
        />
        <div className="flex items-center gap-1">
          <StatutBadge statut={op.statut} />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={
              op.recu_url ? t('portail.finances.recu') : 'Reçu non disponible'
            }
            disabled={!op.recu_url}
            onClick={() => {
              if (op.recu_url) window.open(op.recu_url, '_blank')
            }}
          >
            <Download className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PortailFinancesPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')

  const { data: operations, isLoading } = useQuery({
    queryKey: ['portail-operations'],
    queryFn: getOperations,
  })

  const filtered =
    !operations || filter === 'all'
      ? (operations ?? [])
      : operations.filter((op) => op.type === (filter as OperationType))

  type FilterOption = { value: Filter; labelKey: string }
  const filterOptions: FilterOption[] = [
    { value: 'all', labelKey: 'portail.finances.filter.all' },
    { value: 'appel_fonds', labelKey: 'portail.finances.filter.appels' },
    { value: 'paiement', labelKey: 'portail.finances.filter.paiements' },
  ]

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
        {t('portail.finances.title')}
      </h1>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-10',
              filter === opt.value
                ? 'bg-[var(--color-imaro-primary)] text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {/* Operations list */}
      {isLoading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-12" />}
          title={t('portail.finances.empty')}
        />
      ) : (
        <div className="rounded-xl border bg-card px-4">
          {filtered.map((op) => (
            <OperationRow key={op.id} op={op} />
          ))}
        </div>
      )}
    </div>
  )
}
