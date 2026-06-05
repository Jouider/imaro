import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Hammer, Star } from 'lucide-react'
import {
  getPrestataires,
  storePrestataire,
  getContrats,
  storeContrat,
  type Prestataire,
  type Contrat,
} from '@/services/prestataires.service'
import { getResidences } from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
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

type Tab = 'prestataires' | 'contrats'

const STATUT_PRESTATAIRE: Record<string, string> = {
  actif: 'bg-green-100 text-green-800',
  blackliste: 'bg-red-100 text-red-700',
}

const STATUT_CONTRAT: Record<string, string> = {
  actif: 'bg-green-100 text-green-800',
  expire: 'bg-gray-100 text-gray-600',
  resilie: 'bg-red-100 text-red-700',
}

type PrestataireForm = {
  name: string
  specialite: string
  phone: string
  email: string
  adresse: string
}

const EMPTY_PRESTA_FORM: PrestataireForm = {
  name: '',
  specialite: 'ascenseurs',
  phone: '',
  email: '',
  adresse: '',
}

type ContratForm = {
  titre: string
  prestataire_id: string
  residence_id: string
  type_contrat: string
  montant_annuel: string
  date_debut: string
  date_fin: string
  renouvellement_auto: boolean
}

const EMPTY_CONTRAT_FORM: ContratForm = {
  titre: '',
  prestataire_id: '',
  residence_id: '',
  type_contrat: 'maintenance',
  montant_annuel: '',
  date_debut: '',
  date_fin: '',
  renouvellement_auto: false,
}

