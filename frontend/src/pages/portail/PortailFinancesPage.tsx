import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Eye,
  Wallet,
  X,
  Receipt,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MontantDisplay,
  StatutBadge,
  LoadingSkeleton,
  EmptyState,
} from '@/components/shared'
import {
  getOperations,
  getPortailDashboard,
  getPortailDocuments,
  type Operation,
  type OperationType,
  type PortailDocument,
  type PortailDocumentType,
} from '@/services/portail.service'
import { StickyCta } from '@/components/portail/StickyCta'
import { PaiementSheet } from '@/components/portail/PaiementSheet'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'appel_fonds' | 'paiement'
type MainTab = 'finances' | 'documents'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTaille(ko: number): string {
  if (ko >= 1024) return `${(ko / 1024).toFixed(1)} Mo`
  return `${ko} Ko`
}

// ─── Preview helpers ──────────────────────────────────────────────────────────

function detectFileType(url: string): 'pdf' | 'image' | 'other' {
  const clean = url.toLowerCase().split('?')[0]
  if (clean.endsWith('.pdf')) return 'pdf'
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(clean)) return 'image'
  return 'other'
}

function DocumentPreviewModal({
  doc,
  chipClass,
  typeLabel,
  open,
  onClose,
}: {
  doc: PortailDocument
  chipClass: string
  typeLabel: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const fileType = detectFileType(doc.url)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-4 pt-4 pb-3 border-b flex-row items-start justify-between gap-2">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold leading-snug truncate pr-2">
              {doc.nom}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  chipClass,
                )}
              >
                {typeLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTaille(doc.taille_ko)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(doc.date)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        {/* Preview area */}
        <div className="bg-muted/30 min-h-48 flex items-center justify-center">
          {fileType === 'pdf' && (
            <iframe
              src={doc.url}
              title={doc.nom}
              className="w-full h-72 border-0"
            />
          )}
          {fileType === 'image' && (
            <img
              src={doc.url}
              alt={doc.nom}
              className="w-full max-h-72 object-contain"
            />
          )}
          {fileType === 'other' && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <FileText className="size-16 opacity-30" />
              <p className="text-sm">
                {t('portail.finances.previewUnavailable', {
                  defaultValue: 'Aperçu non disponible',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('actions.cancel', { defaultValue: 'Fermer' })}
          </Button>
          <Button
            size="sm"
            className="bg-gradient-imaro shadow-md hover:brightness-110"
            asChild
          >
            <a
              href={doc.url}
              download={doc.nom.endsWith('.pdf') ? doc.nom : `${doc.nom}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="me-1.5 size-4" />
              {t('portail.finances.documents.download', {
                defaultValue: 'Télécharger',
              })}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Document type config ─────────────────────────────────────────────────────

type DocGroup = {
  type: PortailDocumentType
  labelKey: string
  defaultLabel: string
  chipClass: string
}

const DOC_GROUPS: DocGroup[] = [
  {
    type: 'reglement',
    labelKey: 'portail.documents.group.reglement',
    defaultLabel: 'Règlement',
    chipClass: 'bg-violet-100 text-violet-800',
  },
  {
    type: 'pv_ag',
    labelKey: 'portail.documents.group.pvAg',
    defaultLabel: 'PV Assemblées',
    chipClass: 'bg-blue-100 text-blue-800',
  },
  {
    type: 'contrat_facture',
    labelKey: 'portail.documents.group.contratFacture',
    defaultLabel: 'Contrats / Factures',
    chipClass: 'bg-amber-100 text-amber-800',
  },
  {
    type: 'autre',
    labelKey: 'portail.documents.group.autre',
    defaultLabel: 'Autres',
    chipClass: 'bg-gray-100 text-gray-700',
  },
]

// ─── OperationRow ─────────────────────────────────────────────────────────────

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
              op.recu_url
                ? t('portail.finances.recu', {
                    defaultValue: 'Télécharger le reçu',
                  })
                : t('portail.finances.recuIndispo', {
                    defaultValue: 'Reçu non disponible',
                  })
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

// ─── DocumentCard ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  chipClass,
  typeLabel,
  onPreview,
}: {
  doc: PortailDocument
  chipClass: string
  typeLabel: string
  onPreview: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug truncate">{doc.nom}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              chipClass,
            )}
          >
            {typeLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTaille(doc.taille_ko)}
          </span>
        </div>
      </div>

      {/* Date + actions */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatDate(doc.date)}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={onPreview}
          >
            <Eye className="size-3" aria-hidden="true" />
            {t('portail.finances.apercu', { defaultValue: 'Aperçu' })}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs gap-1 text-[var(--color-imaro-primary)] border-[var(--color-imaro-primary)]/30 hover:bg-[var(--color-imaro-primary)]/5"
            asChild
          >
            <a
              href={doc.url}
              download={doc.nom.endsWith('.pdf') ? doc.nom : `${doc.nom}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-3" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── DocumentsSkeleton ────────────────────────────────────────────────────────

function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((g) => (
        <div key={g} className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="rounded-xl border bg-card px-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b last:border-b-0"
              >
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-7 w-24 animate-pulse rounded bg-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── DocumentsTab ─────────────────────────────────────────────────────────────

function DocumentsTab() {
  const { t } = useTranslation()
  const [previewDoc, setPreviewDoc] = useState<{
    doc: PortailDocument
    chipClass: string
    typeLabel: string
  } | null>(null)

  const { data: documents, isLoading } = useQuery({
    queryKey: ['portail-documents'],
    queryFn: getPortailDocuments,
  })

  if (isLoading) return <DocumentsSkeleton />

  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-12" />}
        title={t('portail.finances.documents.empty', {
          defaultValue: 'Aucun document disponible',
        })}
      />
    )
  }

  const byType = new Map<PortailDocumentType, PortailDocument[]>()
  for (const doc of documents) {
    const existing = byType.get(doc.type) ?? []
    byType.set(doc.type, [...existing, doc])
  }

  return (
    <>
      <div className="space-y-5">
        {DOC_GROUPS.map((group) => {
          const docs = byType.get(group.type)
          if (!docs || docs.length === 0) return null

          const groupLabel = t(group.labelKey, {
            defaultValue: group.defaultLabel,
          })

          return (
            <section key={group.type} className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--color-imaro-primary)] uppercase tracking-wide">
                {groupLabel}
              </h2>
              <div className="rounded-xl border bg-card px-4">
                {docs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    chipClass={group.chipClass}
                    typeLabel={groupLabel}
                    onPreview={() =>
                      setPreviewDoc({
                        doc,
                        chipClass: group.chipClass,
                        typeLabel: groupLabel,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc.doc}
          chipClass={previewDoc.chipClass}
          typeLabel={previewDoc.typeLabel}
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  )
}

// ─── PortailFinancesPage ──────────────────────────────────────────────────────

export function PortailFinancesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<MainTab>('finances')
  const [filter, setFilter] = useState<Filter>('all')
  const [payOpen, setPayOpen] = useState(false)

  const { data: operations, isLoading } = useQuery({
    queryKey: ['portail-operations'],
    queryFn: getOperations,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['portail-dashboard'],
    queryFn: getPortailDashboard,
  })

  // Solde négatif = montant dû par le copropriétaire.
  const amountDue =
    dashboard && dashboard.balance < 0 ? Math.abs(dashboard.balance) : undefined

  const filtered =
    !operations || filter === 'all'
      ? (operations ?? [])
      : operations.filter((op) => op.type === (filter as OperationType))

  type FilterOption = { value: Filter; labelKey: string; defaultLabel: string }
  const filterOptions: FilterOption[] = [
    {
      value: 'all',
      labelKey: 'portail.finances.filter.all',
      defaultLabel: 'Tout',
    },
    {
      value: 'appel_fonds',
      labelKey: 'portail.finances.filter.appels',
      defaultLabel: 'Appels',
    },
    {
      value: 'paiement',
      labelKey: 'portail.finances.filter.paiements',
      defaultLabel: 'Paiements',
    },
  ]

  return (
    <div
      className={cn('px-4 py-6 space-y-4', activeTab === 'finances' && 'pb-28')}
    >
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
        {t('portail.finances.title', { defaultValue: 'Finances' })}
      </h1>

      {/* Bons de paiement — entry to the dedicated section (KAN-110) */}
      <Link
        to="/portail/bons-paiement"
        className="flex items-center gap-3 rounded-xl border border-[var(--color-imaro-primary)]/15 bg-gradient-to-br from-[var(--color-imaro-primary)]/5 to-transparent p-3.5 transition-transform active:scale-[0.99]"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]">
          <Receipt className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('portail.bonsPaiement.title', {
              defaultValue: 'Bons de paiement',
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('portail.bonsPaiement.entryDesc', {
              defaultValue: 'Émettre un ordre de paiement et voir l’historique',
            })}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
      </Link>

      {/* Main tab toggle */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => setActiveTab('finances')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'finances'
              ? 'bg-[var(--color-imaro-primary)] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t('portail.finances.tabFinances', { defaultValue: 'Finances' })}
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'documents'
              ? 'bg-[var(--color-imaro-primary)] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText className="size-4" aria-hidden="true" />
          {t('portail.finances.tabDocuments', { defaultValue: 'Documents' })}
        </button>
      </div>

      {activeTab === 'finances' && (
        <>
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
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </button>
            ))}
          </div>

          {/* Operations list */}
          {isLoading ? (
            <LoadingSkeleton variant="table" count={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-12" />}
              title={t('portail.finances.empty', {
                defaultValue: 'Aucune opération',
              })}
            />
          ) : (
            <div className="rounded-xl border bg-card px-4">
              {filtered.map((op) => (
                <OperationRow key={op.id} op={op} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'documents' && <DocumentsTab />}

      {/* Sticky pay CTA (finances tab only) */}
      {activeTab === 'finances' && (
        <StickyCta
          context={
            amountDue != null ? (
              <span className="flex items-center justify-between">
                <span>{t('portail.finances.amountDue')}</span>
                <MontantDisplay
                  value={amountDue}
                  className="font-semibold text-foreground"
                />
              </span>
            ) : undefined
          }
        >
          <Button className="w-full" onClick={() => setPayOpen(true)}>
            <Wallet className="me-2 size-4" />
            {t('portail.finances.pay')}
          </Button>
        </StickyCta>
      )}

      <PaiementSheet
        open={payOpen}
        onOpenChange={setPayOpen}
        defaultMontant={amountDue}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ['portail-operations'] })
          void qc.invalidateQueries({ queryKey: ['portail-dashboard'] })
        }}
      />
    </div>
  )
}
