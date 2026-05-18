import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Users, UserPlus, Mail, Phone, Copy, CheckCircle2,
  MessageCircle, Building2, TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getResidences,
  getCoproprietaires,
  createCoproprietaire,
  storeLot,
  type Coproprietaire,
  type CreateCoproprietaireInput,
  type CreateCoproprietaireResponse,
} from '@/services/gestionnaire.service'
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
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type CoproRow = Coproprietaire & { residence_name: string }

// ─── Auth method card ────────────────────────────────────────────────────────

type AuthMethod = 'email' | 'phone'

type AuthMethodCardProps = {
  method: AuthMethod
  selected: boolean
  onSelect: () => void
}

function AuthMethodCard({ method, selected, onSelect }: AuthMethodCardProps) {
  const isEmail = method === 'email'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all',
        selected
          ? 'border-[#1B4F72] bg-[#1B4F72]/5'
          : 'border-border bg-muted/30 hover:border-[#1B4F72]/40',
      )}
    >
      {isEmail ? (
        <Mail className={cn('size-5', selected ? 'text-[#1B4F72]' : 'text-muted-foreground')} />
      ) : (
        <Phone className={cn('size-5', selected ? 'text-[#1B4F72]' : 'text-muted-foreground')} />
      )}
      <span className={cn('text-sm', selected ? 'font-semibold text-[#1B4F72]' : 'text-muted-foreground')}>
        {isEmail ? 'Email' : 'Téléphone'}
      </span>
    </button>
  )
}

// ─── Create dialog ────────────────────────────────────────────────────────────

type CreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  residences: Array<{ id: number; name: string }>
  defaultResidenceId: string
  onSuccess: (result: CreateCoproprietaireResponse, meta: { authMethod: 'email' | 'phone'; email: string }) => void
}

