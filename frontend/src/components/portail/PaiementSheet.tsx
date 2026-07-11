import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  QrCode,
  Upload,
  Sparkles,
} from 'lucide-react'
import {
  declarePaiement,
  analyserJustificatifOcr,
  getMyResidenceBankAccounts,
  type PaiementMethode,
  type PortailBankAccount,
} from '@/services/portail.service'
import { banqueLabel, buildPaymentPayload } from '@/lib/payment'
import { openExternal, listenForBrowserClose } from '@/lib/native-actions'
import { BottomSheet } from '@/components/portail/BottomSheet'
import { PaymentQr } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Montant pré-rempli (ex. solde dû). */
  defaultMontant?: number
  /** Référence suggérée (ex. lot / appel de fonds). */
  defaultReference?: string
  /**
   * URL de paiement en ligne (passerelle bancaire).
   * Quand fournie, un bouton "Payer en ligne" ouvre cette URL dans le
   * navigateur intégré (Capacitor) ou un nouvel onglet (web).
   * Abdellah: à brancher sur l'endpoint qui renvoie l'URL CMI/PayDunya.
   */
  paymentUrl?: string
  onSuccess?: () => void
}

type Step = 'how' | 'declare'

const METHODES: PaiementMethode[] = [
  'virement',
  'versement',
  'cheque',
  'especes',
]

const todayIso = () => new Date().toISOString().slice(0, 10)

