import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  CreditCard,
  Bell,
  Send,
  CheckCircle,
  X,
  Download,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import {
  getCreances,
  getEncaissements,
  getVirementsDeclares,
  storeEncaissement,
  validerVirement,
  rejeterVirement,
  relancerCreance,
  relancerTout,
  getDecompte,
  type Creance,
  type Encaissement,
  type VirementDeclare,
} from '@/services/paiements.service'
import {
  getAppelsFonds,
  getResidences,
  getLots,
  storeAppelFonds,
  envoyerAppelFonds,
  type AppelFonds,
  type Lot,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Tab = 'creances' | 'appels' | 'historique' | 'decomptes' | 'virements'

// ─── Statut badge helpers ─────────────────────────────────────────────────────

const CREANCE_STATUT_CLS: Record<string, string> = {
  a_payer: 'bg-blue-100 text-blue-800',
  en_retard: 'bg-red-100 text-red-800',
  paye: 'bg-green-100 text-green-800',
  partiellement_paye: 'bg-orange-100 text-orange-800',
  annulee: 'bg-gray-100 text-gray-600',
}

const APPEL_STATUT_CLS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  envoye: 'bg-blue-100 text-blue-700',
  publie: 'bg-blue-100 text-blue-700',
  partiellement_encaisse: 'bg-purple-100 text-purple-700',
  encaisse: 'bg-green-100 text-green-800',
  annule: 'bg-red-100 text-red-700',
}

const ENCAISSEMENT_METHODE_CLS: Record<string, string> = {
  especes: 'bg-green-100 text-green-800',
  virement: 'bg-blue-100 text-blue-800',
  cheque: 'bg-purple-100 text-purple-800',
  cb: 'bg-orange-100 text-orange-800',
  mobile_money: 'bg-cyan-100 text-cyan-800',
}

const VIREMENT_STATUT_CLS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  valide: 'bg-green-100 text-green-800',
  rejete: 'bg-red-100 text-red-800',
}

const VIREMENT_METHODE_CLS: Record<string, string> = {
  virement: 'bg-blue-100 text-blue-800',
  versement: 'bg-cyan-100 text-cyan-800',
  cheque: 'bg-purple-100 text-purple-800',
  especes: 'bg-green-100 text-green-800',
}

// ─── Justificatif preview modal ──────────────────────────────────────────────

function detectVirementFileType(url: string): 'pdf' | 'image' | 'other' {
  const clean = url.toLowerCase().split('?')[0]
  if (clean.endsWith('.pdf')) return 'pdf'
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(clean)) return 'image'
  // Unsplash & co. servent des images sans extension → on tente l'image.
  if (clean.startsWith('http')) return 'image'
  return 'other'
}

