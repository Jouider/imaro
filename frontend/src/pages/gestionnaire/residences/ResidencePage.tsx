import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  Zap,
  Building2,
  MapPin,
  CalendarClock,
  Layers,
} from 'lucide-react'
import { GenerateLotsModal } from '@/components/gestionnaire/GenerateLotsModal'
import { ResidenceFormDialog } from '@/components/gestionnaire/ResidenceFormDialog'
import {
  getResidence,
  updateResidence,
  deleteResidence,
  getLots,
  getCoproprietaires,
  getExercices,
  storeLot,
  updateLot,
  deleteLot,
  getImmeubles,
  storeImmeuble,
  updateImmeuble,
  deleteImmeuble,
  getGroupesHabitations,
  storeGroupeHabitation,
  updateGroupeHabitation,
  deleteGroupeHabitation,
  type CreateResidenceInput,
  type Lot,
  type Immeuble,
  type GroupeHabitation,
} from '@/services/gestionnaire.service'
import { ResidenceOverviewTab } from '@/components/gestionnaire/ResidenceOverviewTab'
import { ResidenceBankAccountsTab } from '@/components/gestionnaire/ResidenceBankAccountsTab'
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

type Tab =
  | 'overview'
  | 'lots'
  | 'coproprietaires'
  | 'exercices'
  | 'tranches'
  | 'immeubles'
  | 'encaissement'

const LOT_TYPES = [
  'appartement',
  'commerce',
  'parking',
  'cave',
  'bureau',
  'autre',
] as const

type LotForm = {
  numero: string
  type: string
  etage: string
  superficie: string
  tantieme: string
  titre_foncier: string
  immeuble_id: string
}

const EMPTY_FORM: LotForm = {
  numero: '',
  type: 'appartement',
  etage: '0',
  superficie: '',
  tantieme: '',
  titre_foncier: '',
  immeuble_id: '',
}

type ImmeubleForm = {
  nom: string
  groupe_habitation_id: string
}

const EMPTY_IMMEUBLE_FORM: ImmeubleForm = {
  nom: '',
  groupe_habitation_id: '',
}

type TrancheForm = {
  nom: string
  code: string
}

const EMPTY_TRANCHE_FORM: TrancheForm = {
  nom: '',
  code: '',
}

