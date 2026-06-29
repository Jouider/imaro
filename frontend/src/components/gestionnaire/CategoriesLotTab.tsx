import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import {
  getCategoriesLot,
  createCategorieLot,
  updateCategorieLot,
  deleteCategorieLot,
  type CategorieLot,
} from '@/services/gestionnaire.service'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Gestion des catégories de lot d'une résidence (KAN-93). Le manager crée des
 * catégories (libellé + cotisation) ; chaque lot rattaché paie la cotisation de
 * sa catégorie lors de la génération des appels de fonds.
 */
export function CategoriesLotTab({ residenceId }: { residenceId: number }) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategorieLot | null>(null)
  const [deleting, setDeleting] = useState<CategorieLot | null>(null)
  const [nom, setNom] = useState('')
  const [cotisation, setCotisation] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-lot', residenceId],
    queryFn: () => getCategoriesLot(residenceId),
  })

  function openCreate() {
    setEditing(null)
    setNom('')
    setCotisation('')
    setDialogOpen(true)
  }

  function openEdit(cat: CategorieLot) {
    setEditing(cat)
    setNom(cat.nom)
    setCotisation(String(cat.cotisation))
    setDialogOpen(true)
  }

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['categories-lot', residenceId] })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { nom: nom.trim(), cotisation: Number(cotisation) }
      return editing
        ? updateCategorieLot(editing.id, payload)
        : createCategorieLot(residenceId, payload)
    },
    onSuccess: () => {
      invalidate()
      setDialogOpen(false)
      toast.success(
        t('gestionnaire.residences.categories.saved', {
          defaultValue: 'Catégorie enregistrée',
        }),
      )
    },
    onError: () => toast.error(t('common.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategorieLot(id),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success(
        t('gestionnaire.residences.categories.deleted', {
          defaultValue: 'Catégorie supprimée',
        }),
      )
    },
    onError: () => toast.error(t('common.error')),
  })

  const canSave =
    nom.trim() !== '' && Number(cotisation) >= 0 && cotisation !== ''

  if (isLoading) return <LoadingSkeleton variant="table" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('gestionnaire.residences.categories.subtitle', {
            defaultValue:
              'Définissez la cotisation par catégorie de lot, puis rattachez chaque lot à une catégorie.',
          })}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="me-1.5 size-4" />
          {t('gestionnaire.residences.categories.add', {
            defaultValue: 'Nouvelle catégorie',
          })}
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={<Tag className="size-12 text-muted-foreground" />}
          title={t('gestionnaire.residences.categories.empty', {
            defaultValue: 'Aucune catégorie',
          })}
          description={t('gestionnaire.residences.categories.emptyDesc', {
            defaultValue: 'Créez une première catégorie de lot.',
          })}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border bg-white p-4 dark:bg-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{cat.nom}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-imaro-primary)]">
                    <MontantDisplay value={cat.cotisation} />
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => openEdit(cat)}
                    aria-label={t('actions.edit')}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => setDeleting(cat)}
                    aria-label={t('actions.delete')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('gestionnaire.residences.categories.nbLots', {
                  defaultValue: '{{count}} lot(s) rattaché(s)',
                  count: cat.nb_lots,
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('gestionnaire.residences.categories.editTitle', {
                    defaultValue: 'Modifier la catégorie',
                  })
                : t('gestionnaire.residences.categories.add', {
                    defaultValue: 'Nouvelle catégorie',
                  })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-nom">
                {t('gestionnaire.residences.categories.nom', {
                  defaultValue: 'Libellé',
                })}
              </Label>
              <Input
                id="cat-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="3C+S"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-cotisation">
                {t('gestionnaire.residences.categories.cotisation', {
                  defaultValue: 'Cotisation (DH / période)',
                })}
              </Label>
              <Input
                id="cat-cotisation"
                type="number"
                min={0}
                value={cotisation}
                onChange={(e) => setCotisation(e.target.value)}
                placeholder="1500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('gestionnaire.residences.categories.deleteTitle', {
          defaultValue: 'Supprimer la catégorie',
        })}
        description={t('gestionnaire.residences.categories.deleteDesc', {
          defaultValue:
            'Les lots rattachés seront détachés de cette catégorie. Continuer ?',
        })}
        confirmLabel={t('actions.delete')}
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
