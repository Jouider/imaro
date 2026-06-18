import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useResidenceStore } from '@/stores/residenceStore'
import {
  Users,
  UserPlus,
  Copy,
  CheckCircle2,
  Send,
  Building2,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getResidences,
  getCoproprietaires,
  createCoproprietaire,
  updateCoproprietaire,
  getLots,
  storeLot,
  type Coproprietaire,
  type CreateCoproprietaireResponse,
  type Lot,
} from '@/services/gestionnaire.service'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CoproRow = Coproprietaire & { residence_name: string }

// ─── Create dialog ────────────────────────────────────────────────────────────

type CreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  residences: Array<{ id: number; name: string }>
  defaultResidenceId: string
  onSuccess: (
    result: CreateCoproprietaireResponse,
    meta: { phone: string },
  ) => void
}

function CreateCoproprietaireDialog({
  open,
  onOpenChange,
  residences,
  defaultResidenceId,
  onSuccess,
}: CreateDialogProps) {
  const { t } = useTranslation()
  const [residenceId, setResidenceId] = useState(defaultResidenceId)
  const [lotId, setLotId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')

  const { data: lotsData, isLoading: loadingLots } = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(Number(residenceId)),
    enabled: !!residenceId,
  })
  // Only unassigned lots, deduplicated by numéro so the same number can never
  // appear twice in the list — an assigned/used number is excluded (KAN-40).
  const seenNumeros = new Set<string>()
  const availableLots = (lotsData?.lots ?? []).filter((l: Lot) => {
    if (l.coproprietaire) return false
    const key = l.numero.trim().toLowerCase().replace(/\s+/g, '')
    if (seenNumeros.has(key)) return false
    seenNumeros.add(key)
    return true
  })

  const mutation = useMutation({
    mutationFn: () =>
      createCoproprietaire({
        name,
        phone: `+212${phoneDigits}`,
        ...(email ? { email } : {}),
        residence_id: Number(residenceId),
        lot_id: Number(lotId),
      }),
    onSuccess: (result) => {
      onSuccess(result, { phone: `+212${phoneDigits}` })
      setName('')
      setEmail('')
      setPhoneDigits('')
      setLotId('')
    },
    onError: () =>
      toast.error(t('gestionnaire.coproprietaires.createAccountError')),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  const canSubmit =
    !!residenceId &&
    !!lotId &&
    !!name.trim() &&
    !!phoneDigits.trim() &&
    !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.coproprietaires.addCopro')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.coproprietaires.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Residence */}
          <div className="space-y-2">
            <Label htmlFor="dialog-residence">{t('common.residence')} *</Label>
            <Select
              value={residenceId}
              onValueChange={(v) => {
                setResidenceId(v)
                setLotId('')
              }}
            >
              <SelectTrigger id="dialog-residence">
                <SelectValue
                  placeholder={t(
                    'gestionnaire.coproprietaires.selectResidencePlaceholder',
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {residences.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lot */}
          <div className="space-y-2">
            <Label htmlFor="dialog-lot">
              {t('gestionnaire.coproprietaires.colLot')} *
            </Label>
            <Select
              value={lotId}
              onValueChange={setLotId}
              disabled={!residenceId || loadingLots}
            >
              <SelectTrigger id="dialog-lot">
                <SelectValue
                  placeholder={
                    !residenceId
                      ? t('gestionnaire.coproprietaires.lotSelectFirst')
                      : loadingLots
                        ? t('actions.loading')
                        : availableLots.length === 0
                          ? t('gestionnaire.coproprietaires.noLotAvailable')
                          : t('gestionnaire.coproprietaires.selectLot')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableLots.map((l: Lot) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.numero} — {l.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="dialog-name">{t('common.name')} *</Label>
            <input
              id="dialog-name"
              type="text"
              placeholder={t(
                'gestionnaire.coproprietaires.fullNamePlaceholder',
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/10"
            />
          </div>

          {/* Phone (required) */}
          <div className="space-y-2">
            <Label htmlFor="dialog-phone">{t('common.phone')} *</Label>
            <div className="flex overflow-hidden rounded-lg border border-border transition-all focus-within:border-[var(--color-imaro-primary)] focus-within:ring-2 focus-within:ring-[var(--color-imaro-primary)]/10">
              <span className="flex items-center border-e bg-muted px-3 text-sm font-bold text-[var(--color-imaro-primary)]">
                +212
              </span>
              <input
                id="dialog-phone"
                type="tel"
                inputMode="numeric"
                placeholder="6XX XX XX XX"
                value={phoneDigits}
                onChange={(e) =>
                  setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))
                }
                required
                dir="ltr"
                className="min-h-[44px] flex-1 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label htmlFor="dialog-email">
              {t('gestionnaire.coproprietaires.emailOptional')}
            </Label>
            <input
              id="dialog-email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/10"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            disabled={!canSubmit}
          >
            {mutation.isPending
              ? t('gestionnaire.coproprietaires.creating')
              : t('gestionnaire.coproprietaires.createCopro')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create lot dialog ────────────────────────────────────────────────────────

type CreateLotDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  residenceId: number
  coproprietaireId: number
  coproprietaireName: string
}

function CreateLotDialog({
  open,
  onOpenChange,
  residenceId,
  coproprietaireId,
  coproprietaireName,
}: CreateLotDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [numero, setNumero] = useState('')
  const [type, setType] = useState<
    'appartement' | 'commerce' | 'parking' | 'cave'
  >('appartement')
  const [etage, setEtage] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [tantieme, setTantieme] = useState('')

  // Existing lots in this residence — used to enforce numéro uniqueness so the
  // same lot can never be created twice (KAN-40).
  const { data: lotsData } = useQuery({
    queryKey: ['lots', String(residenceId)],
    queryFn: () => getLots(residenceId),
    enabled: open && !!residenceId,
  })
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '')
  const existingNumeros = new Set(
    (lotsData?.lots ?? []).map((l: Lot) => normalize(l.numero)),
  )
  const isDuplicateNumero =
    numero.trim() !== '' && existingNumeros.has(normalize(numero))

  const mutation = useMutation({
    mutationFn: () =>
      storeLot(residenceId, {
        numero,
        type,
        etage: Number(etage),
        superficie: Number(superficie),
        tantieme: Number(tantieme),
        // coproprietaire_id passed as extra field for backend assignment
        ...({ coproprietaire_id: coproprietaireId } as object),
      } as Parameters<typeof storeLot>[1]),
    onSuccess: () => {
      toast.success(
        t('gestionnaire.coproprietaires.lotCreatedAssigned', {
          numero,
          name: coproprietaireName,
        }),
      )
      void queryClient.invalidateQueries({ queryKey: ['coproprietaires'] })
      void queryClient.invalidateQueries({ queryKey: ['lots'] })
      onOpenChange(false)
    },
    onError: () =>
      toast.error(t('gestionnaire.coproprietaires.createLotError')),
  })

  const canSubmit =
    !!numero.trim() &&
    !isDuplicateNumero &&
    !!etage &&
    !!superficie &&
    !!tantieme &&
    !mutation.isPending

  const inputCls =
    'w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/10'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-[var(--color-imaro-primary)]" />
            {t('gestionnaire.coproprietaires.createLotTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.coproprietaires.lotAssignDescPre')}
            <span className="font-semibold text-foreground">
              {coproprietaireName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (isDuplicateNumero) return
            mutation.mutate()
          }}
        >
          {/* Numéro + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lot-numero">{t('common.numero')} *</Label>
              <input
                id="lot-numero"
                placeholder="A-01"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                required
                aria-invalid={isDuplicateNumero}
                className={cn(
                  inputCls,
                  isDuplicateNumero &&
                    'border-[var(--color-imaro-danger)] focus:border-[var(--color-imaro-danger)] focus:ring-[var(--color-imaro-danger)]/10',
                )}
              />
              {isDuplicateNumero && (
                <p className="text-xs text-[var(--color-imaro-danger)]">
                  {t('gestionnaire.coproprietaires.lotNumeroExists')}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lot-type">{t('common.type')} *</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as typeof type)}
              >
                <SelectTrigger id="lot-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">
                    {t('gestionnaire.coproprietaires.lotType.appartement')}
                  </SelectItem>
                  <SelectItem value="commerce">
                    {t('gestionnaire.coproprietaires.lotType.commerce')}
                  </SelectItem>
                  <SelectItem value="parking">
                    {t('gestionnaire.coproprietaires.lotType.parking')}
                  </SelectItem>
                  <SelectItem value="cave">
                    {t('gestionnaire.coproprietaires.lotType.cave')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Étage + Superficie + Tantième */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lot-etage">{t('common.etage')} *</Label>
              <input
                id="lot-etage"
                type="number"
                placeholder="1"
                value={etage}
                onChange={(e) => setEtage(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lot-superficie">{t('common.superficie')} *</Label>
              <input
                id="lot-superficie"
                type="number"
                placeholder="85"
                value={superficie}
                onChange={(e) => setSuperficie(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lot-tantieme">{t('common.tantieme')} *</Label>
              <input
                id="lot-tantieme"
                type="number"
                placeholder="45"
                value={tantieme}
                onChange={(e) => setTantieme(e.target.value)}
                required
                className={inputCls}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            disabled={!canSubmit}
          >
            {mutation.isPending
              ? t('gestionnaire.coproprietaires.creatingShort')
              : t('gestionnaire.coproprietaires.createAssignLot')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Success dialog ───────────────────────────────────────────────────────────

type SuccessDialogProps = {
  open: boolean
  onClose: () => void
  onCreateLot: () => void
  result: CreateCoproprietaireResponse | null
  phone: string
}

function SuccessDialog({
  open,
  onClose,
  onCreateLot,
  result,
  phone,
}: SuccessDialogProps) {
  const { t } = useTranslation()
  if (!result) return null

  const phoneDigits = phone.replace(/^\+212/, '')

  function copyCode() {
    if (result?.temp_password) {
      void navigator.clipboard.writeText(result.temp_password)
      toast.success(t('gestionnaire.coproprietaires.codeCopied'))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t('gestionnaire.coproprietaires.ownerCreated')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* ── Green credentials card ── */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {t('gestionnaire.coproprietaires.createdSuccess')}
              </p>
            </div>

            {/* Credentials */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-900 dark:text-green-200 min-w-[100px]">
                  {t('common.phone')} :
                </span>
                <span className="text-green-800 dark:text-green-300 font-mono">
                  {phoneDigits}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-900 dark:text-green-200 min-w-[100px]">
                  {t('gestionnaire.coproprietaires.accessCode')}
                </span>
                <span className="rounded-md bg-green-200 dark:bg-green-800 px-3 py-1 font-mono text-base font-bold tracking-widest text-green-900 dark:text-green-100">
                  {result.temp_password}
                </span>
                <button
                  onClick={copyCode}
                  className="text-green-700 hover:text-green-900 dark:text-green-400"
                  aria-label={t('gestionnaire.coproprietaires.copyCodeAria')}
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Auto-send notice — code already sent by backend (SMS + WhatsApp + Email) */}
            <div className="mt-3 flex items-start gap-2">
              <Send className="size-3.5 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
              <p className="text-xs text-green-700 dark:text-green-400">
                {t('gestionnaire.coproprietaires.codeAutoSent')}
              </p>
            </div>
          </div>

          {/* ── Create lot prompt ── */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground mb-3">
              {t('gestionnaire.coproprietaires.createLotPrompt')}
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2 bg-gradient-imaro text-white shadow-sm hover:brightness-110"
                onClick={onCreateLot}
              >
                <Building2 className="size-4" />
                {t('gestionnaire.coproprietaires.yesCreateLot')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t('gestionnaire.coproprietaires.noFinish')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit dialog (KAN-50) ─────────────────────────────────────────────────────

function EditCoproprietaireDialog({
  target,
  onOpenChange,
  onSaved,
}: {
  target: Coproprietaire | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [email, setEmail] = useState('')

  // Sync local fields whenever a new target opens (derived from props, no effect).
  const [syncedId, setSyncedId] = useState<number | null>(null)
  if (target && target.id !== syncedId) {
    setSyncedId(target.id)
    setName(target.name)
    setPhoneDigits(target.phone.replace(/^\+212/, ''))
    setEmail(target.email ?? '')
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateCoproprietaire(target!.id, {
        name: name.trim(),
        phone: `+212${phoneDigits}`,
        ...(email.trim() ? { email: email.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success(t('gestionnaire.coproprietaires.editSuccess'))
      onSaved()
      onOpenChange(false)
    },
    onError: () => toast.error(t('common.updateError')),
  })

  const canSubmit = !!name.trim() && !!phoneDigits.trim() && !mutation.isPending

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.coproprietaires.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.coproprietaires.editDesc')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) mutation.mutate()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-copro-name">{t('common.name')} *</Label>
            <Input
              id="edit-copro-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-copro-phone">{t('common.phone')} *</Label>
            <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-[var(--color-imaro-primary)] focus-within:ring-2 focus-within:ring-[var(--color-imaro-primary)]/10">
              <span className="flex items-center border-e bg-muted px-3 text-sm font-bold text-[var(--color-imaro-primary)]">
                +212
              </span>
              <input
                id="edit-copro-phone"
                type="tel"
                inputMode="numeric"
                dir="ltr"
                value={phoneDigits}
                onChange={(e) =>
                  setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))
                }
                required
                className="min-h-[44px] flex-1 bg-white px-3 text-sm text-foreground focus:outline-none dark:bg-card"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-copro-email">
              {t('gestionnaire.coproprietaires.emailOptional')}
            </Label>
            <Input
              id="edit-copro-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? t('actions.loading') : t('actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CoproprietairesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const storeResidenceId = useResidenceStore((s) => s.residenceId)
  const setStoreResidence = useResidenceStore((s) => s.setResidenceId)
  const selectedResidenceId = storeResidenceId ? String(storeResidenceId) : ''
  const [createOpen, setCreateOpen] = useState(false)
  const [successResult, setSuccessResult] =
    useState<CreateCoproprietaireResponse | null>(null)
  const [successMeta, setSuccessMeta] = useState<{ phone: string }>({
    phone: '',
  })
  const [createLotOpen, setCreateLotOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Coproprietaire | null>(null)
  const [lotTarget, setLotTarget] = useState<{
    coproprietaireId: number
    coproprietaireName: string
    residenceId: number
  } | null>(null)

  const { data: residences = [], isLoading: loadingResidences } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const residenceId = storeResidenceId

  const { data: coproprietaires = [], isLoading: loadingCopro } = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId!),
    enabled: residenceId !== null,
  })

  const selectedResidence = residences.find((r) => r.id === residenceId)

  const rows: CoproRow[] = coproprietaires.map((c) => ({
    ...c,
    residence_name: selectedResidence?.name ?? '',
  }))

  const columns: Column<CoproRow>[] = [
    {
      key: 'name',
      header: t('gestionnaire.coproprietaires.colNom'),
      sortable: true,
    },
    {
      key: 'phone',
      header: t('gestionnaire.coproprietaires.colTelephone'),
    },
    {
      key: 'lot',
      header: t('gestionnaire.coproprietaires.colLot'),
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot?.numero ?? '—'}</span>
      ),
    },
    {
      key: 'solde',
      header: t('gestionnaire.coproprietaires.colSolde'),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.solde} colorize />,
    },
    {
      key: 'id',
      header: '',
      className: 'w-16 text-right',
      renderCell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t('actions.edit')}
          title={t('actions.edit')}
          onClick={() => setEditTarget(r)}
        >
          <Pencil className="size-3.5" />
        </Button>
      ),
    },
  ]

  function handleCreateSuccess(
    result: CreateCoproprietaireResponse,
    meta: { phone: string },
  ) {
    setCreateOpen(false)
    setSuccessResult(result)
    setSuccessMeta({ phone: meta.phone })
    void queryClient.invalidateQueries({
      queryKey: ['coproprietaires', residenceId],
    })
    // KAN-40: the assigned lot now has an owner — refetch the lots so it drops
    // out of the "available" list and can't be assigned twice.
    void queryClient.invalidateQueries({ queryKey: ['lots'] })
  }

  function handleSuccessClose() {
    setSuccessResult(null)
  }

  function handleSuccessCreateLot() {
    if (!successResult) return
    setLotTarget({
      coproprietaireId: successResult.coproprietaire.id,
      coproprietaireName: successResult.coproprietaire.name,
      residenceId: residenceId ?? 0,
    })
    setSuccessResult(null)
    setCreateLotOpen(true)
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.coproprietaires.title')}
        subtitle={t('gestionnaire.coproprietaires.subtitle')}
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-gradient-imaro text-white shadow-sm hover:brightness-110"
          >
            <UserPlus className="size-4" />
            {t('gestionnaire.coproprietaires.addCopro')}
          </Button>
        }
      />

      {/* Residence selector */}
      <div className="mb-6">
        <Select
          value={selectedResidenceId}
          onValueChange={(v) => setStoreResidence(Number(v))}
          disabled={loadingResidences}
        >
          <SelectTrigger className="w-72">
            <SelectValue
              placeholder={t('gestionnaire.coproprietaires.selectResidence')}
            />
          </SelectTrigger>
          <SelectContent>
            {residences.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey="id"
        isLoading={residenceId !== null && loadingCopro}
        searchable
        exportable
        exportFilename="coproprietaires"
        emptyIcon={<Users className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.coproprietaires.empty')}
        emptyDescription={t('gestionnaire.coproprietaires.emptyDesc')}
      />

      <CreateCoproprietaireDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        residences={residences}
        defaultResidenceId={selectedResidenceId}
        onSuccess={handleCreateSuccess}
      />

      <EditCoproprietaireDialog
        target={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        onSaved={() =>
          void queryClient.invalidateQueries({
            queryKey: ['coproprietaires', residenceId],
          })
        }
      />

      <SuccessDialog
        open={successResult !== null}
        onClose={handleSuccessClose}
        onCreateLot={handleSuccessCreateLot}
        result={successResult}
        phone={successMeta.phone}
      />

      {lotTarget && (
        <CreateLotDialog
          open={createLotOpen}
          onOpenChange={(v) => {
            setCreateLotOpen(v)
            if (!v) setLotTarget(null)
          }}
          residenceId={lotTarget.residenceId}
          coproprietaireId={lotTarget.coproprietaireId}
          coproprietaireName={lotTarget.coproprietaireName}
        />
      )}
    </div>
  )
}
