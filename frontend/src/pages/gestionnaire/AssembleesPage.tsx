import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, CalendarDays, Users } from 'lucide-react'
import {
  getAssemblees,
  getResidences,
  storeAssemblee,
  type Assemblee,
} from '@/services/gestionnaire.service'
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

const STATUT_STYLES: Record<string, string> = {
  convoquee: 'bg-blue-100 text-blue-800',
  tenue: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-700',
}

type Tab = 'a_venir' | 'passees'

type AGForm = {
  titre: string
  type: string
  residence_id: string
  date: string
  heure: string
  lieu: string
  quorum_requis: string
  ordre_du_jour: string
}

const EMPTY_FORM: AGForm = {
  titre: '',
  type: 'ordinaire',
  residence_id: '',
  date: '',
  heure: '10:00',
  lieu: '',
  quorum_requis: '50',
  ordre_du_jour: '',
}

export function AssembleesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('a_venir')
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get('create') === '1',
  )
  const [detailAG, setDetailAG] = useState<Assemblee | null>(null)
  const [form, setForm] = useState<AGForm>(EMPTY_FORM)

  const { data: assemblees = [], isLoading } = useQuery({
    queryKey: ['assemblees'],
    queryFn: () => getAssemblees(),
  })

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const now = new Date()
  const aVenir = assemblees.filter((a) => new Date(a.date) >= now)
  const passees = assemblees.filter((a) => new Date(a.date) < now)

  const createMutation = useMutation({
    mutationFn: () => {
      const dateTime = `${form.date}T${form.heure}:00Z`
      return storeAssemblee({
        titre: form.titre,
        type: form.type,
        residence_id: Number(form.residence_id),
        date: dateTime,
        lieu: form.lieu,
        quorum_requis: Number(form.quorum_requis),
        ordre_du_jour: form.ordre_du_jour,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assemblees'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Assemblée créée')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const columns: Column<Assemblee>[] = [
    {
      key: 'titre',
      header: t('gestionnaire.assemblees.colTitre'),
      sortable: true,
    },
    {
      key: 'type',
      header: t('gestionnaire.assemblees.colType'),
      renderCell: (r) => (
        <Badge
          variant="outline"
          className={
            r.type === 'extraordinaire'
              ? 'border-orange-400 text-orange-700'
              : ''
          }
        >
          {t(`gestionnaire.assemblees.type.${r.type}`, {
            defaultValue: r.type,
          })}
        </Badge>
      ),
    },
    {
      key: 'residence',
      header: t('gestionnaire.assemblees.colResidence'),
      renderCell: (r) => r.residence.name,
    },
    {
      key: 'date',
      header: t('gestionnaire.assemblees.colDate'),
      sortable: true,
      renderCell: (r) => {
        const d = new Date(r.date)
        return (
          <span className="tabular-nums text-sm">
            {d.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            {' · '}
            {d.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )
      },
    },
    {
      key: 'lieu',
      header: t('gestionnaire.assemblees.colLieu'),
    },
    {
      key: 'statut',
      header: t('gestionnaire.assemblees.colStatut'),
      renderCell: (r) => {
        const cls = STATUT_STYLES[r.statut] ?? 'bg-gray-100 text-gray-600'
        return (
          <Badge className={`${cls} hover:${cls} border-0`}>
            {t(`gestionnaire.assemblees.statut.${r.statut}`, {
              defaultValue: r.statut,
            })}
          </Badge>
        )
      },
    },
    {
      key: 'id',
      header: '',
      className: 'w-20 text-right',
      renderCell: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setDetailAG(r)}>
          Voir
        </Button>
      ),
    },
  ]

  const isFormValid =
    form.titre.trim() &&
    form.residence_id &&
    form.date &&
    form.lieu.trim() &&
    form.ordre_du_jour.trim()

  const TABS: { key: Tab; label: string }[] = [
    { key: 'a_venir', label: t('gestionnaire.assemblees.tabAVenir') },
    { key: 'passees', label: t('gestionnaire.assemblees.tabPassees') },
  ]

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.assemblees.title')}
        subtitle={t('gestionnaire.assemblees.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="me-1.5 size-4" />
            {t('gestionnaire.assemblees.newAG')}
          </Button>
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
            {tab.label}
            {tab.key === 'a_venir' && aVenir.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--color-imaro-accent)] px-1.5 py-0.5 text-xs text-white">
                {aVenir.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        data={activeTab === 'a_venir' ? aVenir : passees}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        searchable
        emptyIcon={<CalendarDays className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.assemblees.empty')}
        emptyDescription={t('gestionnaire.assemblees.emptyDesc')}
      />

      {/* Create AG dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('gestionnaire.assemblees.newAG')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.assemblees.form.titre')}</Label>
              <Input
                value={form.titre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titre: e.target.value }))
                }
                placeholder="AG Ordinaire 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.assemblees.form.type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaire">
                      {t('gestionnaire.assemblees.type.ordinaire')}
                    </SelectItem>
                    <SelectItem value="extraordinaire">
                      {t('gestionnaire.assemblees.type.extraordinaire')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.assemblees.form.residence')}</Label>
                <Select
                  value={form.residence_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, residence_id: v }))
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.assemblees.form.date')}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.assemblees.form.heure')}</Label>
                <Input
                  type="time"
                  value={form.heure}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, heure: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.assemblees.form.lieu')}</Label>
                <Input
                  value={form.lieu}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lieu: e.target.value }))
                  }
                  placeholder="Salle de réunion, RDC"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.assemblees.form.quorum')}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.quorum_requis}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quorum_requis: e.target.value }))
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('gestionnaire.assemblees.form.ordreDuJour')}</Label>
              <textarea
                value={form.ordre_du_jour}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ordre_du_jour: e.target.value }))
                }
                placeholder="1. Approbation des comptes&#10;2. Budget prévisionnel&#10;3. Questions diverses"
                className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              {createMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AG detail dialog */}
      <Dialog
        open={!!detailAG}
        onOpenChange={(open) => !open && setDetailAG(null)}
      >
        {detailAG && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[var(--color-imaro-primary)]" />
                {detailAG.titre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Résidence</p>
                  <p>{detailAG.residence.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Type</p>
                  <p className="capitalize">{detailAG.type}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Date</p>
                  <p>
                    {new Date(detailAG.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {' à '}
                    {new Date(detailAG.date).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Lieu</p>
                  <p>{detailAG.lieu}</p>
                </div>
              </div>

              {/* Quorum */}
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Users className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    Quorum requis : {detailAG.quorum_requis} %
                  </p>
                  {detailAG.participants_count !== null ? (
                    <p className="text-muted-foreground">
                      {detailAG.participants_count} participants présents
                    </p>
                  ) : (
                    <p className="text-muted-foreground">AG non encore tenue</p>
                  )}
                </div>
                <Badge
                  className={cn(
                    STATUT_STYLES[detailAG.statut] ??
                      'bg-gray-100 text-gray-600',
                    'border-0 shrink-0',
                  )}
                >
                  {t(`gestionnaire.assemblees.statut.${detailAG.statut}`, {
                    defaultValue: detailAG.statut,
                  })}
                </Badge>
              </div>

              {/* Ordre du jour */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  {t('gestionnaire.assemblees.form.ordreDuJour')}
                </p>
                <div className="rounded-md border bg-muted/30 p-3">
                  {detailAG.ordre_du_jour.split('\n').map((line, i) => (
                    <p key={i} className="text-sm">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailAG(null)}>
                {t('actions.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