export function PaiementSheet({
  open,
  onOpenChange,
  defaultMontant,
  defaultReference,
  paymentUrl,
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('how')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Declare form
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(todayIso())
  const [methode, setMethode] = useState<PaiementMethode>('virement')
  const [reference, setReference] = useState('')
  const [justificatif, setJustificatif] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  const VALID_METHODES: PaiementMethode[] = [
    'virement',
    'versement',
    'cheque',
    'especes',
  ]

  // Analyse OCR du justificatif (KAN-84) : préremplit les champs vides détectés.
  // Best-effort : aucune valeur inventée, l'utilisateur vérifie/corrige.
  async function handleJustificatifChange(file: File | null) {
    setJustificatif(file)
    if (!file) return
    setOcrLoading(true)
    try {
      const { ocr_ok, champs } = await analyserJustificatifOcr(file)
      if (!ocr_ok) return
      let prefilled = false
      if (champs.montant != null && montant.trim() === '') {
        setMontant(String(champs.montant))
        prefilled = true
      }
      if (champs.date) {
        setDate(champs.date)
        prefilled = true
      }
      if (
        champs.methode &&
        VALID_METHODES.includes(champs.methode as PaiementMethode)
      ) {
        setMethode(champs.methode as PaiementMethode)
        prefilled = true
      }
      if (champs.reference && reference.trim() === '') {
        setReference(champs.reference)
        prefilled = true
      }
      if (prefilled) {
        toast.success(
          t('portail.paiement.ocr.prefilled', {
            defaultValue: 'Champs pré-remplis depuis le justificatif',
          }),
        )
      }
    } catch {
      // Best-effort : on ignore, saisie manuelle.
    } finally {
      setOcrLoading(false)
    }
  }

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['portail-bank-accounts'],
    queryFn: getMyResidenceBankAccounts,
    enabled: open,
  })

  // When the in-app browser closes after an online payment, treat it as a
  // successful return and let the caller refresh (same as a declared payment).
  useEffect(() => {
    if (!open || !paymentUrl) return
    return listenForBrowserClose(() => {
      onOpenChange(false)
      onSuccess?.()
    })
  }, [open, paymentUrl, onOpenChange, onSuccess])

  // Reset/populate on closed → open transition (render-time, no effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setStep('how')
    setSelectedId(null)
    setShowQr(false)
    setMontant(defaultMontant != null ? String(defaultMontant) : '')
    setDate(todayIso())
    setMethode('virement')
    setReference(defaultReference ?? '')
    setJustificatif(null)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const selectedAccount =
    accounts.find((a) => a.id === selectedId) ??
    accounts.find((a) => a.is_primary) ??
    accounts[0]

  const declareMutation = useMutation({
    mutationFn: () =>
      declarePaiement({
        montant: Number(montant),
        date,
        methode,
        reference: reference.trim(),
        justificatif: justificatif ?? undefined,
      }),
    onSuccess: () => {
      toast.success(t('portail.paiement.toast.declared'))
      onOpenChange(false)
      onSuccess?.()
    },
    onError: () => toast.error(t('portail.paiement.toast.error')),
  })

  async function copyRib(account: PortailBankAccount) {
    try {
      await navigator.clipboard.writeText(account.rib)
      setCopiedId(account.id)
      window.setTimeout(() => setCopiedId(null), 1500)
      toast.success(t('portail.paiement.ribCopied'))
    } catch {
      toast.error(t('portail.paiement.copyError'))
    }
  }

  const montantValue = Number(montant)
  // KAN-83 : la référence est obligatoire pour la traçabilité du règlement.
  const canSubmit =
    Number.isFinite(montantValue) &&
    montantValue > 0 &&
    date !== '' &&
    reference.trim() !== ''

  const title =
    step === 'how'
      ? t('portail.paiement.howTitle')
      : t('portail.paiement.declareTitle')

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      {step === 'how' ? (
        <div className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">
            {t('portail.paiement.howIntro')}
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t('portail.paiement.noAccounts')}
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const active = selectedAccount?.id === account.id
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(account.id)
                      setShowQr(false)
                    }}
                    className={cn(
                      'w-full rounded-xl border bg-card p-4 text-start transition-colors',
                      active
                        ? 'border-[var(--color-imaro-primary)] ring-1 ring-[var(--color-imaro-primary)]/30'
                        : 'hover:border-[var(--color-imaro-primary)]/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base text-foreground">
                        {banqueLabel(account.banque)}
                      </span>
                      {account.is_primary && (
                        <span className="rounded-full bg-[var(--color-imaro-primary-tint)] px-2 py-0.5 text-xs font-medium text-[var(--color-imaro-primary)]">
                          {t('portail.paiement.recommended')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {account.titulaire}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
                      <code className="truncate font-mono text-sm tabular-nums text-foreground">
                        {account.rib}
                      </code>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={t('portail.paiement.copyRib')}
                        onClick={(e) => {
                          e.stopPropagation()
                          void copyRib(account)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            void copyRib(account)
                          }
                        }}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background"
                      >
                        {copiedId === account.id ? (
                          <Check className="size-4 text-[var(--color-imaro-success)]" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </span>
                    </div>
                    {account.iban && (
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {account.iban}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* QR toggle */}
          {selectedAccount && (
            <div className="rounded-xl border bg-card p-4">
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-sm font-medium text-[var(--color-imaro-primary)]"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="size-4" />
                  {t('portail.paiement.showQr')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {showQr ? t('actions.hide') : t('actions.show')}
                </span>
              </button>
              {showQr && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <PaymentQr
                    value={buildPaymentPayload(selectedAccount, {
                      montant: canSubmit ? montantValue : undefined,
                      reference: reference.trim() || undefined,
                    })}
                    size={200}
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    {t('portail.paiement.qrHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="flex gap-2 rounded-xl bg-[var(--color-imaro-primary-tint)] p-3 text-xs text-[var(--color-imaro-primary)]">
            <Info className="size-4 shrink-0" />
            <p>{t('portail.paiement.instructions')}</p>
          </div>

          {/* Online payment — only rendered when the backend provides a URL */}
          {paymentUrl && (
            <Button
              className="w-full gap-2 bg-[var(--color-imaro-accent)] text-white hover:bg-[var(--color-imaro-accent)]/90"
              onClick={() => void openExternal(paymentUrl)}
            >
              <ExternalLink className="size-4" />
              {t('portail.paiement.payOnline')}
            </Button>
          )}

          <Button
            className="w-full"
            variant={paymentUrl ? 'outline' : 'default'}
            disabled={accounts.length === 0}
            onClick={() => setStep('declare')}
          >
            {t('portail.paiement.iPaid')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pb-2">
          <button
            type="button"
            onClick={() => setStep('how')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t('portail.paiement.backToHow')}
          </button>

          <div className="space-y-1.5">
            <Label htmlFor="pay-montant">{t('portail.paiement.montant')}</Label>
            <Input
              id="pay-montant"
              type="number"
              inputMode="decimal"
              min={0}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="1500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">{t('portail.paiement.date')}</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('portail.paiement.methode')}</Label>
            <Select
              value={methode}
              onValueChange={(v) => setMethode(v as PaiementMethode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`portail.paiement.methodes.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">
              {t('portail.paiement.reference')}{' '}
              <span className="text-[var(--color-imaro-danger)]">*</span>
            </Label>
            <Input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t('portail.paiement.referencePlaceholder')}
              aria-invalid={reference.trim() === ''}
            />
            <p className="text-xs text-muted-foreground">
              {t('portail.paiement.referenceRequired')}
            </p>
          </div>

          {/* Justificatif upload */}
          <div className="space-y-1.5">
            <Label>{t('portail.paiement.justificatif')}</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) =>
                void handleJustificatifChange(e.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={ocrLoading}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-start text-sm hover:border-[var(--color-imaro-primary)]/50 disabled:opacity-70"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-imaro-primary-tint)] text-[var(--color-imaro-primary)]">
                {ocrLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Upload className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {justificatif ? (
                  <span className="block truncate font-medium text-foreground">
                    {justificatif.name}
                  </span>
                ) : (
                  <span className="block text-muted-foreground">
                    {t('portail.paiement.justificatifHint')}
                  </span>
                )}
              </span>
            </button>
            {ocrLoading && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-imaro-primary)]">
                <Sparkles className="size-3.5" />
                {t('portail.paiement.ocr.analyzing', {
                  defaultValue: 'Analyse du justificatif…',
                })}
              </p>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || declareMutation.isPending}
            onClick={() => declareMutation.mutate()}
          >
            {declareMutation.isPending && (
              <Loader2 className="me-2 size-4 animate-spin" />
            )}
            {t('portail.paiement.submit')}
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}
