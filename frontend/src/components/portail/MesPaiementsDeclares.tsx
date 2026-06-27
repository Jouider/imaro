import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
} from 'lucide-react'
import {
  MontantDisplay,
  LoadingSkeleton,
  EmptyState,
} from '@/components/shared'
import {
  getMesPaiements,
  type PaiementDeclare,
  type PaiementStatut,
} from '@/services/paiements-declares.service'
import { cn } from '@/lib/utils'

const STATUT_META: Record<PaiementStatut, { cls: string; icon: typeof Clock }> =
  {
    en_attente: { cls: 'bg-amber-100 text-amber-700', icon: Clock },
    valide: { cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    rejete: { cls: 'bg-red-100 text-red-700', icon: XCircle },
  }

type Tr = (k: string, o?: Record<string, unknown>) => string

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Historique des paiements déclarés par le résident, avec détail (bottom sheet)
 * : infos du paiement, statut, délai de validation 24 h, et téléchargement du
 * reçu (« le bon ») une fois validé par le syndic (KAN-110 revu).
 */
export function MesPaiementsDeclares() {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<PaiementDeclare | null>(null)

  const { data: paiements, isLoading } = useQuery({
    queryKey: ['portail-paiements-declares'],
    queryFn: getMesPaiements,
  })

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-[var(--color-imaro-primary)]" />
        <h2 className="text-sm font-semibold text-foreground">
          {t('portail.paiements.title', {
            defaultValue: 'Mes paiements déclarés',
          })}
        </h2>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : !paiements || paiements.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-10" />}
          title={t('portail.paiements.empty', {
            defaultValue: 'Aucun paiement déclaré',
          })}
        />
      ) : (
        <div className="space-y-2.5">
          {paiements.map((p) => (
            <PaiementRow
              key={p.id}
              paiement={p}
              onOpen={() => setDetail(p)}
              t={t}
            />
          ))}
        </div>
      )}

      {detail && (
        <DetailSheet paiement={detail} onClose={() => setDetail(null)} t={t} />
      )}
    </div>
  )
}

function PaiementRow({
  paiement,
  onOpen,
  t,
}: {
  paiement: PaiementDeclare
  onOpen: () => void
  t: Tr
}) {
  const meta = STATUT_META[paiement.statut]
  const StatutIcon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]">
        <Receipt className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[var(--color-imaro-primary)]">
            {paiement.reference}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              meta.cls,
            )}
          >
            <StatutIcon className="size-3" />
            {t(`portail.bonsPaiement.statut.${paiement.statut}`, {
              defaultValue: paiement.statut,
            })}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm capitalize text-foreground">
          {t(`portail.paiements.methode.${paiement.methode}`, {
            defaultValue: paiement.methode,
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(paiement.date)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <MontantDisplay
          value={paiement.montant}
          className="text-sm font-semibold"
        />
        <ChevronRight className="ms-auto mt-1 size-4 text-muted-foreground rtl:rotate-180" />
      </div>
    </button>
  )
}

function DetailSheet({
  paiement,
  onClose,
  t,
}: {
  paiement: PaiementDeclare
  onClose: () => void
  t: Tr
}) {
  const meta = STATUT_META[paiement.statut]
  const StatutIcon = meta.icon
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full space-y-4 rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-[var(--color-imaro-primary)]">
            {paiement.reference}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              meta.cls,
            )}
          >
            <StatutIcon className="size-3.5" />
            {t(`portail.bonsPaiement.statut.${paiement.statut}`, {
              defaultValue: paiement.statut,
            })}
          </span>
        </div>

        <MontantDisplay
          value={paiement.montant}
          className="block font-display text-3xl text-[var(--color-imaro-primary)]"
        />

        <dl className="space-y-2 text-sm">
          <Line
            label={t('portail.paiements.methodeLabel', {
              defaultValue: 'Méthode',
            })}
            value={t(`portail.paiements.methode.${paiement.methode}`, {
              defaultValue: paiement.methode,
            })}
          />
          <Line
            label={t('portail.paiements.dateLabel', { defaultValue: 'Date' })}
            value={formatDate(paiement.date)}
          />
        </dl>

        {/* En attente de validation / rejet */}
        {paiement.statut === 'en_attente' ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/20">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              {t('portail.paiements.enAttenteNotice', {
                defaultValue: 'En attente de validation par le syndic.',
              })}
            </p>
          </div>
        ) : paiement.statut === 'rejete' && paiement.motif_rejet ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:bg-red-950/20">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-relaxed">{paiement.motif_rejet}</p>
          </div>
        ) : null}

        {/* Téléchargement du reçu (« le bon ») — une fois validé */}
        <a
          href={paiement.recu_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!paiement.recu_url}
          onClick={(e) => {
            if (!paiement.recu_url) e.preventDefault()
          }}
          className={cn(
            'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors',
            paiement.recu_url
              ? 'bg-[var(--color-imaro-primary)] text-white active:scale-[0.98]'
              : 'cursor-not-allowed bg-muted text-muted-foreground',
          )}
        >
          <Download className="size-4" />
          {paiement.recu_url
            ? t('portail.paiements.downloadRecu', {
                defaultValue: 'Télécharger le reçu',
              })
            : t('portail.bonsPaiement.downloadPending', {
                defaultValue: 'Disponible après validation',
              })}
        </a>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium capitalize text-foreground">
        {value}
      </dd>
    </div>
  )
}
