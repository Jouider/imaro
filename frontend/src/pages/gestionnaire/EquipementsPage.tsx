import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wrench, Plus, Pencil, Trash2, AlertCircle, Hash, TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getResidences } from '@/services/gestionnaire.service'
import {
  getEquipements, createEquipement, updateEquipement, deleteEquipement,
  EQUIPEMENT_CATEGORIES,
  type Equipement, type EquipementCategorie, type CreateEquipementInput,
} from '@/services/sprint7.service'

const fmt = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})

const dt = new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })

const emptyDraft = (residenceId: number): CreateEquipementInput => ({
  residence_id: residenceId,
  designation: '', categorie: 'autre',
  date_acquisition: new Date().toISOString().slice(0, 10),
  valeur_acquisition: 0, duree_amortissement_mois: 120,
  actif: true,
})

export function EquipementsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Equipement | null>(null)
  const [draft, setDraft] = useState<CreateEquipementInput>(emptyDraft(0))

  const residencesQ = useQuery({ queryKey: ['residences'], queryFn: () => getResidences() })
  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const equipementsQ = useQuery({
    queryKey: ['equipements', residenceId],
    queryFn: () => getEquipements(residenceId!),
    enabled: !!residenceId,
  })

  const createMut = useMutation({
    mutationFn: (input: CreateEquipementInput) => createEquipement(residenceId!, input),
    onSuccess: () => {
      toast.success('Équipement ajouté')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['equipements', residenceId] })
    },
    onError: () => toast.error("Échec de l'ajout"),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CreateEquipementInput> }) =>
      updateEquipement(id, patch),
    onSuccess: () => {
      toast.success('Équipement mis à jour')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['equipements', residenceId] })
    },
    onError: () => toast.error('Échec de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEquipement(id),
    onSuccess: () => {
      toast.success('Équipement supprimé')
      void queryClient.invalidateQueries({ queryKey: ['equipements', residenceId] })
    },
    onError: () => toast.error('Échec de la suppression'),
  })

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft(residenceId ?? 0))
    setModalOpen(true)
  }

  const openEdit = (e: Equipement) => {
    setEditing(e)
    setDraft({
      residence_id: e.residence_id, designation: e.designation,
      categorie: e.categorie, date_acquisition: e.date_acquisition,
      valeur_acquisition: e.valeur_acquisition,
      duree_amortissement_mois: e.duree_amortissement_mois,
      notes: e.notes, actif: e.actif,
    })
    setModalOpen(true)
  }

  const save = () => {
    if (!draft.designation.trim()) { toast.error('Désignation requise'); return }
    if (draft.valeur_acquisition <= 0) { toast.error('Valeur d\'acquisition doit être > 0'); return }
    if (editing) updateMut.mutate({ id: editing.id, patch: draft })
    else createMut.mutate(draft)
  }

  const equipements = equipementsQ.data ?? []
  const totals = equipements.reduce(
    (acc, e) => ({
      nb: acc.nb + 1,
      valeurAcquisition: acc.valeurAcquisition + e.valeur_acquisition,
      valeurNette: acc.valeurNette + e.valeur_nette,
    }),
    { nb: 0, valeurAcquisition: 0, valeurNette: 0 },
  )
  const amortissementPct = totals.valeurAcquisition > 0
    ? (1 - totals.valeurNette / totals.valeurAcquisition) * 100
    : 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#1B4F72]/10">
          <Wrench className="size-5 text-[#1B4F72]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.equipements.title', { defaultValue: 'Équipements' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.equipements.subtitle', {
              defaultValue: 'Registre des équipements et immobilisations — Annexe 9 du Décret 2.23.700',
            })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate} disabled={!residenceId}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      {/* Residence + KPIs */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Résidence</label>
        <Select value={residenceId ? String(residenceId) : ''} onValueChange={(v) => setPickedResidenceId(Number(v))}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Hash className="size-4 text-[#1B4F72]" />
            <p className="text-xs text-muted-foreground">Nombre d&apos;articles</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{totals.nb}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Wrench className="size-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">Valeur d&apos;acquisition</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{fmt.format(totals.valeurAcquisition)} DH</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingDown className="size-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Valeur nette (après amort. {amortissementPct.toFixed(0)}%)</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-green-600">{fmt.format(totals.valeurNette)} DH</p>
        </div>
      </div>

      {/* Legal note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Annexe 9 — Décret 2.23.700</strong> · Le registre des équipements communs doit être à jour pour
          la convocation d&apos;AG et le bilan annuel. L&apos;amortissement linéaire est calculé sur la durée renseignée.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Acquis le</TableHead>
              <TableHead className="text-right">V. acquisition</TableHead>
              <TableHead className="text-right">V. nette</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipementsQ.isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : equipements.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Aucun équipement enregistré.</TableCell></TableRow>
            ) : (
              equipements.map((e) => {
                const cat = EQUIPEMENT_CATEGORIES.find((c) => c.value === e.categorie)?.label ?? e.categorie
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm font-medium">{e.designation}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cat}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{dt.format(new Date(e.date_acquisition))}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{fmt.format(e.valeur_acquisition)} DH</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium text-green-600">{fmt.format(e.valeur_nette)} DH</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        e.actif ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-600',
                      )}>
                        {e.actif ? 'Actif' : 'Hors service'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(e)} title="Modifier">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="size-7"
                          onClick={() => {
                            if (confirm(`Supprimer l'équipement « ${e.designation} » ?`)) deleteMut.mutate(e.id)
                          }}
                          title="Supprimer"
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

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier un équipement' : 'Ajouter un équipement'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="desig">Désignation *</Label>
              <Input id="desig" value={draft.designation} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} placeholder="ex: Ascenseur principal Otis" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cat">Catégorie</Label>
                <Select value={draft.categorie} onValueChange={(v) => setDraft({ ...draft, categorie: v as EquipementCategorie })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPEMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date d&apos;acquisition</Label>
                <Input id="date" type="date" value={draft.date_acquisition} onChange={(e) => setDraft({ ...draft, date_acquisition: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valeur">Valeur d&apos;acquisition (DH) *</Label>
                <Input id="valeur" type="number" min="0" step="0.01" value={draft.valeur_acquisition || ''} onChange={(e) => setDraft({ ...draft, valeur_acquisition: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="duree">Durée amortissement (mois)</Label>
                <Input id="duree" type="number" min="1" value={draft.duree_amortissement_mois || ''} onChange={(e) => setDraft({ ...draft, duree_amortissement_mois: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Équipement en service</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">Décocher si hors service / déclassé</p>
              </div>
              <Switch checked={draft.actif} onCheckedChange={(v) => setDraft({ ...draft, actif: v })} />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Input id="notes" value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
