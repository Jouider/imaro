import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users, UserPlus, Mail, Phone, Copy, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getResidences,
  getCoproprietaires,
  createCoproprietaire,
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
  onSuccess: (result: CreateCoproprietaireResponse) => void
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
      onSuccess(result)
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

// ─── Success dialog ───────────────────────────────────────────────────────────

type SuccessDialogProps = {
  open: boolean
  onClose: () => void
  result: CreateCoproprietaireResponse | null
}

function SuccessDialog({ open, onClose, result }: SuccessDialogProps) {
  if (!result) return null

  function copyPassword() {
    if (result?.temp_password) {
      void navigator.clipboard.writeText(result.temp_password)
      toast.success('Copié !')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compte créé avec succès</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Success banner */}
          <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3">
            <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            <p className="text-sm text-green-800">
              Le compte de <span className="font-semibold">{result.coproprietaire.name}</span> a été créé.
            </p>
          </div>

          {result.temp_password ? (
            /* Email method — show temp password */
            <div className="space-y-2">
              <Label>Mot de passe temporaire</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-border bg-muted/40 px-4 py-2.5 font-mono text-base tracking-widest text-[#1B4F72]">
                  {result.temp_password}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="shrink-0 gap-1.5"
                >
                  <Copy className="size-3.5" />
                  Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Partagez ce mot de passe avec le copropriétaire pour qu'il puisse se connecter via l'application.
              </p>
            </div>
          ) : (
            /* Phone method — WhatsApp notice */
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-[#1B4F72]" />
              <p className="text-sm text-muted-foreground">
                Un code WhatsApp sera envoyé au{' '}
                <span className="font-semibold text-foreground">
                  +212 {result.coproprietaire.phone.replace(/^\+212/, '')}
                </span>{' '}
                lors de sa première connexion.
              </p>
            </div>
          )}

          <Button
            type="button"
            className="h-11 w-full bg-[#1B4F72] text-white hover:bg-[#153f5c]"
            onClick={onClose}
          >
            Terminer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CoproprietairesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedResidenceId, setSelectedResidenceId] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [successResult, setSuccessResult] = useState<CreateCoproprietaireResponse | null>(null)

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

  function handleCreateSuccess(result: CreateCoproprietaireResponse) {
    setCreateOpen(false)
    setSuccessResult(result)
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
      />
    </div>
  )
}