function CreateCoproprietaireDialog({
  open,
  onOpenChange,
  residences,
  defaultResidenceId,
  onSuccess,
}: CreateDialogProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [residenceId, setResidenceId] = useState(defaultResidenceId)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const input: CreateCoproprietaireInput = {
        auth_method: authMethod,
        name,
        residence_id: Number(residenceId),
        ...(authMethod === 'email'
          ? { email, ...(phoneDigits ? { phone: `+212${phoneDigits}` } : {}) }
          : { phone: `+212${phoneDigits}`, ...(email ? { email } : {}) }),
      }
      return createCoproprietaire(input)
    },
    onSuccess: (result) => {
      onSuccess(result, { authMethod, email })
      // reset form
      setName('')
      setEmail('')
      setPhoneDigits('')
      setAuthMethod('email')
    },
    onError: () => toast.error('Erreur lors de la création du compte'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  const emailRequired = authMethod === 'email'
  const canSubmit =
    !!residenceId &&
    !!name.trim() &&
    (emailRequired ? !!email.trim() : !!phoneDigits.trim()) &&
    !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un copropriétaire</DialogTitle>
          <DialogDescription>
            Ceci créera un nouveau copropriétaire et lui générera un compte pour accéder à son espace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Auth method selector */}
          <div className="space-y-2">
            <Label>Méthode d'authentification</Label>
            <div className="flex gap-3">
              <AuthMethodCard method="email" selected={authMethod === 'email'} onSelect={() => setAuthMethod('email')} />
              <AuthMethodCard method="phone" selected={authMethod === 'phone'} onSelect={() => setAuthMethod('phone')} />
            </div>
            <p className="text-xs text-muted-foreground">
              {authMethod === 'email'
                ? 'Un mot de passe temporaire sera généré et à partager avec le copropriétaire.'
                : 'Un code WhatsApp sera envoyé lors de sa première connexion.'}
            </p>
          </div>

          {/* Residence */}
          <div className="space-y-2">
            <Label htmlFor="dialog-residence">Résidence *</Label>
            <Select value={residenceId} onValueChange={setResidenceId}>
              <SelectTrigger id="dialog-residence">
                <SelectValue placeholder="Sélectionner une résidence..." />
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

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="dialog-name">Nom *</Label>
            <input
              id="dialog-name"
              type="text"
              placeholder="Nom complet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[#1B4F72] focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/10"
            />
          </div>

          {/* Email (required when email method, optional when phone) */}
          {authMethod === 'email' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dialog-email">Email *</Label>
                <input
                  id="dialog-email"
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[#1B4F72] focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-phone-opt">Téléphone (optionnel)</Label>
                <div className="flex overflow-hidden rounded-lg border border-border transition-all focus-within:border-[#1B4F72] focus-within:ring-2 focus-within:ring-[#1B4F72]/10">
                  <span className="flex items-center border-e bg-muted px-3 text-sm font-bold text-[#1B4F72]">
                    +212
                  </span>
                  <input
                    id="dialog-phone-opt"
                    type="tel"
                    inputMode="numeric"
                    placeholder="6XX XX XX XX"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    dir="ltr"
                    className="min-h-[44px] flex-1 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Phone (required when phone method) */}
          {authMethod === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dialog-phone-req">Téléphone *</Label>
                <div className="flex overflow-hidden rounded-lg border border-border transition-all focus-within:border-[#1B4F72] focus-within:ring-2 focus-within:ring-[#1B4F72]/10">
                  <span className="flex items-center border-e bg-muted px-3 text-sm font-bold text-[#1B4F72]">
                    +212
                  </span>
                  <input
                    id="dialog-phone-req"
                    type="tel"
                    inputMode="numeric"
                    placeholder="6XX XX XX XX"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    required
                    dir="ltr"
                    className="min-h-[44px] flex-1 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-email-opt">Email (optionnel)</Label>
                <input
                  id="dialog-email-opt"
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[#1B4F72] focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/10"
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-[#1B4F72] text-white hover:bg-[#153f5c]"
            disabled={!canSubmit}
          >
            {mutation.isPending ? 'Création en cours…' : 'Créer le copropriétaire'}
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
  const queryClient = useQueryClient()
  const [numero, setNumero] = useState('')
  const [type, setType] = useState<'appartement' | 'commerce' | 'parking' | 'cave'>('appartement')
  const [etage, setEtage] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [tantieme, setTantieme] = useState('')

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
      toast.success(`Lot ${numero} créé et assigné à ${coproprietaireName}`)
      void queryClient.invalidateQueries({ queryKey: ['coproprietaires'] })
      void queryClient.invalidateQueries({ queryKey: ['lots'] })
      onOpenChange(false)
    },
    onError: () => toast.error('Erreur lors de la création du lot'),
  })

  const canSubmit =
    !!numero.trim() && !!etage && !!superficie && !!tantieme && !mutation.isPending

  const inputCls =
    'w-full min-h-[44px] rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[#1B4F72] focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/10'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-[#1B4F72]" />
            Créer un lot
          </DialogTitle>
          <DialogDescription>
            Ce lot sera automatiquement assigné à{' '}
            <span className="font-semibold text-foreground">{coproprietaireName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
        >
          {/* Numéro + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lot-numero">Numéro *</Label>
              <input
                id="lot-numero"
                placeholder="A-01"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lot-type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="lot-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">Appartement</SelectItem>
                  <SelectItem value="commerce">Commerce</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="cave">Cave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Étage + Superficie + Tantième */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lot-etage">Étage *</Label>
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
              <Label htmlFor="lot-superficie">Superficie (m²) *</Label>
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
              <Label htmlFor="lot-tantieme">Tantième *</Label>
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
            className="h-11 w-full bg-[#1B4F72] text-white hover:bg-[#153f5c]"
            disabled={!canSubmit}
          >
            {mutation.isPending ? 'Création…' : 'Créer et assigner le lot'}
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
  result: CreateCoproprietaireResponse | null
  residenceId: number
  authMethod: 'email' | 'phone'
  email: string
}

function SuccessDialog({ open, onClose, result, residenceId, authMethod, email }: SuccessDialogProps) {
  const [createLotOpen, setCreateLotOpen] = useState(false)

  if (!result) return null

  const isEmail = authMethod === 'email'
  const phone = result.coproprietaire.phone
  const phoneDigits = phone.replace(/^\+212/, '')

  function copyCode() {
    if (result?.temp_password) {
      void navigator.clipboard.writeText(result.temp_password)
      toast.success('Code copié !')
    }
  }

  function sendWhatsApp() {
    const code = result?.temp_password ?? ''
    const msg = encodeURIComponent(
      `Bonjour ${result?.coproprietaire.name} 👋\n\nVotre code d'accès Imaro est : *${code}*\n\nConnectez-vous sur l'application et entrez ce code pour accéder à votre espace copropriétaire.`
    )
    window.open(`https://wa.me/${phone.replace('+', '')}?text=${msg}`, '_blank')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Propriétaire créé !</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* ── Green credentials card ── */}
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
              {/* Header row */}
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Le copropriétaire a été créé avec succès.
                </p>
              </div>

              {/* Credentials */}
              <div className="space-y-2 text-sm">
                {isEmail ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-900 dark:text-green-200 min-w-[120px]">Email :</span>
                      <span className="text-green-800 dark:text-green-300 font-mono">{email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-900 dark:text-green-200 min-w-[120px]">Mot de passe :</span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono text-green-800 dark:text-green-300 tracking-wider">
                          {result.temp_password}
                        </span>
                        <button
                          onClick={copyCode}
                          className="text-green-700 hover:text-green-900 dark:text-green-400"
                          aria-label="Copier le mot de passe"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-900 dark:text-green-200 min-w-[100px]">Téléphone :</span>
                      <span className="text-green-800 dark:text-green-300 font-mono">{phoneDigits}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-900 dark:text-green-200 min-w-[100px]">Code d'accès :</span>
                      <span className="rounded-md bg-green-200 dark:bg-green-800 px-3 py-1 font-mono text-base font-bold tracking-widest text-green-900 dark:text-green-100">
                        {result.temp_password}
                      </span>
                      <button
                        onClick={copyCode}
                        className="text-green-700 hover:text-green-900 dark:text-green-400"
                        aria-label="Copier le code"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Warning or WhatsApp */}
              {isEmail ? (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 italic">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  Notez ces informations, elles ne seront plus accessibles après.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Partagez ce code avec le copropriétaire via WhatsApp.
                  </p>
                  <button
                    onClick={sendWhatsApp}
                    className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <MessageCircle className="size-4" />
                    Envoyer par WhatsApp
                  </button>
                </div>
              )}
            </div>

            {/* ── Create lot prompt ── */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground mb-3">
                Souhaitez-vous créer un lot pour ce nouveau propriétaire ?
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 bg-[#1B4F72] text-white hover:bg-[#153f5c]"
                  onClick={() => {
                    onClose()
                    setCreateLotOpen(true)
                  }}
                >
                  <Building2 className="size-4" />
                  Oui, créer un lot
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Non, terminer
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lot creation dialog — opens after success dialog closes */}
      <CreateLotDialog
        open={createLotOpen}
        onOpenChange={setCreateLotOpen}
        residenceId={residenceId}
        coproprietaireId={result.coproprietaire.id}
        coproprietaireName={result.coproprietaire.name}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CoproprietairesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedResidenceId, setSelectedResidenceId] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [successResult, setSuccessResult] = useState<CreateCoproprietaireResponse | null>(null)
  const [successMeta, setSuccessMeta] = useState<{ authMethod: 'email' | 'phone'; email: string }>({
    authMethod: 'email',
    email: '',
  })

  const { data: residences = [], isLoading: loadingResidences } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const residenceId = selectedResidenceId ? Number(selectedResidenceId) : null

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
        <span className="font-mono text-sm">{r.lot.numero}</span>
      ),
    },
    {
      key: 'solde_actuel',
      header: t('gestionnaire.coproprietaires.colSolde'),
      sortable: true,
      renderCell: (r) => (
        <MontantDisplay value={r.solde_actuel} colorize />
      ),
    },
  ]

  function handleCreateSuccess(
    result: CreateCoproprietaireResponse,
    meta: { authMethod: 'email' | 'phone'; email: string },
  ) {
    setCreateOpen(false)
    setSuccessResult(result)
    setSuccessMeta(meta)
    void queryClient.invalidateQueries({ queryKey: ['coproprietaires', residenceId] })
  }

  function handleSuccessClose() {
    setSuccessResult(null)
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.coproprietaires.title')}
        subtitle={t('gestionnaire.coproprietaires.subtitle')}
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#1B4F72] text-white hover:bg-[#153f5c]"
          >
            <UserPlus className="size-4" />
            Ajouter un copropriétaire
          </Button>
        }
      />

      {/* Residence selector */}
      <div className="mb-6">
        <Select
          value={selectedResidenceId}
          onValueChange={setSelectedResidenceId}
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

      <SuccessDialog
        open={successResult !== null}
        onClose={handleSuccessClose}
        result={successResult}
        residenceId={residenceId ?? 0}
        authMethod={successMeta.authMethod}
        email={successMeta.email}
      />
    </div>
  )
}
