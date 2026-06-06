import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getResidences } from '@/services/gestionnaire.service'
import {
  getAutresRecettes,
  createAutreRecette,
  updateAutreRecette,
  deleteAutreRecette,
  RECETTE_CATEGORIES,
  type AutreRecette,
  type RecetteCategorie,
  type CreateRecetteInput,
} from '@/services/sprint7.service'

const fmt = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const empty = (residenceId: number, exercice: number): CreateRecetteInput => ({
  residence_id: residenceId,
  exercice,
  date: new Date().toISOString().slice(0, 10),
  libelle: '',
  categorie: 'autre',
  montant: 0,
})

export function AutresRecettesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(
    null,
  )
  const [exercice, setExercice] = useState(2026)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AutreRecette | null>(null)
  const [draft, setDraft] = useState<CreateRecetteInput>(empty(0, 2026))

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const recettesQ = useQuery({
    queryKey: ['autres-recettes', residenceId, exercice],
    queryFn: () => getAutresRecettes(residenceId!, exercice),
    enabled: !!residenceId,
  })

  const createMut = useMutation({
    mutationFn: (input: CreateRecetteInput) =>
      createAutreRecette(residenceId!, input),
    onSuccess: () => {
      toast.success(t('gestionnaire.autresRecettes.toastAdded'))
      setModalOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['autres-recettes', residenceId, exercice],
      })
    },
  })
  const updateMut = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number
      patch: Partial<CreateRecetteInput>
    }) => updateAutreRecette(id, patch),
    onSuccess: () => {
      toast.success(t('gestionnaire.autresRecettes.toastUpdated'))
      setModalOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['autres-recettes', residenceId, exercice],
      })
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAutreRecette(id),
    onSuccess: () => {
      toast.success(t('gestionnaire.autresRecettes.toastDeleted'))
      void queryClient.invalidateQueries({
        queryKey: ['autres-recettes', residenceId, exercice],
      })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setDraft(empty(residenceId ?? 0, exercice))
    setModalOpen(true)
  }
  const openEdit = (r: AutreRecette) => {
    setEditing(r)
    setDraft({ ...r })
    setModalOpen(true)
  }
  const save = () => {
    if (!draft.libelle.trim()) {
      toast.error(t('common.libelleRequired'))
      return
    }
    if (draft.montant <= 0) {
      toast.error(t('common.amountPositive'))
      return
    }
    if (editing) updateMut.mutate({ id: editing.id, patch: draft })
    else createMut.mutate(draft)
  }

  const recettes = recettesQ.data ?? []
  const totalAll = recettes.reduce((s, r) => s + r.montant, 0)
  const byCat = recettes.reduce(
    (acc, r) => {
      acc[r.categorie] = (acc[r.categorie] ?? 0) + r.montant
      return acc
    },
    {} as Record<string, number>,
  )
  const top3Cats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <TrendingUp className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.autresRecettes.title', {
              defaultValue: 'Autres recettes',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            Recettes hors appels de fonds — locations, subventions, indemnités,
            produits financiers
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={openCreate}
          disabled={!residenceId}
        >
          <Plus className="size-4" />
          {t('gestionnaire.autres.newRecette')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">{t('common.residence')}</label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setPickedResidenceId(Number(v))}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder={t('common.select')} />
          </SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="text-sm font-medium">{t('common.exercice')}</label>
        <Select
          value={String(exercice)}
          onValueChange={(v) => setExercice(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">
            Total recettes {exercice}
          </p>
          <p className="text-2xl font-bold tracking-tight text-green-600">
            {fmt.format(totalAll)} DH
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {recettes.length} opération{recettes.length > 1 ? 's' : ''}
          </p>
        </div>
        {top3Cats.map(([cat, amount]) => {
          const label =
            RECETTE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat
          return (
            <div key={cat} className="rounded-xl border bg-card p-4">
              <p
                className="mb-1 text-xs text-muted-foreground truncate"
                title={label}
              >
                {label}
              </p>
              <p className="text-xl font-bold tracking-tight">
                {fmt.format(amount)} DH
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {((amount / totalAll) * 100).toFixed(0)}% du total
              </p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('common.libelle')}</TableHead>
              <TableHead>{t('common.categorie')}</TableHead>
              <TableHead>Payeur</TableHead>
              <TableHead className="text-right">{t('common.amount')}</TableHead>
              <TableHead className="text-right">
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recettesQ.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {t('common.chargement')}
                </TableCell>
              </TableRow>
            ) : recettes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t('gestionnaire.autresRecettes.emptyRow')}
                </TableCell>
              </TableRow>
            ) : (
              recettes.map((r) => {
                const catLabel =
                  RECETTE_CATEGORIES.find((c) => c.value === r.categorie)
                    ?.label ?? r.categorie
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {dt.format(new Date(r.date))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.libelle}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-[var(--color-imaro-primary)]/30 bg-[var(--color-imaro-primary)]/5 text-[10px] text-[var(--color-imaro-primary)]"
                      >
                        {catLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.payeur ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium text-green-600">
                      {fmt.format(r.montant)} DH
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            if (confirm(`Supprimer « ${r.libelle} » ?`))
                              deleteMut.mutate(r.id)
                          }}
                        >
                          <Trash2 className="size-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier la recette' : 'Nouvelle recette'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t('common.libelle')} *</Label>
              <Input
                value={draft.libelle}
                onChange={(e) =>
                  setDraft({ ...draft, libelle: e.target.value })
                }
                placeholder="ex: Loyer parking C-12 janvier"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('common.date')}</Label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Montant (DH) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.montant || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, montant: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div>
              <Label>{t('common.categorie')}</Label>
              <Select
                value={draft.categorie}
                onValueChange={(v) =>
                  setDraft({ ...draft, categorie: v as RecetteCategorie })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECETTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payeur</Label>
                <Input
                  value={draft.payeur ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, payeur: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('common.reference')}</Label>
                <Input
                  value={draft.reference ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, reference: e.target.value })
                  }
                  placeholder="ex: VIR-2026-001"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={save}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