function JustificatifModal({
  virement,
  onClose,
}: {
  virement: VirementDeclare | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const url = virement?.justificatif_path ?? ''
  const fileType = url ? detectVirementFileType(url) : 'other'

  return (
    <Dialog open={!!virement} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0">
        <DialogHeader className="flex-row items-start justify-between gap-2 border-b px-4 pb-3 pt-4">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-semibold">
              {t('gestionnaire.paiements.virements.justificatif', {
                defaultValue: 'Justificatif',
              })}
            </DialogTitle>
            {virement && (
              <p className="mt-1 text-xs text-muted-foreground">
                {virement.coproprietaire_nom} · {virement.lot_numero} ·{' '}
                {virement.reference}
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="flex min-h-48 items-center justify-center bg-muted/30">
          {fileType === 'pdf' && (
            <iframe src={url} title="justificatif" className="h-72 w-full" />
          )}
          {fileType === 'image' && (
            <img
              src={url}
              alt="justificatif"
              className="max-h-72 w-full object-contain"
            />
          )}
          {fileType === 'other' && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <FileText className="size-16 opacity-30" />
              <p className="text-sm">
                {t('gestionnaire.paiements.virements.previewUnavailable', {
                  defaultValue: 'Aperçu non disponible',
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('actions.close', { defaultValue: 'Fermer' })}
          </Button>
          {url && (
            <Button size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Download className="me-1.5 size-4" />
                {t('gestionnaire.paiements.virements.openProof', {
                  defaultValue: 'Ouvrir',
                })}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Small list of coproprietaires for avance modal ──────────────────────────

const MOCK_COPROS = [
  { id: 1, nom: 'Hassan Benali', lot: 'A-01' },
  { id: 2, nom: 'Fatima Chraibi', lot: 'A-02' },
  { id: 3, nom: 'Youssef Tazi', lot: 'A-03' },
  { id: 4, nom: 'Nadia Berrada', lot: 'A-04' },
  { id: 5, nom: 'Omar Fassi', lot: 'A-05' },
]

// ─── RepartitionPreview (for appels tab) ─────────────────────────────────────

const fmt = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 })

function RepartitionPreview({
  lots,
  totalTantieme,
  montantTotal,
}: {
  lots: Lot[]
  totalTantieme: number
  montantTotal: number
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        <span>Répartition par tantième</span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="mt-2 max-h-40 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1 text-left font-medium">Lot</th>
                <th className="py-1 text-right font-medium">Tantième</th>
                <th className="py-1 text-right font-medium">%</th>
                <th className="py-1 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const pct =
                  totalTantieme > 0 ? (lot.tantieme / totalTantieme) * 100 : 0
                const montantLot =
                  totalTantieme > 0
                    ? (lot.tantieme / totalTantieme) * montantTotal
                    : 0
                return (
                  <tr
                    key={lot.id}
                    className="border-b border-muted last:border-0"
                  >
                    <td className="py-1 font-mono">{lot.numero}</td>
                    <td className="py-1 text-right tabular-nums">
                      {lot.tantieme}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {pct.toFixed(2)} %
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {fmt.format(montantLot)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold">
                <td className="py-1">Total</td>
                <td className="py-1 text-right tabular-nums">
                  {totalTantieme}
                </td>
                <td className="py-1 text-right tabular-nums">100 %</td>
                <td className="py-1 text-right tabular-nums">
                  {fmt.format(montantTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── EncaisserModal ───────────────────────────────────────────────────────────

type EncaisserModalProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  preselectedCreance?: Creance
}

function EncaisserModal({
  open,
  onOpenChange,
  preselectedCreance,
}: EncaisserModalProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [step, setStep] = useState<1 | 2>(preselectedCreance ? 2 : 1)
  const [selectedCreance, setSelectedCreance] = useState<Creance | null>(
    preselectedCreance ?? null,
  )
  const [montant, setMontant] = useState(
    String(preselectedCreance?.solde_restant ?? ''),
  )
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [methode, setMethode] = useState('virement')
  const [compte, setCompte] = useState('5121')
  const [refCheque, setRefCheque] = useState('')

  const { data: creances = [], isLoading } = useQuery({
    queryKey: ['creances', 'modal'],
    queryFn: () => getCreances(),
    enabled: open && step === 1,
  })

  const payables = creances.filter((c) =>
    ['a_payer', 'partiellement_paye', 'en_retard'].includes(c.statut),
  )

  const storeMutation = useMutation({
    mutationFn: () =>
      storeEncaissement({
        creance_id: selectedCreance!.id,
        montant: Number(montant),
        date_paiement: date,
        methode,
        reference_cheque: refCheque,
        compte_destination: compte,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['creances'] })
      void qc.invalidateQueries({ queryKey: ['encaissements'] })
      toast.success(
        t('gestionnaire.paiements.encaisser.success', {
          defaultValue: 'Paiement enregistré',
        }),
      )
      onOpenChange(false)
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  })

  const handleSelectCreance = (c: Creance) => {
    setSelectedCreance(c)
    setMontant(String(c.solde_restant))
    setStep(2)
  }

  const handleClose = () => {
    setStep(preselectedCreance ? 2 : 1)
    setSelectedCreance(preselectedCreance ?? null)
    setMontant(String(preselectedCreance?.solde_restant ?? ''))
    setRefCheque('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.paiements.encaisser.title', {
              defaultValue: 'Encaisser un paiement',
            })}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t('gestionnaire.paiements.encaisser.step1', {
                defaultValue: 'Sélectionner une créance',
              })}
            </p>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y rounded-lg border">
                {payables.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCreance(c)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <span className="font-medium">
                        {c.coproprietaire_nom}
                      </span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {c.lot_numero}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MontantDisplay value={c.solde_restant} />
                      <Badge
                        className={cn(
                          CREANCE_STATUT_CLS[c.statut],
                          'border-0 text-xs',
                        )}
                      >
                        {t(
                          `gestionnaire.paiements.creances.statuts.${c.statut}`,
                          { defaultValue: c.statut },
                        )}
                      </Badge>
                    </div>
                  </button>
                ))}
                {payables.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Aucune créance à encaisser
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedCreance && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <span className="font-medium">
                {selectedCreance.coproprietaire_nom}
              </span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-mono">{selectedCreance.lot_numero}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {selectedCreance.appel_fonds_titre}
              </span>
              {!preselectedCreance && (
                <button
                  onClick={() => setStep(1)}
                  className="ml-3 text-xs text-blue-600 hover:underline"
                >
                  Changer
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  {t('gestionnaire.paiements.encaisser.montant', {
                    defaultValue: 'Montant (MAD)',
                  })}
                </Label>
                <Input
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  max={selectedCreance.solde_restant}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  {t('gestionnaire.paiements.encaisser.date', {
                    defaultValue: 'Date de paiement',
                  })}
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>
                {t('gestionnaire.paiements.encaisser.methode', {
                  defaultValue: 'Méthode',
                })}
              </Label>
              <Select value={methode} onValueChange={setMethode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'especes',
                      'virement',
                      'cheque',
                      'cb',
                      'mobile_money',
                    ] as const
                  ).map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`gestionnaire.paiements.encaisser.methodes.${m}`, {
                        defaultValue: m,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                {t('gestionnaire.paiements.encaisser.compte', {
                  defaultValue: 'Compte de destination',
                })}
              </Label>
              <Select value={compte} onValueChange={setCompte}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['5121', '5122', '5161'] as const).map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`gestionnaire.paiements.encaisser.comptes.${c}`, {
                        defaultValue: c,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {methode === 'cheque' && (
              <div className="space-y-1">
                <Label>
                  {t('gestionnaire.paiements.encaisser.refCheque', {
                    defaultValue: 'Référence chèque',
                  })}
                </Label>
                <Input
                  value={refCheque}
                  onChange={(e) => setRefCheque(e.target.value)}
                  placeholder="CHQ-XXXX"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={storeMutation.isPending}
          >
            {t('actions.cancel')}
          </Button>
          {step === 2 && (
            <Button
              onClick={() => storeMutation.mutate()}
              disabled={!montant || !selectedCreance || storeMutation.isPending}
            >
              {storeMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── PaiementAvanceModal ──────────────────────────────────────────────────────

function PaiementAvanceModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedCopro, setSelectedCopro] = useState<
    (typeof MOCK_COPROS)[0] | null
  >(null)
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [methode, setMethode] = useState('virement')

  const filtered = MOCK_COPROS.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSubmit = () => {
    toast.success(
      t('gestionnaire.paiements.avance.success', {
        defaultValue: 'Paiement en avance enregistré',
      }),
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.paiements.avance.title', {
              defaultValue: 'Paiement en avance',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {t('gestionnaire.paiements.avance.info', {
              defaultValue:
                'Ce paiement sera affecté automatiquement aux prochains appels de fonds',
            })}
          </div>

          <div className="space-y-1">
            <Label>Copropriétaire</Label>
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && !selectedCopro && (
              <div className="rounded-lg border divide-y">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCopro(c)
                      setSearch(c.nom)
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span>{c.nom}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.lot}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedCopro && (
              <p className="text-xs text-muted-foreground">
                Lot : {selectedCopro.lot}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Montant (MAD)</Label>
              <Input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Méthode</Label>
            <Select value={methode} onValueChange={setMethode}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['especes', 'virement', 'cheque', 'cb', 'mobile_money'].map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {t(`gestionnaire.paiements.encaisser.methodes.${m}`, {
                        defaultValue: m,
                      })}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCopro || !montant}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── RejeterVirementModal ────────────────────────────────────────────────────

function RejeterVirementModal({
  virement,
  onClose,
  onConfirm,
  isLoading,
}: {
  virement: VirementDeclare | null
  onClose: () => void
  onConfirm: (motif: string) => void
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const [motif, setMotif] = useState('')

  return (
    <Dialog open={!!virement} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.paiements.virements.rejeter', {
              defaultValue: 'Rejeter le virement',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label>
            {t('gestionnaire.paiements.virements.motif', {
              defaultValue: 'Motif du rejet',
            })}
          </Label>
          <Input
            className="mt-1"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex: Référence incorrecte..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(motif)}
            disabled={!motif.trim() || isLoading}
          >
            {isLoading
              ? t('actions.loading')
              : t('gestionnaire.paiements.virements.rejeter', {
                  defaultValue: 'Rejeter',
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PaiementsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('creances')

  // Modals
  const [encaisserOpen, setEncaisserOpen] = useState(false)
  const [encaisserCreance, setEncaisserCreance] = useState<Creance | undefined>(
    undefined,
  )
  const [avanceOpen, setAvanceOpen] = useState(false)
  const [rejeterVirementTarget, setRejeterVirementTarget] =
    useState<VirementDeclare | null>(null)
  const [justificatifTarget, setJustificatifTarget] =
    useState<VirementDeclare | null>(null)
  const [relancerAllOpen, setRelancerAllOpen] = useState(false)

  // Créances tab filters
  const [creanceSearch, setCreanceSearch] = useState('')
  const [creanceStatut, setCreanceStatut] = useState('tous')
  const [creanceFrom, setCreanceFrom] = useState('')
  const [creanceTo, setCreanceTo] = useState('')

  // Historique tab filters
  const [histMethode, setHistMethode] = useState('tous')
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histSearch, setHistSearch] = useState('')

  // Décomptes tab
  const [decompteSearch, setDecompteSearch] = useState('')
  const [selectedCoproId, setSelectedCoproId] = useState<number | null>(null)

  // Appels tab
  const [createAppelOpen, setCreateAppelOpen] = useState(false)
  const [appelForm, setAppelForm] = useState({
    titre: '',
    residence_id: '',
    montant_total: '',
    date_echeance: '',
  })
  const [envoyerTarget, setEnvoyerTarget] = useState<AppelFonds | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: creances = [], isLoading: loadingCreances } = useQuery({
    queryKey: ['creances'],
    queryFn: () => getCreances(),
  })

  const { data: encaissements = [], isLoading: loadingEnc } = useQuery({
    queryKey: ['encaissements'],
    queryFn: () => getEncaissements(),
    enabled: activeTab === 'historique',
  })

  const { data: virements = [], isLoading: loadingVirements } = useQuery({
    queryKey: ['virements-declares'],
    queryFn: () => getVirementsDeclares(),
    enabled: activeTab === 'virements',
  })

  const { data: decompte, isLoading: loadingDecompte } = useQuery({
    queryKey: ['decompte', selectedCoproId],
    queryFn: () => getDecompte(selectedCoproId!),
    enabled: selectedCoproId !== null,
  })

  const { data: appelsFonds = [], isLoading: loadingAppels } = useQuery({
    queryKey: ['appels-fonds'],
    queryFn: () => getAppelsFonds(),
    enabled: activeTab === 'appels',
  })

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
    enabled: createAppelOpen,
  })

  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots', appelForm.residence_id],
    queryFn: () => getLots(Number(appelForm.residence_id)),
    enabled: !!appelForm.residence_id && createAppelOpen,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const relancerCreanceMutation = useMutation({
    mutationFn: (id: number) => relancerCreance(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['creances'] })
      toast.success(
        t('gestionnaire.paiements.creances.relanceSuccess', {
          defaultValue: 'Relance envoyée',
        }),
      )
    },
    onError: () => toast.error('Erreur'),
  })

  const relancerToutMutation = useMutation({
    mutationFn: () => relancerTout(),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['creances'] })
      setRelancerAllOpen(false)
      toast.success(`${res.nb_envoye} relance(s) envoyée(s)`)
    },
    onError: () => toast.error('Erreur'),
  })

  const validerVirementMutation = useMutation({
    mutationFn: (id: number) => validerVirement(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['virements-declares'] })
      toast.success(
        t('gestionnaire.paiements.virements.valideSuccess', {
          defaultValue: 'Virement validé',
        }),
      )
    },
    onError: () => toast.error('Erreur'),
  })

  const rejeterVirementMutation = useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) =>
      rejeterVirement(id, motif),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['virements-declares'] })
      setRejeterVirementTarget(null)
      toast.success(
        t('gestionnaire.paiements.virements.rejeteSuccess', {
          defaultValue: 'Virement rejeté',
        }),
      )
    },
    onError: () => toast.error('Erreur'),
  })

  const createAppelMutation = useMutation({
    mutationFn: () =>
      storeAppelFonds({
        titre: appelForm.titre,
        residence_id: Number(appelForm.residence_id),
        montant_total: Number(appelForm.montant_total),
        date_echeance: appelForm.date_echeance,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appels-fonds'] })
      setCreateAppelOpen(false)
      setAppelForm({
        titre: '',
        residence_id: '',
        montant_total: '',
        date_echeance: '',
      })
      toast.success('Appel de fonds créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const envoyerMutation = useMutation({
    mutationFn: (id: number) => envoyerAppelFonds(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appels-fonds'] })
      setEnvoyerTarget(null)
      toast.success('Appel de fonds envoyé')
    },
    onError: () => toast.error('Erreur'),
  })

  // ── Computed stats ─────────────────────────────────────────────────────────

  const nbEnRetard = creances.filter((c) => c.statut === 'en_retard').length
  const nbAPayer = creances.filter((c) => c.statut === 'a_payer').length
  const nbPartiel = creances.filter(
    (c) => c.statut === 'partiellement_paye',
  ).length
  const nbImpayes = nbEnRetard + nbAPayer + nbPartiel
  const totalDu = creances.reduce((s, c) => s + c.montant_initial, 0)
  const totalRegle = creances.reduce((s, c) => s + c.montant_regle, 0)
  const tauxRecouvrement =
    totalDu > 0 ? Math.round((totalRegle / totalDu) * 100) : 0

  // ── Créances filter ────────────────────────────────────────────────────────

  const filteredCreances = creances.filter((c) => {
    if (creanceStatut !== 'tous' && c.statut !== creanceStatut) return false
    if (creanceSearch) {
      const q = creanceSearch.toLowerCase()
      if (
        !c.coproprietaire_nom.toLowerCase().includes(q) &&
        !c.lot_numero.toLowerCase().includes(q)
      )
        return false
    }
    if (creanceFrom && c.date_echeance < creanceFrom) return false
    if (creanceTo && c.date_echeance > creanceTo) return false
    return true
  })

  // ── Encaissements filter ───────────────────────────────────────────────────

  const filteredEnc = encaissements.filter((e) => {
    if (histMethode !== 'tous' && e.methode !== histMethode) return false
    if (histFrom && e.date_paiement < histFrom) return false
    if (histTo && e.date_paiement > histTo) return false
    if (histSearch) {
      const q = histSearch.toLowerCase()
      if (
        !e.coproprietaire_nom.toLowerCase().includes(q) &&
        !e.lot_numero.toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  const totalEncFiltered = filteredEnc.reduce((s, e) => s + e.montant, 0)

  // ── Columns ────────────────────────────────────────────────────────────────

  const creancesColumns: Column<Creance>[] = [
    {
      key: 'coproprietaire_nom',
      header: t('gestionnaire.paiements.creances.colCreance', {
        defaultValue: 'Copropriétaire',
      }),
      sortable: true,
    },
    {
      key: 'lot_numero',
      header: t('gestionnaire.paiements.colLot', { defaultValue: 'Lot' }),
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot_numero}</span>
      ),
    },
    {
      key: 'appel_fonds_titre',
      header: 'Appel de fonds',
      renderCell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.appel_fonds_titre}
        </span>
      ),
    },
    {
      key: 'solde_restant',
      header: t('gestionnaire.paiements.creances.colSolde', {
        defaultValue: 'Solde',
      }),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.solde_restant} colorize />,
    },
    {
      key: 'date_echeance',
      header: t('gestionnaire.paiements.creances.colEcheance', {
        defaultValue: 'Échéance',
      }),
      sortable: true,
      renderCell: (r) => r.date_echeance.slice(0, 10),
    },
    {
      key: 'jours_retard',
      header: t('gestionnaire.paiements.creances.colAnciennete', {
        defaultValue: 'Ancienneté',
      }),
      sortable: true,
      renderCell: (r) =>
        r.statut === 'en_retard' && r.jours_retard > 0 ? (
          <Badge className="border-0 bg-red-100 text-red-800 text-xs">
            {r.jours_retard}j
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'date_derniere_relance',
      header: t('gestionnaire.paiements.creances.colRelance', {
        defaultValue: 'Dernière relance',
      }),
      renderCell: (r) =>
        r.date_derniere_relance ? (
          <span className="text-xs text-muted-foreground">
            {r.date_derniere_relance.slice(0, 10)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'statut',
      header: 'Statut',
      renderCell: (r) => (
        <Badge className={cn(CREANCE_STATUT_CLS[r.statut], 'border-0 text-xs')}>
          {t(`gestionnaire.paiements.creances.statuts.${r.statut}`, {
            defaultValue: r.statut,
          })}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-36 text-right',
      renderCell: (r) => (
        <div className="flex justify-end gap-1">
          {r.statut !== 'paye' && r.statut !== 'annulee' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setEncaisserCreance(r)
                setEncaisserOpen(true)
              }}
            >
              <CreditCard className="me-1 size-3" />
              Encaisser
            </Button>
          )}
          {r.statut !== 'paye' && r.statut !== 'annulee' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={relancerCreanceMutation.isPending}
              onClick={() => relancerCreanceMutation.mutate(r.id)}
            >
              <Send className="size-3" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const appelsColumns: Column<AppelFonds>[] = [
    { key: 'titre', header: 'Titre', sortable: true },
    {
      key: 'residence',
      header: 'Résidence',
      renderCell: (r) => r.residence.name,
    },
    {
      key: 'montant_total',
      header: 'Montant total',
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant_total} />,
    },
    {
      key: 'montant_recouvre',
      header: 'Recouvré',
      renderCell: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--color-imaro-accent)]"
              style={{ width: `${Math.min(r.taux_recouvrement ?? 0, 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-sm">
            {(r.taux_recouvrement ?? 0).toFixed(0)} %
          </span>
        </div>
      ),
    },
    {
      key: 'montant_restant',
      header: 'Restant',
      renderCell: (r) => <MontantDisplay value={r.montant_restant} colorize />,
    },
    {
      key: 'date_echeance',
      header: 'Échéance',
      sortable: true,
      renderCell: (r) => r.date_echeance?.slice(0, 10) ?? '—',
    },
    {
      key: 'statut',
      header: 'Statut',
      renderCell: (r) => {
        const cls = APPEL_STATUT_CLS[r.statut] ?? 'bg-gray-100 text-gray-700'
        return <Badge className={cn(cls, 'border-0 text-xs')}>{r.statut}</Badge>
      },
    },
    {
      key: 'id',
      header: '',
      className: 'w-24 text-right',
      renderCell: (r) =>
        r.statut === 'brouillon' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnvoyerTarget(r)}
          >
            <Send className="me-1.5 size-3.5" />
            Envoyer
          </Button>
        ) : null,
    },
  ]

  const historiqueColumns: Column<Encaissement>[] = [
    {
      key: 'date_paiement',
      header: 'Date',
      sortable: true,
      renderCell: (r) => r.date_paiement.slice(0, 10),
    },
    { key: 'coproprietaire_nom', header: 'Copropriétaire', sortable: true },
    {
      key: 'lot_numero',
      header: 'Lot',
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot_numero}</span>
      ),
    },
    {
      key: 'montant',
      header: 'Montant',
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant} />,
    },
    {
      key: 'methode',
      header: 'Méthode',
      renderCell: (r) => (
        <Badge
          className={cn(
            ENCAISSEMENT_METHODE_CLS[r.methode],
            'border-0 text-xs',
          )}
        >
          {t(`gestionnaire.paiements.encaisser.methodes.${r.methode}`, {
            defaultValue: r.methode,
          })}
        </Badge>
      ),
    },
    {
      key: 'compte_destination',
      header: 'Compte',
      renderCell: (r) => (
        <span className="font-mono text-xs">{r.compte_destination}</span>
      ),
    },
    {
      key: 'est_rapproche',
      header: 'Rapproché',
      renderCell: (r) =>
        r.est_rapproche ? (
          <CheckCircle className="size-4 text-green-500" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'recu_path',
      header: 'Reçu',
      renderCell: (r) =>
        r.recu_path ? (
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <Download className="size-3.5" />
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  const virementsColumns: Column<VirementDeclare>[] = [
    {
      key: 'date_declaration',
      header: 'Date déclaration',
      sortable: true,
      renderCell: (r) => r.date_declaration.slice(0, 10),
    },
    { key: 'coproprietaire_nom', header: 'Copropriétaire', sortable: true },
    {
      key: 'lot_numero',
      header: 'Lot',
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot_numero}</span>
      ),
    },
    {
      key: 'montant',
      header: 'Montant',
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant} />,
    },
    {
      key: 'methode',
      header: t('gestionnaire.paiements.virements.methode', {
        defaultValue: 'Méthode',
      }),
      renderCell: (r) => (
        <Badge
          className={cn(
            VIREMENT_METHODE_CLS[r.methode] ?? 'bg-gray-100 text-gray-700',
            'border-0 text-xs',
          )}
        >
          {t(`gestionnaire.paiements.virements.methodes.${r.methode}`, {
            defaultValue: r.methode,
          })}
        </Badge>
      ),
    },
    {
      key: 'reference',
      header: 'Référence',
      renderCell: (r) => (
        <span className="font-mono text-xs">{r.reference}</span>
      ),
    },
    {
      key: 'justificatif_path',
      header: 'Justificatif',
      renderCell: (r) =>
        r.justificatif_path ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[var(--color-imaro-primary)]"
            onClick={() => setJustificatifTarget(r)}
          >
            <Eye className="size-3.5" />
            {t('gestionnaire.paiements.virements.voir', {
              defaultValue: 'Voir',
            })}
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'statut',
      header: 'Statut',
      renderCell: (r) => (
        <Badge
          className={cn(VIREMENT_STATUT_CLS[r.statut], 'border-0 text-xs')}
        >
          {t(`gestionnaire.paiements.virements.statuts.${r.statut}`, {
            defaultValue: r.statut,
          })}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-40 text-right',
      renderCell: (r) =>
        r.statut === 'en_attente' ? (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
              disabled={validerVirementMutation.isPending}
              onClick={() => validerVirementMutation.mutate(r.id)}
            >
              <CheckCircle className="me-1 size-3" />
              {t('gestionnaire.paiements.virements.valider', {
                defaultValue: 'Valider',
              })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-red-300 text-xs text-red-600 hover:bg-red-50"
              onClick={() => setRejeterVirementTarget(r)}
            >
              <X className="me-1 size-3" />
              {t('gestionnaire.paiements.virements.rejeter', {
                defaultValue: 'Rejeter',
              })}
            </Button>
          </div>
        ) : null,
    },
  ]

  // ── Tabs definition ────────────────────────────────────────────────────────

  const pendingVirements = virements.filter(
    (v) => v.statut === 'en_attente',
  ).length

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    {
      key: 'creances',
      label: t('gestionnaire.paiements.tabs.creances', {
        defaultValue: 'Créances',
      }),
    },
    {
      key: 'appels',
      label: t('gestionnaire.paiements.tabs.appels', {
        defaultValue: 'Appels de fonds',
      }),
    },
    {
      key: 'historique',
      label: t('gestionnaire.paiements.tabs.historique', {
        defaultValue: 'Historique',
      }),
    },
    {
      key: 'decomptes',
      label: t('gestionnaire.paiements.tabs.decomptes', {
        defaultValue: 'Décomptes',
      }),
    },
    {
      key: 'virements',
      label: t('gestionnaire.paiements.tabs.virements', {
        defaultValue: 'Virements',
      }),
      badge: pendingVirements,
    },
  ]

  const lotsArr: Lot[] = lotsData?.lots ?? []
  const totalTantieme: number = lotsData?.total_tantieme ?? 0
  const montantTotal = Number(appelForm.montant_total) || 0

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.paiements.title', {
          defaultValue: 'Suivi des paiements',
        })}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAvanceOpen(true)}
            >
              <CreditCard className="me-1.5 size-4" />
              {t('gestionnaire.paiements.avance.title', {
                defaultValue: 'Paiement en avance',
              })}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEncaisserCreance(undefined)
                setEncaisserOpen(true)
              }}
            >
              <CreditCard className="me-1.5 size-4" />
              Encaisser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRelancerAllOpen(true)}
            >
              <Bell className="me-1.5 size-4" />
              Envoyer rappels
              {nbImpayes > 0 && (
                <Badge className="ms-1.5 border-0 bg-red-100 text-red-800 text-xs px-1.5">
                  {nbImpayes}
                </Badge>
              )}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-[var(--color-imaro-primary)] text-[var(--color-imaro-primary)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-imaro-danger)] px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Créances ── */}
      {activeTab === 'creances' && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-red-600">{nbEnRetard}</span>{' '}
              {t('gestionnaire.paiements.creances.enRetard', {
                defaultValue: 'en retard',
              })}
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold text-blue-600">{nbAPayer}</span>{' '}
              {t('gestionnaire.paiements.creances.aPayer', {
                defaultValue: 'à payer',
              })}
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold text-orange-600">{nbPartiel}</span>{' '}
              partiellement payées
            </span>
            <span>·</span>
            <span>
              {t('gestionnaire.paiements.creances.tauxRecouvrement', {
                defaultValue: 'Taux recouvrement',
              })}{' '}
              <span
                className={cn(
                  'font-semibold',
                  tauxRecouvrement < 70 ? 'text-red-600' : 'text-green-600',
                )}
              >
                {tauxRecouvrement} %
              </span>
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Rechercher copropriétaire ou lot..."
              value={creanceSearch}
              onChange={(e) => setCreanceSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={creanceStatut} onValueChange={setCreanceStatut}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {(
                  [
                    'a_payer',
                    'en_retard',
                    'paye',
                    'partiellement_paye',
                    'annulee',
                  ] as const
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`gestionnaire.paiements.creances.statuts.${s}`, {
                      defaultValue: s,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={creanceFrom}
              onChange={(e) => setCreanceFrom(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={creanceTo}
              onChange={(e) => setCreanceTo(e.target.value)}
              className="w-40"
            />
          </div>

          <DataTable
            data={filteredCreances}
            columns={creancesColumns}
            rowKey="id"
            isLoading={loadingCreances}
            pageSize={10}
            emptyIcon={<CreditCard className="size-12 text-muted-foreground" />}
            emptyTitle="Aucune créance"
          />

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRelancerAllOpen(true)}
              disabled={nbImpayes === 0}
            >
              <Bell className="me-1.5 size-4" />
              {t('gestionnaire.paiements.creances.relancerTout', {
                defaultValue: 'Relancer tous les impayés',
              })}
              {nbImpayes > 0 && (
                <Badge className="ms-1.5 border-0 bg-red-100 text-red-800 text-xs px-1.5">
                  {nbImpayes}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab: Appels de fonds ── */}
      {activeTab === 'appels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreateAppelOpen(true)}>
              Créer appel de fonds
            </Button>
          </div>
          <DataTable
            data={appelsFonds}
            columns={appelsColumns}
            rowKey="id"
            isLoading={loadingAppels}
            searchable
            emptyIcon={<FileText className="size-12 text-muted-foreground" />}
            emptyTitle="Aucun appel de fonds"
          />
        </div>
      )}

      {/* ── Tab: Historique ── */}
      {activeTab === 'historique' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Rechercher..."
              value={histSearch}
              onChange={(e) => setHistSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={histMethode} onValueChange={setHistMethode}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Toutes méthodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes méthodes</SelectItem>
                {(
                  [
                    'especes',
                    'virement',
                    'cheque',
                    'cb',
                    'mobile_money',
                  ] as const
                ).map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`gestionnaire.paiements.encaisser.methodes.${m}`, {
                      defaultValue: m,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={histFrom}
              onChange={(e) => setHistFrom(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={histTo}
              onChange={(e) => setHistTo(e.target.value)}
              className="w-40"
            />
          </div>

          <DataTable
            data={filteredEnc}
            columns={historiqueColumns}
            rowKey="id"
            isLoading={loadingEnc}
            pageSize={10}
            emptyIcon={<CreditCard className="size-12 text-muted-foreground" />}
            emptyTitle="Aucun encaissement"
          />

          {filteredEnc.length > 0 && (
            <div className="flex justify-end text-sm font-medium">
              Total :{' '}
              <MontantDisplay value={totalEncFiltered} className="ml-2" />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Décomptes ── */}
      {activeTab === 'decomptes' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t('gestionnaire.paiements.decompte.recherche', {
                defaultValue: 'Rechercher un copropriétaire',
              })}
              value={decompteSearch}
              onChange={(e) => setDecompteSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => {
                const found = [1, 2, 5].find(() => true)
                if (decompteSearch) setSelectedCoproId(found ?? 1)
              }}
            >
              {t('gestionnaire.paiements.decompte.generer', {
                defaultValue: 'Générer',
              })}
            </Button>
          </div>

          {selectedCoproId === null && (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
              <FileText className="size-12" />
              <p>
                Saisissez un nom et cliquez sur Générer pour afficher le
                décompte individuel
              </p>
            </div>
          )}

          {selectedCoproId !== null && loadingDecompte && (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {decompte && !loadingDecompte && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Copropriétaire
                    </p>
                    <p className="font-semibold">
                      {decompte.coproprietaire_nom}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lot</p>
                    <p className="font-mono font-semibold">
                      {decompte.lot_numero}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tantième</p>
                    <p className="font-semibold">{decompte.tantieme} / 1000</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Exercice</p>
                    <p className="font-semibold">{decompte.exercice_annee}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('gestionnaire.paiements.decompte.totalAppele', {
                        defaultValue: 'Total appelé',
                      })}
                    </p>
                    <MontantDisplay
                      value={decompte.total_appele}
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('gestionnaire.paiements.decompte.totalPaye', {
                        defaultValue: 'Total payé',
                      })}
                    </p>
                    <MontantDisplay
                      value={decompte.total_paye}
                      className="text-lg font-semibold text-green-600"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('gestionnaire.paiements.decompte.solde', {
                        defaultValue: 'Solde',
                      })}
                    </p>
                    <MontantDisplay
                      value={decompte.solde}
                      colorize
                      className={cn(
                        'text-lg font-semibold',
                        decompte.solde < 0 ? 'text-red-600' : 'text-green-600',
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">
                        Appel de fonds
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Échéance
                      </th>
                      <th className="px-4 py-3 text-right font-medium">Dû</th>
                      <th className="px-4 py-3 text-right font-medium">Payé</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {decompte.detail.map((d, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-4 py-3">{d.appel_fonds_titre}</td>
                        <td className="px-4 py-3">
                          {d.date_echeance.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <MontantDisplay value={d.montant_du} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <MontantDisplay value={d.montant_paye} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              CREANCE_STATUT_CLS[d.statut] ??
                                'bg-gray-100 text-gray-700',
                              'border-0 text-xs',
                            )}
                          >
                            {d.statut}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Export en cours...')}
                >
                  <Download className="me-1.5 size-4" />
                  {t('gestionnaire.paiements.decompte.exporter', {
                    defaultValue: 'Exporter PDF',
                  })}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Virements ── */}
      {activeTab === 'virements' && (
        <DataTable
          data={virements}
          columns={virementsColumns}
          rowKey="id"
          isLoading={loadingVirements}
          searchable
          pageSize={10}
          emptyIcon={<FileText className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.paiements.virements.title', {
            defaultValue: 'Aucun virement déclaré',
          })}
        />
      )}

      {/* ── Modals ── */}
      <EncaisserModal
        open={encaisserOpen}
        onOpenChange={(o) => {
          setEncaisserOpen(o)
          if (!o) setEncaisserCreance(undefined)
        }}
        preselectedCreance={encaisserCreance}
      />

      <PaiementAvanceModal open={avanceOpen} onOpenChange={setAvanceOpen} />

      <RejeterVirementModal
        virement={rejeterVirementTarget}
        onClose={() => setRejeterVirementTarget(null)}
        onConfirm={(motif) =>
          rejeterVirementTarget &&
          rejeterVirementMutation.mutate({
            id: rejeterVirementTarget.id,
            motif,
          })
        }
        isLoading={rejeterVirementMutation.isPending}
      />

      <JustificatifModal
        virement={justificatifTarget}
        onClose={() => setJustificatifTarget(null)}
      />

      <ConfirmModal
        open={relancerAllOpen}
        onOpenChange={setRelancerAllOpen}
        title="Relancer tous les impayés"
        description={`Envoyer une relance WhatsApp à ${nbImpayes} copropriétaire(s) avec des créances impayées ?`}
        confirmLabel="Envoyer les relances"
        variant="default"
        onConfirm={() => relancerToutMutation.mutate()}
        isLoading={relancerToutMutation.isPending}
      />

      {/* Create appel de fonds dialog */}
      <Dialog open={createAppelOpen} onOpenChange={setCreateAppelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un appel de fonds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Titre</Label>
              <Input
                value={appelForm.titre}
                onChange={(e) =>
                  setAppelForm((f) => ({ ...f, titre: e.target.value }))
                }
                placeholder="Charges Q2 2026"
              />
            </div>
            <div className="space-y-1">
              <Label>Résidence</Label>
              <Select
                value={appelForm.residence_id}
                onValueChange={(v) =>
                  setAppelForm((f) => ({ ...f, residence_id: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une résidence" />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Montant total (DH)</Label>
                <Input
                  type="number"
                  value={appelForm.montant_total}
                  onChange={(e) =>
                    setAppelForm((f) => ({
                      ...f,
                      montant_total: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Date d'échéance</Label>
                <Input
                  type="date"
                  value={appelForm.date_echeance}
                  onChange={(e) =>
                    setAppelForm((f) => ({
                      ...f,
                      date_echeance: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {!!appelForm.residence_id &&
              montantTotal > 0 &&
              (lotsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Calcul de la répartition…
                </div>
              ) : lotsArr.length > 0 ? (
                <RepartitionPreview
                  lots={lotsArr}
                  totalTantieme={totalTantieme}
                  montantTotal={montantTotal}
                />
              ) : null)}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateAppelOpen(false)}
              disabled={createAppelMutation.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => createAppelMutation.mutate()}
              disabled={
                !appelForm.titre ||
                !appelForm.residence_id ||
                !appelForm.montant_total ||
                !appelForm.date_echeance ||
                createAppelMutation.isPending
              }
            >
              {createAppelMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!envoyerTarget}
        onOpenChange={(o) => !o && setEnvoyerTarget(null)}
        title="Envoyer l'appel de fonds"
        description="Cette action enverra une notification WhatsApp à tous les copropriétaires."
        confirmLabel="Envoyer"
        variant="default"
        onConfirm={() =>
          envoyerTarget && envoyerMutation.mutate(envoyerTarget.id)
        }
        isLoading={envoyerMutation.isPending}
      />
    </div>
  )
}
