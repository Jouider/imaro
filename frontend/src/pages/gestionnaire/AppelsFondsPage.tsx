import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Send, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import {
  getAppelsFonds,
  getResidences,
  getLots,
  storeAppelFonds,
  envoyerAppelFonds,
  getGroupesHabitations,
  type AppelFonds,
  type Lot,
  type GroupeHabitation,
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

const STATUT_STYLES: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  publie: 'bg-blue-100 text-blue-700',
  publié: 'bg-blue-100 text-blue-700',
  cloture: 'bg-slate-100 text-slate-600',
  clôturé: 'bg-slate-100 text-slate-600',
}

type AppelForm = {
  titre: string
  residence_id: string
  montant_total: string
  date_echeance: string
  description: string
  groupe_habitation_id: string
}

const EMPTY_FORM: AppelForm = {
  titre: '',
  residence_id: '',
  montant_total: '',
  date_echeance: '',
  description: '',
  groupe_habitation_id: '',
}

// ---------------------------------------------------------------------------
// Répartition preview
// ---------------------------------------------------------------------------
const fmt = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 })

interface RepartitionPreviewProps {
  lots: Lot[]
  totalTantieme: number
  montantTotal: number
  mode?: 'tantieme' | 'fixe'
  montantFixe?: number
}

function RepartitionPreview({
  lots,
  totalTantieme,
  montantTotal,
  mode,
  montantFixe,
}: RepartitionPreviewProps) {
  const [open, setOpen] = useState(true)
  const isFixe = mode === 'fixe'

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        <span>{isFixe ? 'Répartition par montant fixe' : 'Répartition par tantième'}</span>
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
                {isFixe ? (
                  <th className="py-1 text-right font-medium">Montant</th>
                ) : (
                  <>
                    <th className="py-1 text-right font-medium">Tantième</th>
                    <th className="py-1 text-right font-medium">%</th>
                    <th className="py-1 text-right font-medium">Montant</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                if (isFixe) {
                  return (
                    <tr key={lot.id} className="border-b border-muted last:border-0">
                      <td className="py-1 font-mono">{lot.numero}</td>
                      <td className="py-1 text-right tabular-nums">
                        {fmt.format(montantFixe ?? 0)}
                      </td>
                    </tr>
                  )
                }
                const pct =
                  totalTantieme > 0 ? (lot.tantieme / totalTantieme) * 100 : 0
                const montantLot =
                  totalTantieme > 0
                    ? (lot.tantieme / totalTantieme) * montantTotal
                    : 0
                return (
                  <tr key={lot.id} className="border-b border-muted last:border-0">
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
                {isFixe ? (
                  <td className="py-1 text-right tabular-nums">
                    {fmt.format(lots.length * (montantFixe ?? 0))}
                  </td>
                ) : (
                  <>
                    <td className="py-1 text-right tabular-nums">{totalTantieme}</td>
                    <td className="py-1 text-right tabular-nums">100 %</td>
                    <td className="py-1 text-right tabular-nums">
                      {fmt.format(montantTotal)}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppelsFondsPage
// ---------------------------------------------------------------------------
export function AppelsFondsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === '1')
  const [form, setForm] = useState<AppelForm>(EMPTY_FORM)
  const [envoyerTarget, setEnvoyerTarget] = useState<AppelFonds | null>(null)

  const { data: appelsFonds = [], isLoading } = useQuery({
    queryKey: ['appels-fonds'],
    queryFn: () => getAppelsFonds(),
  })

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  // Lots for the répartition preview — only fetch when a residence is selected
  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots', form.residence_id],
    queryFn: () => getLots(Number(form.residence_id)),
    enabled: !!form.residence_id,
  })

  // Groupes habitations for the selected residence
  const ghQuery = useQuery({
    queryKey: ['gestionnaire', 'groupes-habitations', form.residence_id],
    queryFn: () => getGroupesHabitations(Number(form.residence_id)),
    enabled: !!form.residence_id && createOpen,
  })
  const groupesHabitations: GroupeHabitation[] = ghQuery.data ?? []

  const lots: Lot[] = lotsData?.lots ?? []
  const totalTantieme: number = lotsData?.total_tantieme ?? 0
  const montantTotal = Number(form.montant_total) || 0
  const showRepartition =
    !!form.residence_id && montantTotal > 0 && !lotsLoading && lots.length > 0

  const selectedResidence = residences.find((r) => r.id === Number(form.residence_id))

  const createMutation = useMutation({
    mutationFn: () =>
      storeAppelFonds({
        titre: form.titre,
        residence_id: Number(form.residence_id),
        montant_total: Number(form.montant_total),
        date_echeance: form.date_echeance,
        description: form.description || undefined,
        ...(form.groupe_habitation_id ? { groupe_habitation_id: Number(form.groupe_habitation_id) } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appels-fonds'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Appel de fonds créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const envoyerMutation = useMutation({
    mutationFn: (id: number) => envoyerAppelFonds(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appels-fonds'] })
      setEnvoyerTarget(null)
      toast.success(t('gestionnaire.appelsFonds.envoyerSuccess'))
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  })

  const columns: Column<AppelFonds>[] = [
    {
      key: 'titre',
      header: t('gestionnaire.appelsFonds.colTitre'),
      sortable: true,
    },
    {
      key: 'residence',
      header: t('gestionnaire.appelsFonds.colResidence'),
      renderCell: (r) => r.residence.name,
    },
    {
      key: 'montant_total',
      header: t('gestionnaire.appelsFonds.colMontant'),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant_total} />,
    },
    {
      key: 'montant_recouvre',
      header: t('gestionnaire.appelsFonds.colRecouvre'),
      renderCell: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--color-imaro-accent)]"
              style={{
                width: `${Math.min(r.taux_recouvrement ?? 0, 100)}%`,
              }}
            />
          </div>
          <span className="tabular-nums text-sm">
            {(r.taux_recouvrement ?? 0).toFixed(0)} %
          </span>
        </div>
      ),
    },
    {
      key: 'date_echeance',
      header: t('gestionnaire.appelsFonds.colEcheance'),
      sortable: true,
      renderCell: (r) =>
        r.date_echeance ? r.date_echeance.slice(0, 10) : '—',
    },
    {
      key: 'statut',
      header: t('gestionnaire.appelsFonds.colStatut'),
      renderCell: (r) => {
        const cls = STATUT_STYLES[r.statut] ?? 'bg-gray-100 text-gray-700'
        const label =
          t(`gestionnaire.appelsFonds.statut.${r.statut}`, {
            defaultValue: r.statut,
          })
        return (
          <Badge className={`${cls} hover:${cls} border-0`}>{label}</Badge>
        )
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
            {t('gestionnaire.appelsFonds.envoyer')}
          </Button>
        ) : null,
    },
  ]

  const isFormValid =
    form.titre.trim() &&
    form.residence_id &&
    form.montant_total &&
    form.date_echeance

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.appelsFonds.title')}
        subtitle={t('gestionnaire.appelsFonds.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="me-1.5 size-4" />
            {t('gestionnaire.appelsFonds.newAppel')}
          </Button>
        }
      />

      <DataTable
        data={appelsFonds}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        searchable
        exportable
        exportFilename="appels-fonds"
        emptyIcon={<FileText className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.appelsFonds.empty')}
        emptyDescription={t('gestionnaire.appelsFonds.emptyDesc')}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('gestionnaire.appelsFonds.newAppel')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.appelsFonds.form.titre')}</Label>
              <Input
                value={form.titre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titre: e.target.value }))
                }
                placeholder="Charges Q2 2026"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('gestionnaire.appelsFonds.form.residence')}</Label>
              <Select
                value={form.residence_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, residence_id: v, groupe_habitation_id: '' }))
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

            {groupesHabitations.length > 0 && (
              <div className="flex flex-col gap-1">
                <Label>Tranche (optionnel)</Label>
                <Select
                  value={form.groupe_habitation_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, groupe_habitation_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les tranches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les tranches</SelectItem>
                    {groupesHabitations.map((gh) => (
                      <SelectItem key={gh.id} value={String(gh.id)}>
                        {gh.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.appelsFonds.form.montant')}</Label>
                <Input
                  type="number"
                  value={form.montant_total}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, montant_total: e.target.value }))
                  }
                  placeholder="18000"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.appelsFonds.form.echeance')}</Label>
                <Input
                  type="date"
                  value={form.date_echeance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date_echeance: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Répartition par tantième preview */}
            {!!form.residence_id && montantTotal > 0 && (
              lotsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Calcul de la répartition…
                </div>
              ) : showRepartition ? (
                <RepartitionPreview
                  lots={lots}
                  totalTantieme={totalTantieme}
                  montantTotal={montantTotal}
                  mode={selectedResidence?.mode_cotisation}
                  montantFixe={selectedResidence?.montant_fixe}
                />
              ) : null
            )}

            <div className="space-y-1">
              <Label>{t('gestionnaire.appelsFonds.form.description')}</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!isFormValid || createMutation.isPending}
            >
              {createMutation.isPending ? t('actions.loading') : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Envoyer confirmation */}
      <ConfirmModal
        open={!!envoyerTarget}
        onOpenChange={(open) => !open && setEnvoyerTarget(null)}
        title={t('gestionnaire.appelsFonds.envoyer')}
        description={t('gestionnaire.appelsFonds.envoyerDesc')}
        confirmLabel={t('gestionnaire.appelsFonds.envoyer')}
        variant="default"
        onConfirm={() =>
          envoyerTarget && envoyerMutation.mutate(envoyerTarget.id)
        }
        isLoading={envoyerMutation.isPending}
      />
    </div>
  )
}