export function ResidencePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const residenceId = Number(id)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editResidenceOpen, setEditResidenceOpen] = useState(false)
  const [deleteResidenceOpen, setDeleteResidenceOpen] = useState(false)
  const [lotDialogOpen, setLotDialogOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<Lot | null>(null)
  const [deletingLot, setDeletingLot] = useState<Lot | null>(null)
  const [form, setForm] = useState<LotForm>(EMPTY_FORM)

  // Immeuble dialog state
  const [immeubleDialogOpen, setImmeubleDialogOpen] = useState(false)
  const [editingImmeuble, setEditingImmeuble] = useState<Immeuble | null>(null)
  const [deletingImmeuble, setDeletingImmeuble] = useState<Immeuble | null>(
    null,
  )
  const [immeubleForm, setImmeubleForm] =
    useState<ImmeubleForm>(EMPTY_IMMEUBLE_FORM)

  // Tranche (Groupe Habitation) dialog state
  const [trancheDialogOpen, setTrancheDialogOpen] = useState(false)
  const [editingTranche, setEditingTranche] = useState<GroupeHabitation | null>(
    null,
  )
  const [deletingTranche, setDeletingTranche] =
    useState<GroupeHabitation | null>(null)
  const [trancheForm, setTrancheForm] =
    useState<TrancheForm>(EMPTY_TRANCHE_FORM)

  // Generate lots modal state
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateImmeubleId, setGenerateImmeubleId] = useState<number | null>(
    null,
  )

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: residence, isLoading: loadingResidence } = useQuery({
    queryKey: ['residence', residenceId],
    queryFn: () => getResidence(residenceId),
    enabled: !!residenceId,
  })

  const { data: lotsData, isLoading: loadingLots } = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(residenceId),
    enabled: !!residenceId && activeTab === 'lots',
  })

  // ── Residence Mutations ────────────────────────────────────────────────────

  const updateResidenceMutation = useMutation({
    mutationFn: (data: CreateResidenceInput) =>
      updateResidence(residenceId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['residence', residenceId] })
      void qc.invalidateQueries({ queryKey: ['residences'] })
      setEditResidenceOpen(false)
      toast.success(t('gestionnaire.residences.toast.updated'))
    },
    onError: () => toast.error(t('gestionnaire.residences.toast.updateError')),
  })

  const deleteResidenceMutation = useMutation({
    mutationFn: () => deleteResidence(residenceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['residences'] })
      toast.success(t('gestionnaire.residences.toast.deleted'))
      navigate('/gestionnaire/residences')
    },
    onError: () => toast.error(t('gestionnaire.residences.toast.deleteError')),
  })

  const { data: coproprietaires = [], isLoading: loadingCopro } = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId),
    enabled: !!residenceId && activeTab === 'coproprietaires',
  })

  const { data: exercices = [], isLoading: loadingExercices } = useQuery({
    queryKey: ['exercices', residenceId],
    queryFn: () => getExercices(residenceId),
    enabled: !!residenceId && activeTab === 'exercices',
  })

  const immeublesQuery = useQuery({
    queryKey: ['gestionnaire', 'immeubles', residenceId],
    queryFn: () => getImmeubles(residenceId),
    enabled: !!residenceId,
  })
  const immeubles = immeublesQuery.data ?? []

  const tranchesQuery = useQuery({
    queryKey: ['gestionnaire', 'groupes-habitations', residenceId],
    queryFn: () => getGroupesHabitations(residenceId),
    enabled: !!residenceId,
  })
  const tranches = tranchesQuery.data ?? []
  const hasTranches = tranches.length > 0

  // ── Lot Mutations ─────────────────────────────────────────────────────────────

  const storeMutation = useMutation({
    mutationFn: (data: Parameters<typeof storeLot>[1]) =>
      storeLot(residenceId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
      setLotDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success(t('gestionnaire.residences.toastLotAdded'))
    },
    onError: () => toast.error(t('gestionnaire.residences.addLotError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      lotId,
      data,
    }: {
      lotId: number
      data: Parameters<typeof updateLot>[2]
    }) => updateLot(residenceId, lotId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
      setLotDialogOpen(false)
      setEditingLot(null)
      setForm(EMPTY_FORM)
      toast.success(t('gestionnaire.residences.toastLotUpdated'))
    },
    onError: () => toast.error(t('gestionnaire.residences.modifyError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (lotId: number) => deleteLot(residenceId, lotId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
      setDeletingLot(null)
      toast.success(t('gestionnaire.residences.toastLotDeleted'))
    },
    onError: () => toast.error(t('common.deleteError')),
  })

  // ── Immeuble Mutations ────────────────────────────────────────────────────────

  const storeImmeubleMutation = useMutation({
    mutationFn: (data: { nom: string; groupe_habitation_id?: number }) =>
      storeImmeuble(residenceId, data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['gestionnaire', 'immeubles', residenceId],
      })
      setImmeubleDialogOpen(false)
      setImmeubleForm(EMPTY_IMMEUBLE_FORM)
      toast.success(
        t('gestionnaire.residence.immeubles.added', {
          defaultValue: 'Immeuble ajouté',
        }),
      )
    },
    onError: () =>
      toast.error(
        t('gestionnaire.residence.immeubles.addError', {
          defaultValue: "Erreur lors de l'ajout de l'immeuble",
        }),
      ),
  })

  const updateImmeubleMutation = useMutation({
    mutationFn: ({
      immeubleId,
      data,
    }: {
      immeubleId: number
      data: { nom: string; groupe_habitation_id?: number }
    }) => updateImmeuble(residenceId, immeubleId, data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['gestionnaire', 'immeubles', residenceId],
      })
      setImmeubleDialogOpen(false)
      setEditingImmeuble(null)
      setImmeubleForm(EMPTY_IMMEUBLE_FORM)
      toast.success(
        t('gestionnaire.residence.immeubles.updated', {
          defaultValue: 'Immeuble modifié',
        }),
      )
    },
    onError: () =>
      toast.error(
        t('gestionnaire.residence.immeubles.updateError', {
          defaultValue: "Erreur lors de la modification de l'immeuble",
        }),
      ),
  })

  const deleteImmeubleMutation = useMutation({
    mutationFn: (immeubleId: number) => deleteImmeuble(residenceId, immeubleId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['gestionnaire', 'immeubles', residenceId],
      })
      setDeletingImmeuble(null)
      toast.success(
        t('gestionnaire.residence.immeubles.deleted', {
          defaultValue: 'Immeuble supprimé',
        }),
      )
    },
    onError: () =>
      toast.error(
        t('gestionnaire.residence.immeubles.deleteError', {
          defaultValue: "Erreur lors de la suppression de l'immeuble",
        }),
      ),
  })

  // ── Tranche (Groupe Habitation) Mutations ────────────────────────────────

  const invalidateTranches = () => {
    void qc.invalidateQueries({
      queryKey: ['gestionnaire', 'groupes-habitations', residenceId],
    })
    // Refresh AppelsFondsPage's GH dropdown if open
    void qc.invalidateQueries({ queryKey: ['gestionnaire', 'immeubles'] })
  }

  const storeTrancheMutation = useMutation({
    mutationFn: (data: { nom: string; code?: string }) =>
      storeGroupeHabitation(residenceId, data),
    onSuccess: () => {
      invalidateTranches()
      setTrancheDialogOpen(false)
      setTrancheForm(EMPTY_TRANCHE_FORM)
      toast.success(t('gestionnaire.residence.tranches.added'))
    },
    onError: () => toast.error(t('gestionnaire.residence.tranches.addError')),
  })

  const updateTrancheMutation = useMutation({
    mutationFn: ({
      ghId,
      data,
    }: {
      ghId: number
      data: { nom?: string; code?: string }
    }) => updateGroupeHabitation(residenceId, ghId, data),
    onSuccess: () => {
      invalidateTranches()
      setTrancheDialogOpen(false)
      setEditingTranche(null)
      setTrancheForm(EMPTY_TRANCHE_FORM)
      toast.success(t('gestionnaire.residence.tranches.updated'))
    },
    onError: () =>
      toast.error(t('gestionnaire.residence.tranches.updateError')),
  })

  const deleteTrancheMutation = useMutation({
    mutationFn: (ghId: number) => deleteGroupeHabitation(residenceId, ghId),
    onSuccess: () => {
      invalidateTranches()
      setDeletingTranche(null)
      toast.success(t('gestionnaire.residence.tranches.deleted'))
    },
    onError: () =>
      toast.error(t('gestionnaire.residence.tranches.deleteError')),
  })

  // ── Lot Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingLot(null)
    setForm(EMPTY_FORM)
    setLotDialogOpen(true)
  }

  function openEdit(lot: Lot) {
    setEditingLot(lot)
    setForm({
      numero: lot.numero,
      type: lot.type,
      etage: String(lot.etage),
      superficie: String(lot.superficie),
      tantieme: String(lot.tantieme),
      titre_foncier: lot.titre_foncier ?? '',
      immeuble_id: String(lot.immeuble_id ?? ''),
    })
    setLotDialogOpen(true)
  }

  function handleSubmitLot() {
    const basePayload = {
      numero: form.numero,
      type: form.type,
      etage: Number(form.etage),
      superficie: Number(form.superficie),
      tantieme: Number(form.tantieme),
      titre_foncier: form.titre_foncier.trim(),
    }
    if (editingLot) {
      const payload: Parameters<typeof updateLot>[2] = {
        ...basePayload,
        ...(form.immeuble_id ? { immeuble_id: Number(form.immeuble_id) } : {}),
      }
      updateMutation.mutate({ lotId: editingLot.id, data: payload })
    } else {
      const payload: Parameters<typeof storeLot>[1] = {
        ...basePayload,
        immeuble_id: Number(form.immeuble_id),
      }
      storeMutation.mutate(payload)
    }
  }

  // ── Immeuble Handlers ─────────────────────────────────────────────────────────

  function openCreateImmeuble() {
    setEditingImmeuble(null)
    setImmeubleForm(EMPTY_IMMEUBLE_FORM)
    setImmeubleDialogOpen(true)
  }

  function openCreateTranche() {
    setEditingTranche(null)
    setTrancheForm(EMPTY_TRANCHE_FORM)
    setTrancheDialogOpen(true)
  }

  function openEditImmeuble(imm: Immeuble) {
    setEditingImmeuble(imm)
    setImmeubleForm({
      nom: imm.nom,
      groupe_habitation_id: imm.groupe_habitation_id
        ? String(imm.groupe_habitation_id)
        : '',
    })
    setImmeubleDialogOpen(true)
  }

  function handleSubmitImmeuble() {
    const ghId = immeubleForm.groupe_habitation_id
      ? Number(immeubleForm.groupe_habitation_id)
      : undefined
    const data: { nom: string; groupe_habitation_id?: number } = {
      nom: immeubleForm.nom,
    }
    if (ghId !== undefined) data.groupe_habitation_id = ghId

    if (editingImmeuble) {
      updateImmeubleMutation.mutate({
        immeubleId: editingImmeuble.id,
        data,
      })
    } else {
      storeImmeubleMutation.mutate(data)
    }
  }

  function openEditTranche(gh: GroupeHabitation) {
    setEditingTranche(gh)
    setTrancheForm({ nom: gh.nom, code: gh.code ?? '' })
    setTrancheDialogOpen(true)
  }

  function handleSubmitTranche() {
    const data: { nom: string; code?: string } = { nom: trancheForm.nom }
    if (trancheForm.code.trim()) data.code = trancheForm.code.trim()
    if (editingTranche) {
      updateTrancheMutation.mutate({ ghId: editingTranche.id, data })
    } else {
      storeTrancheMutation.mutate(data)
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────────

  const lotsColumns: Column<Lot>[] = [
    {
      key: 'numero',
      header: t('gestionnaire.residence.colNumero'),
      sortable: true,
    },
    {
      key: 'immeuble',
      header: t('gestionnaire.residence.lots.immeuble', {
        defaultValue: 'Immeuble',
      }),
      renderCell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.immeuble?.nom ?? '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: t('gestionnaire.residence.colType'),
      renderCell: (r) => (
        <span className="capitalize">
          {t(`gestionnaire.residence.lotTypes.${r.type}`, {
            defaultValue: r.type,
          })}
        </span>
      ),
    },
    {
      key: 'etage',
      header: t('gestionnaire.residence.colEtage'),
      sortable: true,
    },
    {
      key: 'superficie',
      header: t('gestionnaire.residence.colSuperficie'),
      renderCell: (r) => (
        <span className="tabular-nums">{r.superficie} m²</span>
      ),
    },
    {
      key: 'tantieme',
      header: t('gestionnaire.residence.colTantieme'),
      sortable: true,
      renderCell: (r) => <span className="tabular-nums">{r.tantieme}</span>,
    },
    {
      key: 'titre_foncier',
      header: t('gestionnaire.residence.colTitreFoncier'),
      renderCell: (r) =>
        r.titre_foncier ? (
          <span>{r.titre_foncier}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'coproprietaire',
      header: t('gestionnaire.residence.colProprietaire'),
      renderCell: (r) =>
        r.coproprietaire ? (
          <span>{r.coproprietaire.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-20 text-right',
      renderCell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(r)}
            aria-label={t('actions.edit')}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingLot(r)}
            className="text-destructive hover:text-destructive"
            aria-label={t('actions.delete')}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  type CoproRow = {
    id: number
    name: string
    phone: string
    lot_numero: string
    solde: number
  }
  const coproRows: CoproRow[] = coproprietaires.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    lot_numero: c.lot?.numero ?? '',
    solde: c.solde,
  }))

  const coproColumns: Column<CoproRow>[] = [
    { key: 'name', header: t('gestionnaire.residence.colNom'), sortable: true },
    { key: 'phone', header: t('gestionnaire.residence.colTelephone') },
    { key: 'lot_numero', header: 'Lot', sortable: true },
    {
      key: 'solde',
      header: t('gestionnaire.residence.colSolde'),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.solde} colorize />,
    },
  ]

  type ExerciceRow = {
    id: number
    annee: number
    date_debut: string
    date_fin: string
    statut: string
  }
  const exerciceColumns: Column<ExerciceRow>[] = [
    {
      key: 'annee',
      header: t('gestionnaire.residence.colAnnee'),
      sortable: true,
    },
    {
      key: 'date_debut',
      header: 'Début',
      renderCell: (r) => r.date_debut.slice(0, 10),
    },
    {
      key: 'date_fin',
      header: 'Fin',
      renderCell: (r) => r.date_fin.slice(0, 10),
    },
    {
      key: 'statut',
      header: t('gestionnaire.residence.colStatut'),
      renderCell: (r) => (
        <Badge
          variant={r.statut === 'actif' ? 'default' : 'secondary'}
          className={
            r.statut === 'actif'
              ? 'bg-green-100 text-green-800 hover:bg-green-100'
              : ''
          }
        >
          {t(`gestionnaire.residence.exerciceStatut.${r.statut}`, {
            defaultValue: r.statut,
          })}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-10 text-right',
      renderCell: (r) =>
        r.statut === 'cloture' ? (
          <Lock className="size-4 text-muted-foreground" />
        ) : null,
    },
  ]

  type ImmeubleRow = {
    id: number
    nom: string
    nb_lots: number
    tranche_nom: string
  }
  const immeubleRows: ImmeubleRow[] = immeubles.map((imm) => ({
    id: imm.id,
    nom: imm.nom,
    nb_lots: imm.nb_lots ?? 0,
    tranche_nom: imm.groupe_habitation_id
      ? (tranches.find((g) => g.id === imm.groupe_habitation_id)?.nom ?? '—')
      : '—',
  }))

  const immeubleColumns: Column<ImmeubleRow>[] = [
    {
      key: 'nom',
      header: t('gestionnaire.residence.immeubles.colNom', {
        defaultValue: 'Nom',
      }),
      sortable: true,
    },
    ...(hasTranches
      ? [
          {
            key: 'tranche_nom' as const,
            header: t('gestionnaire.residence.tranches.colTranche'),
            sortable: true,
            renderCell: (r: ImmeubleRow) => (
              <span className="text-sm text-muted-foreground">
                {r.tranche_nom}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'nb_lots',
      header: t('gestionnaire.residence.immeubles.colNbLots', {
        defaultValue: 'Nb lots',
      }),
      sortable: true,
      renderCell: (r) => <span className="tabular-nums">{r.nb_lots}</span>,
    },
    {
      key: 'id',
      header: '',
      className: 'w-20 text-right',
      renderCell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const imm = immeubles.find((i) => i.id === r.id)
              if (imm) openEditImmeuble(imm)
            }}
            aria-label={t('actions.edit')}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const imm = immeubles.find((i) => i.id === r.id)
              if (imm) setDeletingImmeuble(imm)
            }}
            className="text-destructive hover:text-destructive"
            aria-label={t('actions.delete')}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const trancheColumns: Column<GroupeHabitation>[] = [
    {
      key: 'nom',
      header: t('gestionnaire.residence.tranches.colNom'),
      sortable: true,
    },
    {
      key: 'code',
      header: t('gestionnaire.residence.tranches.colCode'),
      sortable: true,
      renderCell: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.code ?? '—'}
        </span>
      ),
    },
    {
      key: 'nb_immeubles',
      header: t('gestionnaire.residence.tranches.colNbImmeubles'),
      sortable: true,
      renderCell: (r) => (
        <span className="tabular-nums">{r.nb_immeubles ?? 0}</span>
      ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-20 text-right',
      renderCell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditTranche(r)}
            aria-label={t('actions.edit')}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingTranche(r)}
            className="text-destructive hover:text-destructive"
            aria-label={t('actions.delete')}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('gestionnaire.residence.tabOverview') },
    { key: 'lots', label: t('gestionnaire.residence.tabLots') },
    {
      key: 'coproprietaires',
      label: t('gestionnaire.residence.tabCoproprietaires'),
    },
    { key: 'exercices', label: t('gestionnaire.residence.tabExercices') },
    {
      key: 'tranches',
      label: t('gestionnaire.residence.tabTranches'),
    },
    {
      key: 'immeubles',
      label: t('gestionnaire.residence.tabImmeubles', {
        defaultValue: 'Immeubles',
      }),
    },
    {
      key: 'encaissement',
      label: t('gestionnaire.residence.tabEncaissement'),
    },
  ]

  const isMutating = storeMutation.isPending || updateMutation.isPending
  const isImmeublesMutating =
    storeImmeubleMutation.isPending || updateImmeubleMutation.isPending

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t('gestionnaire.residence.backToList'),
            href: '/gestionnaire/residences',
          },
          { label: residence?.name ?? '…' },
        ]}
        title={loadingResidence ? '…' : (residence?.name ?? '')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'lots' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGenerateImmeubleId(immeubles[0]?.id ?? null)
                    setGenerateOpen(true)
                  }}
                >
                  <Zap className="me-1.5 size-4" />
                  {t('gestionnaire.residence.generateLots')}
                </Button>
                <Button onClick={openCreate} size="sm">
                  <Plus className="me-1.5 size-4" />
                  {t('gestionnaire.residence.addLot')}
                </Button>
              </>
            )}
            {activeTab === 'immeubles' && (
              <Button onClick={openCreateImmeuble} size="sm">
                <Plus className="me-1.5 size-4" />
                {t('gestionnaire.residence.immeubles.add', {
                  defaultValue: 'Ajouter un immeuble',
                })}
              </Button>
            )}
            {activeTab === 'tranches' && (
              <Button onClick={openCreateTranche} size="sm">
                <Plus className="me-1.5 size-4" />
                {t('gestionnaire.residence.tranches.add')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditResidenceOpen(true)}
            >
              <Pencil className="me-1.5 size-4" />
              {t('actions.edit')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteResidenceOpen(true)}
            >
              <Trash2 className="me-1.5 size-4" />
              {t('actions.delete')}
            </Button>
          </div>
        }
      />

      {/* Meta chips */}
      {residence && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
            <MapPin className="size-3.5" />
            {residence.city}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
            <Building2 className="size-3.5" />
            {t('gestionnaire.residence.lotsCount', {
              count: residence.nb_lots,
            })}
          </span>
          {residence.jour_echeance != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t('gestionnaire.residence.echeanceChip', {
                day: residence.jour_echeance,
              })}
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ring-inset',
              residence.status === 'actif'
                ? 'bg-green-100 text-green-800 ring-green-600/20'
                : 'bg-muted text-muted-foreground ring-border',
            )}
          >
            {residence.status === 'actif'
              ? t('gestionnaire.residences.statusActif')
              : t('gestionnaire.residences.statusInactif')}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-[var(--color-imaro-primary)] text-[var(--color-imaro-primary)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && residence && (
        <ResidenceOverviewTab
          residenceId={residenceId}
          residence={residence}
          immeublesCount={immeubles.length}
          onGoToImmeubles={() => setActiveTab('immeubles')}
          onGoToLots={() => setActiveTab('lots')}
          onGoToCoproprietaires={() => setActiveTab('coproprietaires')}
        />
      )}

      {activeTab === 'lots' && (
        <>
          {lotsData && (
            <p className="mb-3 text-sm text-muted-foreground">
              {t('gestionnaire.residence.totalTantieme', {
                val: lotsData.total_tantieme,
              })}
            </p>
          )}
          {!loadingLots && (lotsData?.lots ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Building2 className="size-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">
                  {t('gestionnaire.residences.noLotInImmeuble')}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {t('gestionnaire.residences.addLotsHint')}
                </p>
              </div>
              <Button
                onClick={() => {
                  setGenerateImmeubleId(immeubles[0]?.id ?? null)
                  setGenerateOpen(true)
                }}
              >
                <Zap className="size-4 mr-2" />
                {t('gestionnaire.residences.generateLots')}
              </Button>
            </div>
          ) : (
            <DataTable
              data={lotsData?.lots ?? []}
              columns={lotsColumns}
              rowKey="id"
              isLoading={loadingLots}
              searchable
            />
          )}
        </>
      )}

      {activeTab === 'coproprietaires' && (
        <DataTable
          data={coproRows}
          columns={coproColumns}
          rowKey="id"
          isLoading={loadingCopro}
          searchable
          exportable
          exportFilename="coproprietaires"
        />
      )}

      {activeTab === 'exercices' && (
        <DataTable
          data={exercices}
          columns={exerciceColumns}
          rowKey="id"
          isLoading={loadingExercices}
        />
      )}

      {activeTab === 'immeubles' && (
        <DataTable
          data={immeubleRows}
          columns={immeubleColumns}
          rowKey="id"
          isLoading={immeublesQuery.isLoading}
          searchable
        />
      )}

      {activeTab === 'tranches' && (
        <>
          {!tranchesQuery.isLoading && tranches.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
              <div className="bg-gradient-imaro flex size-12 items-center justify-center rounded-xl text-white shadow-sm">
                <Layers className="size-6" />
              </div>
              <div className="max-w-md">
                <p className="font-display text-lg text-foreground">
                  {t('gestionnaire.residence.tranches.emptyTitle')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('gestionnaire.residence.tranches.emptyDesc')}
                </p>
              </div>
              <Button onClick={openCreateTranche}>
                <Plus className="me-1.5 size-4" />
                {t('gestionnaire.residence.tranches.add')}
              </Button>
            </div>
          ) : (
            <DataTable
              data={tranches}
              columns={trancheColumns}
              rowKey="id"
              isLoading={tranchesQuery.isLoading}
              searchable
            />
          )}
        </>
      )}

      {activeTab === 'encaissement' && (
        <ResidenceBankAccountsTab residenceId={residenceId} />
      )}

      {/* Lot form dialog */}
      <Dialog open={lotDialogOpen} onOpenChange={setLotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLot
                ? t('gestionnaire.residence.editLot')
                : t('gestionnaire.residence.addLot')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Immeuble selector */}
            <div className="flex flex-col gap-1">
              <Label>
                {t('gestionnaire.residence.lots.immeuble', {
                  defaultValue: 'Immeuble',
                })}
              </Label>
              <Select
                value={form.immeuble_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, immeuble_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      'gestionnaire.residence.lots.selectImmeuble',
                      { defaultValue: 'Sélectionner un immeuble' },
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {immeubles.map((imm) => (
                    <SelectItem key={imm.id} value={String(imm.id)}>
                      {imm.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colNumero')}</Label>
                <Input
                  value={form.numero}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numero: e.target.value }))
                  }
                  placeholder="A-01"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colType')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOT_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`gestionnaire.residence.lotTypes.${tp}`, {
                          defaultValue: tp,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colEtage')}</Label>
                <Input
                  type="number"
                  value={form.etage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, etage: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colSuperficie')} (m²)</Label>
                <Input
                  type="number"
                  value={form.superficie}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, superficie: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colTantieme')}</Label>
                <Input
                  type="number"
                  value={form.tantieme}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tantieme: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>
                {t('gestionnaire.residence.colTitreFoncier')}{' '}
                <span className="text-[var(--color-imaro-danger)]">*</span>
              </Label>
              <Input
                value={form.titre_foncier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titre_foncier: e.target.value }))
                }
                placeholder={t('gestionnaire.residence.titreFoncierPh')}
                aria-invalid={form.titre_foncier.trim() === ''}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLotDialogOpen(false)}
              disabled={isMutating}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleSubmitLot}
              disabled={isMutating || !form.titre_foncier.trim()}
            >
              {isMutating ? t('actions.loading') : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete lot confirmation */}
      <ConfirmModal
        open={!!deletingLot}
        onOpenChange={(open) => !open && setDeletingLot(null)}
        title={t('gestionnaire.residence.deleteLot')}
        description={t('gestionnaire.residence.deleteLotDesc', {
          numero: deletingLot?.numero ?? '',
        })}
        onConfirm={() => deletingLot && deleteMutation.mutate(deletingLot.id)}
        isLoading={deleteMutation.isPending}
      />

      {/* Immeuble form dialog */}
      <Dialog open={immeubleDialogOpen} onOpenChange={setImmeubleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingImmeuble
                ? t('gestionnaire.residence.immeubles.edit', {
                    defaultValue: "Modifier l'immeuble",
                  })
                : t('gestionnaire.residence.immeubles.add', {
                    defaultValue: 'Ajouter un immeuble',
                  })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>
                {t('gestionnaire.residence.immeubles.colNom', {
                  defaultValue: 'Nom',
                })}
              </Label>
              <Input
                value={immeubleForm.nom}
                onChange={(e) =>
                  setImmeubleForm((f) => ({ ...f, nom: e.target.value }))
                }
                placeholder={t(
                  'gestionnaire.residence.immeubles.nomPlaceholder',
                  { defaultValue: 'ex: Bâtiment A' },
                )}
              />
            </div>

            {/* Optional GH dropdown — only shown when residence has ≥1 tranche */}
            {hasTranches && (
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.tranches.colTranche')}</Label>
                <Select
                  value={immeubleForm.groupe_habitation_id || 'none'}
                  onValueChange={(v) =>
                    setImmeubleForm((f) => ({
                      ...f,
                      groupe_habitation_id: v === 'none' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('gestionnaire.residence.tranches.noneOption')}
                    </SelectItem>
                    {tranches.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.nom}
                        {g.code ? ` (${g.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImmeubleDialogOpen(false)}
              disabled={isImmeublesMutating}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleSubmitImmeuble}
              disabled={isImmeublesMutating || !immeubleForm.nom.trim()}
            >
              {isImmeublesMutating ? t('actions.loading') : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete immeuble confirmation */}
      <ConfirmModal
        open={!!deletingImmeuble}
        onOpenChange={(open) => !open && setDeletingImmeuble(null)}
        title={t('gestionnaire.residence.immeubles.delete', {
          defaultValue: "Supprimer l'immeuble",
        })}
        description={t('gestionnaire.residence.immeubles.deleteDesc', {
          nom: deletingImmeuble?.nom ?? '',
          defaultValue: `Supprimer l'immeuble "${deletingImmeuble?.nom ?? ''}" ?`,
        })}
        onConfirm={() =>
          deletingImmeuble && deleteImmeubleMutation.mutate(deletingImmeuble.id)
        }
        isLoading={deleteImmeubleMutation.isPending}
      />

      {/* Tranche form dialog */}
      <Dialog open={trancheDialogOpen} onOpenChange={setTrancheDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingTranche
                ? t('gestionnaire.residence.tranches.edit')
                : t('gestionnaire.residence.tranches.add')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.residence.tranches.colNom')}</Label>
              <Input
                value={trancheForm.nom}
                onChange={(e) =>
                  setTrancheForm((f) => ({ ...f, nom: e.target.value }))
                }
                placeholder={t(
                  'gestionnaire.residence.tranches.nomPlaceholder',
                )}
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t('gestionnaire.residence.tranches.colCode')}
                <span className="ms-1 text-xs font-normal text-muted-foreground">
                  ({t('gestionnaire.residence.tranches.codeOptional')})
                </span>
              </Label>
              <Input
                value={trancheForm.code}
                onChange={(e) =>
                  setTrancheForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder={t(
                  'gestionnaire.residence.tranches.codePlaceholder',
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTrancheDialogOpen(false)}
              disabled={
                storeTrancheMutation.isPending ||
                updateTrancheMutation.isPending
              }
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleSubmitTranche}
              disabled={
                storeTrancheMutation.isPending ||
                updateTrancheMutation.isPending ||
                !trancheForm.nom.trim()
              }
            >
              {storeTrancheMutation.isPending || updateTrancheMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete tranche confirmation */}
      <ConfirmModal
        open={!!deletingTranche}
        onOpenChange={(open) => !open && setDeletingTranche(null)}
        title={t('gestionnaire.residence.tranches.delete')}
        description={t('gestionnaire.residence.tranches.deleteDesc', {
          nom: deletingTranche?.nom ?? '',
        })}
        variant="destructive"
        onConfirm={() =>
          deletingTranche && deleteTrancheMutation.mutate(deletingTranche.id)
        }
        isLoading={deleteTrancheMutation.isPending}
      />

      {/* Residence edit dialog */}
      <ResidenceFormDialog
        open={editResidenceOpen}
        onOpenChange={setEditResidenceOpen}
        residence={residence}
        onSubmit={(data) => updateResidenceMutation.mutate(data)}
        isLoading={updateResidenceMutation.isPending}
      />

      {/* Delete residence confirmation */}
      <ConfirmModal
        open={deleteResidenceOpen}
        onOpenChange={setDeleteResidenceOpen}
        title={t('gestionnaire.residences.deleteTitle')}
        description={t('gestionnaire.residences.deleteDesc', {
          name: residence?.name ?? '',
        })}
        variant="destructive"
        onConfirm={() => deleteResidenceMutation.mutate()}
        isLoading={deleteResidenceMutation.isPending}
      />

      {/* Generate lots modal */}
      {generateOpen && generateImmeubleId !== null && (
        <GenerateLotsModal
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          residenceId={residenceId}
          immeubleId={generateImmeubleId}
          immeubleName={
            immeubles.find((i) => i.id === generateImmeubleId)?.nom ?? ''
          }
          onSuccess={(count) => {
            void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
            toast.success(`${count} lots créés avec succès`)
          }}
        />
      )}
    </div>
  )
}
