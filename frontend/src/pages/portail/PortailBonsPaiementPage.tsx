import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  FileText,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  Landmark,
} from 'lucide-react'
import {
  MontantDisplay,
  LoadingSkeleton,
  EmptyState,
} from '@/components/shared'
import {
  getBonsPaiement,
  createBonPaiement,
  COMPTES_EMETTEUR,
  type BonPaiement,
  type BonPaiementStatut,
} from '@/services/bons-paiement.service'
import { cn } from '@/lib/utils'

const STATUT_META: Record<
  BonPaiementStatut,
  { cls: string; icon: typeof Clock }
> = {
  en_attente: { cls: 'bg-amber-100 text-amber-700', icon: Clock },
  valide: { cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejete: { cls: 'bg-red-100 text-red-700', icon: XCircle },
  expire: { cls: 'bg-gray-100 text-gray-600', icon: XCircle },
}

const BENEFICIAIRE = 'Syndic Résidence Al Blanca'
const TOTAL_STEPS = 4

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PortailBonsPaiementPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<'list' | 'create'>('list')
  const [detail, setDetail] = useState<BonPaiement | null>(null)

  const { data: bons, isLoading } = useQuery({
    queryKey: ['portail-bons-paiement'],
    queryFn: getBonsPaiement,
  })

  if (view === 'create') {
    return (
      <CreateWizard
        onClose={() => setView('list')}
        onCreated={(bon) => {
          setView('list')
          setDetail(bon)
        }}
      />
    )
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="size-5 text-[var(--color-imaro-primary)]" />
        <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
          {t('portail.bonsPaiement.title', {
            defaultValue: 'Bons de paiement',
          })}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('portail.bonsPaiement.subtitle', {
          defaultValue:
            'Émettez un ordre de paiement vers le syndic et retrouvez votre historique.',
        })}
      </p>

      {/* Nouveau bon — primary CTA in normal flow (clears the bottom nav). */}
      <button
        type="button"
        onClick={() => setView('create')}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-imaro-accent)] py-3.5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
      >
        <Plus className="size-5" />
        {t('portail.bonsPaiement.new', { defaultValue: 'Nouveau bon' })}
      </button>

      {isLoading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : !bons || bons.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-12" />}
          title={t('portail.bonsPaiement.empty', {
            defaultValue: 'Aucun bon de paiement',
          })}
        />
      ) : (
        <div className="space-y-2.5">
          {bons.map((bon) => (
            <BonRow
              key={bon.id}
              bon={bon}
              onOpen={() => setDetail(bon)}
              t={t}
            />
          ))}
        </div>
      )}

      {detail && (
        <DetailSheet bon={detail} onClose={() => setDetail(null)} t={t} />
      )}
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function BonRow({
  bon,
  onOpen,
  t,
}: {
  bon: BonPaiement
  onOpen: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const meta = STATUT_META[bon.statut]
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
            {bon.reference}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              meta.cls,
            )}
          >
            <StatutIcon className="size-3" />
            {t(`portail.bonsPaiement.statut.${bon.statut}`, {
              defaultValue: bon.statut,
            })}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-foreground">{bon.motif}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(bon.created_at)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <MontantDisplay value={bon.montant} className="text-sm font-semibold" />
        <ChevronRight className="ms-auto mt-1 size-4 text-muted-foreground rtl:rotate-180" />
      </div>
    </button>
  )
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────

