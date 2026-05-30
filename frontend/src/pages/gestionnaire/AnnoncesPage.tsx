import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Megaphone, Globe, Eye, Trash2 } from 'lucide-react'
import {
  getAnnonces,
  storeAnnonce,
  publishAnnonce,
  archiveAnnonce,
  deleteAnnonce,
  type Annonce,
} from '@/services/annonces.service'
import { getResidences } from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
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

type Tab = 'toutes' | 'publiees' | 'brouillons' | 'archivees'

const STATUT_STYLES: Record<string, string> = {
  publiee: 'bg-green-100 text-green-800',
  brouillon: 'bg-gray-100 text-gray-600',
  archivee: 'bg-orange-100 text-orange-700',
}

type AnnonceForm = {
  titre: string
  contenu: string
  priorite: 'normale' | 'urgente'
  residence_id: string
}

const EMPTY_FORM: AnnonceForm = {
  titre: '',
  contenu: '',
  priorite: 'normale',
  residence_id: '',
}

export function AnnoncesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('toutes')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<AnnonceForm>(EMPTY_FORM)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'publish' | 'archive' | 'delete'
    annonce: Annonce
  } | null>(null)

  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ['annonces'],
    queryFn: () => getAnnonces(),
  })

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const filtered = annonces.filter((a) => {
    if (activeTab === 'toutes') return true
    if (activeTab === 'publiees') return a.statut === 'publiee'
    if (activeTab === 'brouillons') return a.statut === 'brouillon'
    if (activeTab === 'archivees') return a.statut === 'archivee'
    return true
  })

  const createMutation = useMutation({
    mutationFn: () =>
      storeAnnonce({
        titre: form.titre,
        contenu: form.contenu,
        priorite: form.priorite,
        residence_id: form.residence_id ? Number(form.residence_id) : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['annonces'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Annonce créée')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => publishAnnonce(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['annonces'] })
      setConfirmAction(null)
      toast.success(t('gestionnaire.annonces.publishSuccess'))
    },
    onError: () => toast.error('Erreur'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveAnnonce(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['annonces'] })
      setConfirmAction(null)
      toast.success(t('gestionnaire.annonces.archiveSuccess'))
    },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnnonce(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['annonces'] })
      setConfirmAction(null)
      toast.success(t('gestionnaire.annonces.deleteSuccess'))
    },
    onError: () => toast.error('Erreur'),
  })

  const handleConfirm = () => {
    if (!confirmAction) return
    const { type, annonce } = confirmAction
    if (type === 'publish') publishMutation.mutate(annonce.id)
    else if (type === 'archive') archiveMutation.mutate(annonce.id)
    else if (type === 'delete') deleteMutation.mutate(annonce.id)
  }

  const isConfirmPending =
    publishMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending

  const isFormValid = form.titre.trim() && form.contenu.trim()

  type TabDef = { key: Tab; labelKey: string }
  const TABS: TabDef[] = [
    { key: 'toutes', labelKey: 'gestionnaire.annonces.tabToutes' },
    { key: 'publiees', labelKey: 'gestionnaire.annonces.tabPubliees' },
    { key: 'brouillons', labelKey: 'gestionnaire.annonces.tabBrouillons' },
    { key: 'archivees', labelKey: 'gestionnaire.annonces.tabArchivees' },
  ]

  const counts = {
    publiees: annonces.filter((a) => a.statut === 'publiee').length,
    brouillons: annonces.filter((a) => a.statut === 'brouillon').length,
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.annonces.title')}
        subtitle={t('gestionnaire.annonces.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="me-1.5 size-4" />
            {t('gestionnaire.annonces.newAnnonce')}
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
            {t(tab.labelKey)}
            {tab.key === 'brouillons' && counts.brouillons > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-400 px-1.5 py-0.5 text-xs text-white">
                {counts.brouillons}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Megaphone className="size-12 text-muted-foreground" />
          <p className="font-medium">{t('gestionnaire.annonces.empty')}</p>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.annonces.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((annonce) => (
            <AnnonceCard
              key={annonce.id}
              annonce={annonce}
              t={t}
              onPublish={() => setConfirmAction({ type: 'publish', annonce })}
              onArchive={() => setConfirmAction({ type: 'archive', annonce })}
              onDelete={() => setConfirmAction({ type: 'delete', annonce })}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('gestionnaire.annonces.newAnnonce')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.annonces.form.titre')}</Label>
              <Input
                value={form.titre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titre: e.target.value }))
                }
                placeholder="Travaux ascenseur — interruption de service"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.annonces.form.priorite')}</Label>
                <Select
                  value={form.priorite}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      priorite: v as 'normale' | 'urgente',
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">
                      {t('gestionnaire.annonces.priorite.normale')}
                    </SelectItem>
                    <SelectItem value="urgente">
                      {t('gestionnaire.annonces.priorite.urgente')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.annonces.form.residence')}</Label>
                <Select
                  value={form.residence_id}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      residence_id: v === '_all' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t('gestionnaire.annonces.toutes')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">
                      {t('gestionnaire.annonces.toutes')}
                    </SelectItem>
                    {residences.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('gestionnaire.annonces.form.contenu')}</Label>
              <textarea
                value={form.contenu}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contenu: e.target.value }))
                }
                placeholder="Décrivez l'annonce…"
                className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* Confirm action dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        {confirmAction && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {confirmAction.type === 'publish' &&
                  t('gestionnaire.annonces.publishConfirm')}
                {confirmAction.type === 'archive' &&
                  t('gestionnaire.annonces.archiveConfirm')}
                {confirmAction.type === 'delete' &&
                  t('gestionnaire.annonces.deleteConfirm')}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {confirmAction.type === 'publish' &&
                t('gestionnaire.annonces.publishDesc')}
              {confirmAction.type === 'archive' &&
                t('gestionnaire.annonces.archiveDesc')}
              {confirmAction.type === 'delete' &&
                t('gestionnaire.annonces.deleteDesc')}
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
                disabled={isConfirmPending}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                variant={
                  confirmAction.type === 'delete' ? 'destructive' : 'default'
                }
                onClick={handleConfirm}
                disabled={isConfirmPending}
              >
                {isConfirmPending ? t('actions.loading') : t('actions.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

// ─── AnnonceCard ──────────────────────────────────────────────────────────────

type AnnonceCardProps = {
  annonce: Annonce
  t: (key: string, options?: Record<string, unknown>) => string
  onPublish: () => void
  onArchive: () => void
  onDelete: () => void
}

function AnnonceCard({
  annonce,
  t,
  onPublish,
  onArchive,
  onDelete,
}: AnnonceCardProps) {
  const statutCls = STATUT_STYLES[annonce.statut] ?? 'bg-gray-100 text-gray-600'
  const dateLabel = annonce.date_publication
    ? new Date(annonce.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date(annonce.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start">
      {/* Left: content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {annonce.priorite === 'urgente' && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">
              {t('gestionnaire.annonces.priorite.urgente')}
            </Badge>
          )}
          <Badge className={cn(statutCls, 'hover:opacity-80 border-0 text-xs')}>
            {t(`gestionnaire.annonces.statut.${annonce.statut}`, {
              defaultValue: annonce.statut,
            })}
          </Badge>
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
        </div>

        <h3 className="font-medium text-sm leading-snug">{annonce.titre}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {annonce.contenu}
        </p>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {annonce.residence ? (
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              {annonce.residence.name}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              {t('gestionnaire.annonces.toutes')}
            </span>
          )}
          {annonce.statut === 'publiee' && (
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {annonce.nb_lectures} lectures
            </span>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 gap-1.5">
        {annonce.statut === 'brouillon' && (
          <>
            <Button variant="outline" size="sm" onClick={onPublish}>
              {t('gestionnaire.annonces.publier')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
        {annonce.statut === 'publiee' && (
          <Button variant="outline" size="sm" onClick={onArchive}>
            {t('gestionnaire.annonces.archiver')}
          </Button>
        )}
      </div>
    </div>
  )
}