export function PrestatairesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('prestataires')
  const [createPrestaOpen, setCreatePrestaOpen] = useState(false)
  const [createContratOpen, setCreateContratOpen] = useState(false)
  const [prestaForm, setPrestaForm] =
    useState<PrestataireForm>(EMPTY_PRESTA_FORM)
  const [contratForm, setContratForm] =
    useState<ContratForm>(EMPTY_CONTRAT_FORM)

  const { data: prestataires = [], isLoading: loadingPresta } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => getPrestataires(),
  })

  const { data: contrats = [], isLoading: loadingContrats } = useQuery({
    queryKey: ['contrats'],
    queryFn: () => getContrats(),
  })

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const createPrestaMutation = useMutation({
    mutationFn: () =>
      storePrestataire({
        name: prestaForm.name,
        specialite: prestaForm.specialite,
        phone: prestaForm.phone,
        email: prestaForm.email,
        adresse: prestaForm.adresse,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prestataires'] })
      setCreatePrestaOpen(false)
      setPrestaForm(EMPTY_PRESTA_FORM)
      toast.success(t('gestionnaire.prestataires.toastCreated'))
    },
    onError: () => toast.error(t('common.createError')),
  })

  const createContratMutation = useMutation({
    mutationFn: () =>
      storeContrat({
        titre: contratForm.titre,
        prestataire_id: Number(contratForm.prestataire_id),
        residence_id: Number(contratForm.residence_id),
        type_contrat: contratForm.type_contrat,
        montant_annuel: Number(contratForm.montant_annuel),
        date_debut: contratForm.date_debut,
        date_fin: contratForm.date_fin,
        renouvellement_auto: contratForm.renouvellement_auto,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contrats'] })
      setCreateContratOpen(false)
      setContratForm(EMPTY_CONTRAT_FORM)
      toast.success(t('gestionnaire.prestataires.toastContratCreated'))
    },
    onError: () => toast.error(t('common.createError')),
  })

  const isPrestaFormValid = prestaForm.name.trim() && prestaForm.phone.trim()
  const isContratFormValid =
    contratForm.titre.trim() &&
    contratForm.prestataire_id &&
    contratForm.residence_id &&
    contratForm.montant_annuel &&
    contratForm.date_debut &&
    contratForm.date_fin

  const SPECIALITES = [
    'ascenseurs',
    'electricite',
    'proprete',
    'plomberie',
    'securite',
    'autre',
  ]
  const TYPE_CONTRATS = ['maintenance', 'nettoyage', 'gardiennage', 'autre']

  const prestaColumns: Column<Prestataire>[] = [
    {
      key: 'name',
      header: t('gestionnaire.prestataires.colNom'),
      sortable: true,
    },
    {
      key: 'specialite',
      header: t('gestionnaire.prestataires.colSpecialite'),
      renderCell: (r) => (
        <span className="capitalize">
          {t(`gestionnaire.prestataires.specialite.${r.specialite}`, {
            defaultValue: r.specialite,
          })}
        </span>
      ),
    },
    {
      key: 'phone',
      header: t('gestionnaire.prestataires.colTelephone'),
      renderCell: (r) => (
        <span className="tabular-nums text-sm">{r.phone}</span>
      ),
    },
    {
      key: 'note_satisfaction',
      header: t('gestionnaire.prestataires.colNote'),
      renderCell: (r) => <StarRating value={r.note_satisfaction} />,
    },
    {
      key: 'nb_interventions',
      header: t('gestionnaire.prestataires.colInterventions'),
      renderCell: (r) => (
        <span className="tabular-nums">{r.nb_interventions}</span>
      ),
    },
    {
      key: 'statut',
      header: t('gestionnaire.prestataires.colStatut'),
      renderCell: (r) => {
        const cls = STATUT_PRESTATAIRE[r.statut] ?? 'bg-gray-100 text-gray-600'
        return (
          <Badge className={cn(cls, 'hover:opacity-80 border-0')}>
            {t(`gestionnaire.prestataires.statut.${r.statut}`, {
              defaultValue: r.statut,
            })}
          </Badge>
        )
      },
    },
  ]

  const contratColumns: Column<Contrat>[] = [
    {
      key: 'titre',
      header: t('gestionnaire.prestataires.colTitre'),
      sortable: true,
    },
    {
      key: 'prestataire',
      header: t('gestionnaire.prestataires.colPrestataire'),
      renderCell: (r) => (
        <div>
          <p className="text-sm font-medium">{r.prestataire.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {t(
              `gestionnaire.prestataires.specialite.${r.prestataire.specialite}`,
              {
                defaultValue: r.prestataire.specialite,
              },
            )}
          </p>
        </div>
      ),
    },
    {
      key: 'residence',
      header: t('gestionnaire.prestataires.colResidence'),
      renderCell: (r) => r.residence.name,
    },
    {
      key: 'montant_annuel',
      header: t('gestionnaire.prestataires.colMontant'),
      renderCell: (r) => (
        <span className="tabular-nums text-sm font-medium">
          {r.montant_annuel.toLocaleString('fr-MA')} DH
        </span>
      ),
    },
    {
      key: 'date_fin',
      header: t('gestionnaire.prestataires.colFin'),
      renderCell: (r) => <ExpiryCell contrat={r} t={t} />,
    },
    {
      key: 'renouvellement_auto',
      header: t('gestionnaire.prestataires.colRenouvellement'),
      renderCell: (r) => (
        <span
          className={cn(
            'text-sm',
            r.renouvellement_auto ? 'text-green-700' : 'text-muted-foreground',
          )}
        >
          {r.renouvellement_auto ? 'Oui' : 'Non'}
        </span>
      ),
    },
    {
      key: 'statut',
      header: t('gestionnaire.prestataires.colStatut'),
      renderCell: (r) => {
        const cls = STATUT_CONTRAT[r.statut] ?? 'bg-gray-100 text-gray-600'
        return (
          <Badge className={cn(cls, 'hover:opacity-80 border-0')}>
            {t(`gestionnaire.prestataires.statut.${r.statut}`, {
              defaultValue: r.statut,
            })}
          </Badge>
        )
      },
    },
  ]

  const TABS: { key: Tab; labelKey: string }[] = [
    {
      key: 'prestataires',
      labelKey: 'gestionnaire.prestataires.tabPrestataires',
    },
    { key: 'contrats', labelKey: 'gestionnaire.prestataires.tabContrats' },
  ]

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.prestataires.title')}
        subtitle={t('gestionnaire.prestataires.subtitle')}
        actions={
          activeTab === 'prestataires' ? (
            <Button onClick={() => setCreatePrestaOpen(true)} size="sm">
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.prestataires.newPrestataire')}
            </Button>
          ) : (
            <Button onClick={() => setCreateContratOpen(true)} size="sm">
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.prestataires.newContrat')}
            </Button>
          )
        }
      />

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
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'prestataires' ? (
        <DataTable
          data={prestataires}
          columns={prestaColumns}
          rowKey="id"
          isLoading={loadingPresta}
          searchable
          emptyIcon={<Hammer className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.prestataires.emptyPrestataires')}
          emptyDescription={t(
            'gestionnaire.prestataires.emptyPrestatairesDesc',
          )}
        />
      ) : (
        <DataTable
          data={contrats}
          columns={contratColumns}
          rowKey="id"
          isLoading={loadingContrats}
          searchable
          emptyIcon={<Hammer className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.prestataires.emptyContrats')}
          emptyDescription={t('gestionnaire.prestataires.emptyContratsDesc')}
        />
      )}

      {/* Create Prestataire dialog */}
      <Dialog open={createPrestaOpen} onOpenChange={setCreatePrestaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('gestionnaire.prestataires.newPrestataire')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>{t('gestionnaire.prestataires.form.nom')}</Label>
                <Input
                  value={prestaForm.name}
                  onChange={(e) =>
                    setPrestaForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ascenseurs Maroc SARL"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.specialite')}</Label>
                <Select
                  value={prestaForm.specialite}
                  onValueChange={(v) =>
                    setPrestaForm((f) => ({ ...f, specialite: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALITES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`gestionnaire.prestataires.specialite.${s}`, {
                          defaultValue: s,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.telephone')}</Label>
                <Input
                  value={prestaForm.phone}
                  onChange={(e) =>
                    setPrestaForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+212522000000"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.email')}</Label>
                <Input
                  type="email"
                  value={prestaForm.email}
                  onChange={(e) =>
                    setPrestaForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="contact@prestataire.ma"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.adresse')}</Label>
                <Input
                  value={prestaForm.adresse}
                  onChange={(e) =>
                    setPrestaForm((f) => ({ ...f, adresse: e.target.value }))
                  }
                  placeholder="15 Bd Anfa, Casablanca"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatePrestaOpen(false)}
              disabled={createPrestaMutation.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => createPrestaMutation.mutate()}
              disabled={!isPrestaFormValid || createPrestaMutation.isPending}
            >
              {createPrestaMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Contrat dialog */}
      <Dialog open={createContratOpen} onOpenChange={setCreateContratOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('gestionnaire.prestataires.newContrat')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.prestataires.form.titre')}</Label>
              <Input
                value={contratForm.titre}
                onChange={(e) =>
                  setContratForm((f) => ({ ...f, titre: e.target.value }))
                }
                placeholder="Contrat maintenance ascenseurs 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.prestataire')}</Label>
                <Select
                  value={contratForm.prestataire_id}
                  onValueChange={(v) =>
                    setContratForm((f) => ({ ...f, prestataire_id: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {prestataires.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.residence')}</Label>
                <Select
                  value={contratForm.residence_id}
                  onValueChange={(v) =>
                    setContratForm((f) => ({ ...f, residence_id: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir" />
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
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.typeContrat')}</Label>
                <Select
                  value={contratForm.type_contrat}
                  onValueChange={(v) =>
                    setContratForm((f) => ({ ...f, type_contrat: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_CONTRATS.map((tc) => (
                      <SelectItem key={tc} value={tc}>
                        {t(`gestionnaire.prestataires.typeContrat.${tc}`, {
                          defaultValue: tc,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.montant')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={contratForm.montant_annuel}
                  onChange={(e) =>
                    setContratForm((f) => ({
                      ...f,
                      montant_annuel: e.target.value,
                    }))
                  }
                  placeholder="18000"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.dateDebut')}</Label>
                <Input
                  type="date"
                  value={contratForm.date_debut}
                  onChange={(e) =>
                    setContratForm((f) => ({
                      ...f,
                      date_debut: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.prestataires.form.dateFin')}</Label>
                <Input
                  type="date"
                  value={contratForm.date_fin}
                  onChange={(e) =>
                    setContratForm((f) => ({ ...f, date_fin: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="renouvellement_auto"
                type="checkbox"
                checked={contratForm.renouvellement_auto}
                onChange={(e) =>
                  setContratForm((f) => ({
                    ...f,
                    renouvellement_auto: e.target.checked,
                  }))
                }
                className="size-4 accent-[var(--color-imaro-primary)]"
              />
              <Label htmlFor="renouvellement_auto" className="cursor-pointer">
                {t('gestionnaire.prestataires.form.renouvellementAuto')}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateContratOpen(false)}
              disabled={createContratMutation.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => createContratMutation.mutate()}
              disabled={!isContratFormValid || createContratMutation.isPending}
            >
              {createContratMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i <= value
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  )
}

// ─── ExpiryCell ───────────────────────────────────────────────────────────────

function ExpiryCell({
  contrat,
  t,
}: {
  contrat: Contrat
  t: (key: string, options?: Record<string, unknown>) => string
}) {
  const dateStr = new Date(contrat.date_fin).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (contrat.statut !== 'actif') {
    return (
      <span className="text-sm tabular-nums text-muted-foreground">
        {dateStr}
      </span>
    )
  }

  const days = contrat.jours_avant_expiration
  const urgentCls =
    days <= 0
      ? 'text-red-600'
      : days <= 30
        ? 'text-red-600'
        : days <= 60
          ? 'text-orange-600'
          : 'text-muted-foreground'
  const label =
    days <= 0
      ? t('gestionnaire.prestataires.expired')
      : t('gestionnaire.prestataires.expiresIn', { n: days })

  return (
    <div>
      <p className="text-sm tabular-nums">{dateStr}</p>
      <p className={cn('text-xs', urgentCls)}>{label}</p>
    </div>
  )
}