function DetailSheet({
  bon,
  onClose,
  t,
}: {
  bon: BonPaiement
  onClose: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const meta = STATUT_META[bon.statut]
  const StatutIcon = meta.icon
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-[var(--color-imaro-primary)]">
            {bon.reference}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              meta.cls,
            )}
          >
            <StatutIcon className="size-3.5" />
            {t(`portail.bonsPaiement.statut.${bon.statut}`, {
              defaultValue: bon.statut,
            })}
          </span>
        </div>

        <MontantDisplay
          value={bon.montant}
          className="block font-display text-3xl text-[var(--color-imaro-primary)]"
        />

        <dl className="space-y-2 text-sm">
          <Line
            label={t('portail.bonsPaiement.from')}
            value={bon.compte_emetteur}
          />
          <Line label={t('portail.bonsPaiement.to')} value={bon.beneficiaire} />
          <Line label={t('portail.bonsPaiement.motif')} value={bon.motif} />
        </dl>

        {/* 24h validation notice / timeline */}
        {bon.statut === 'en_attente' ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/20">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              {t('portail.bonsPaiement.delaiNotice', {
                defaultValue:
                  'Validation par le syndic possible après un délai de 24 h.',
              })}{' '}
              {t('portail.bonsPaiement.validableLe', {
                defaultValue: 'Validable le',
              })}{' '}
              {new Date(bon.validable_at).toLocaleString('fr-MA', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ) : bon.statut === 'valide' && bon.ticket_reference ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3 text-green-800 dark:bg-green-950/20">
            <CheckCircle2 className="size-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              {t('portail.bonsPaiement.validatedWithTicket', {
                defaultValue: 'Validé. Ticket de suivi',
              })}{' '}
              <span className="font-mono font-semibold">
                {bon.ticket_reference}
              </span>
            </p>
          </div>
        ) : null}

        {/* Download — only once the PDF exists (after validation) */}
        <a
          href={bon.pdf_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!bon.pdf_url}
          onClick={(e) => {
            if (!bon.pdf_url) e.preventDefault()
          }}
          className={cn(
            'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors',
            bon.pdf_url
              ? 'bg-[var(--color-imaro-primary)] text-white active:scale-[0.98]'
              : 'cursor-not-allowed bg-muted text-muted-foreground',
          )}
        >
          <Download className="size-4" />
          {bon.pdf_url
            ? t('portail.bonsPaiement.download', {
                defaultValue: 'Télécharger',
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
      <dd className="text-end font-medium text-foreground">{value}</dd>
    </div>
  )
}

// ─── Creation wizard ──────────────────────────────────────────────────────────

type WizardState = {
  compte_emetteur: string
  beneficiaire: string
  montant: string
  motif: string
}

function CreateWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (bon: BonPaiement) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>({
    compte_emetteur: `${COMPTES_EMETTEUR[0].label} · ${COMPTES_EMETTEUR[0].numero}`,
    beneficiaire: BENEFICIAIRE,
    montant: '',
    motif: '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      createBonPaiement({
        compte_emetteur: form.compte_emetteur,
        beneficiaire: form.beneficiaire,
        montant: Number(form.montant),
        motif: form.motif.trim(),
      }),
    onSuccess: (bon) => {
      void qc.invalidateQueries({ queryKey: ['portail-bons-paiement'] })
      toast.success(
        t('portail.bonsPaiement.created', {
          defaultValue: 'Bon de paiement émis',
        }),
      )
      onCreated(bon)
    },
    onError: () =>
      toast.error(
        t('portail.bonsPaiement.createError', {
          defaultValue: "L'émission a échoué, réessayez",
        }),
      ),
  })

  const montantNum = Number(form.montant)
  const canNext =
    (step === 1 && !!form.compte_emetteur && !!form.beneficiaire) ||
    (step === 2 && montantNum > 0) ||
    (step === 3 && form.motif.trim().length >= 3) ||
    step === 4

  const stepLabels = [
    t('portail.bonsPaiement.step1', {
      defaultValue: 'Émetteur & bénéficiaire',
    }),
    t('portail.bonsPaiement.step2', { defaultValue: 'Montant' }),
    t('portail.bonsPaiement.step3', { defaultValue: 'Motif' }),
    t('portail.bonsPaiement.step4', { defaultValue: 'Confirmation' }),
  ]

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
    else mutation.mutate()
  }
  function back() {
    if (step > 1) setStep((s) => s - 1)
    else onClose()
  }

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col px-4 py-5">
      {/* Header with progress */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label={t('actions.back', { defaultValue: 'Retour' })}
          className="flex size-10 items-center justify-center rounded-full text-[var(--color-imaro-primary)] hover:bg-muted"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[var(--color-imaro-accent)]">
            {t('portail.bonsPaiement.stepOf', {
              current: step,
              total: TOTAL_STEPS,
              defaultValue: `Étape ${step} sur ${TOTAL_STEPS}`,
            })}
          </p>
          <p className="truncate font-semibold text-foreground">
            {stepLabels[step - 1]}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < step ? 'bg-[var(--color-imaro-accent)]' : 'bg-muted',
            )}
          />
        ))}
      </div>

      {/* Step body */}
      <div className="mt-6 flex-1 space-y-4">
        {step === 1 && (
          <>
            <Field label={t('portail.bonsPaiement.from')}>
              <select
                value={form.compte_emetteur}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compte_emetteur: e.target.value }))
                }
                className="h-12 w-full rounded-xl border border-border bg-card px-3 text-base"
              >
                {COMPTES_EMETTEUR.map((c) => (
                  <option key={c.id} value={`${c.label} · ${c.numero}`}>
                    {c.label} · {c.numero}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('portail.bonsPaiement.to')}>
              <div className="flex h-12 items-center rounded-xl border border-border bg-muted/40 px-3 text-base font-medium text-foreground">
                {form.beneficiaire}
              </div>
            </Field>
          </>
        )}

        {step === 2 && (
          <Field label={t('portail.bonsPaiement.montant')}>
            <div className="flex items-center rounded-xl border border-border bg-card px-3">
              <input
                type="number"
                inputMode="decimal"
                min={1}
                autoFocus
                value={form.montant}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montant: e.target.value }))
                }
                placeholder="0"
                className="h-14 w-full bg-transparent text-2xl font-semibold text-foreground outline-none"
              />
              <span className="text-base font-medium text-muted-foreground">
                DH
              </span>
            </div>
          </Field>
        )}

        {step === 3 && (
          <Field label={t('portail.bonsPaiement.motif')}>
            <textarea
              autoFocus
              rows={3}
              value={form.motif}
              onChange={(e) =>
                setForm((f) => ({ ...f, motif: e.target.value }))
              }
              placeholder={t('portail.bonsPaiement.motifPlaceholder', {
                defaultValue: 'Ex. Appel de fonds T1 2026',
              })}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-[var(--color-imaro-primary)]"
            />
          </Field>
        )}

        {step === 4 && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <MontantDisplay
              value={montantNum}
              className="block font-display text-3xl text-[var(--color-imaro-primary)]"
            />
            <dl className="space-y-2 text-sm">
              <Line
                label={t('portail.bonsPaiement.from')}
                value={form.compte_emetteur}
              />
              <Line
                label={t('portail.bonsPaiement.to')}
                value={form.beneficiaire}
              />
              <Line
                label={t('portail.bonsPaiement.motif')}
                value={form.motif}
              />
            </dl>
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/20">
              <Clock className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs leading-relaxed">
                {t('portail.bonsPaiement.delaiNotice', {
                  defaultValue:
                    'Validation par le syndic possible après un délai de 24 h.',
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <button
        type="button"
        onClick={next}
        disabled={!canNext || mutation.isPending}
        className={cn(
          'mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50',
          step === TOTAL_STEPS
            ? 'bg-[var(--color-imaro-accent)]'
            : 'bg-[var(--color-imaro-primary)]',
        )}
      >
        {mutation.isPending ? (
          t('actions.loading', { defaultValue: 'Chargement…' })
        ) : step === TOTAL_STEPS ? (
          <>
            <FileText className="size-4" />
            {t('portail.bonsPaiement.emit', { defaultValue: 'Émettre le bon' })}
          </>
        ) : (
          t('actions.continue', { defaultValue: 'Continuer' })
        )}
      </button>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
