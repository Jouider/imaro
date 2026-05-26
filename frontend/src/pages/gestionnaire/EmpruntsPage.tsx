import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Banknote, Plus, Pencil, Trash2, AlertCircle, TrendingDown, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  getEmprunts, createEmprunt, updateEmprunt, deleteEmprunt,
  type Emprunt, type CreateEmpruntInput,
} from '@/services/sprint7.service'

const fmt = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const dt = new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })

const STATUT_CLS: Record<Emprunt['statut'], string> = {
  actif:      'border-blue-200 bg-blue-50 text-blue-700',
  rembourse:  'border-green-200 bg-green-50 text-green-700',
  en_defaut:  'border-red-200 bg-red-50 text-red-700',
}
const STATUT_LABEL: Record<Emprunt['statut'], string> = {
  actif: 'Actif', rembourse: 'Remboursé', en_defaut: 'En défaut',
}

const emptyDraft = (residenceId: number): CreateEmpruntInput => ({
  residence_id: residenceId,
  libelle: '', organisme: '',
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: '',
  montant_initial: 0, taux_interet: 0, duree_mois: 60, mensualite: 0,
})

export function EmpruntsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Emprunt | null>(null)
  const [draft, setDraft] = useState<CreateEmpruntInput>(emptyDraft(0))

  const residencesQ = useQuery({ queryKey: ['residences'], queryFn: () => getResidences() })
  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const empruntsQ = useQuery({
    queryKey: ['emprunts', residenceId],
    queryFn: () => getEmprunts(residenceId!),
    enabled: !!residenceId,
  })

  const createMut = useMutation({
    mutationFn: (input: CreateEmpruntInput) => createEmprunt(residenceId!, input),
    onSuccess: () => { toast.success('Emprunt enregistré'); setModalOpen(false); void queryClient.invalidateQueries({ queryKey: ['emprunts', residenceId] }) },
    onError: () => toast.error('Échec'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CreateEmpruntInput> }) => updateEmprunt(id, patch),
    onSuccess: () => { toast.success('Emprunt mis à jour'); setModalOpen(false); void queryClient.invalidateQueries({ queryKey: ['emprunts', residenceId] }) },
    onError: () => toast.error('Échec'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEmprunt(id),
    onSuccess: () => { toast.success('Emprunt supprimé'); void queryClient.invalidateQueries({ queryKey: ['emprunts', residenceId] }) },
    onError: () => toast.error('Échec'),
  })

  const openCreate = () => { setEditing(null); setDraft(emptyDraft(residenceId ?? 0)); setModalOpen(true) }
  const openEdit = (e: Emprunt) => {
    setEditing(e)
    setDraft({
      residence_id: e.residence_id, libelle: e.libelle, organisme: e.organisme,
      date_debut: e.date_debut, date_fin: e.date_fin,
      montant_initial: e.montant_initial, taux_interet: e.taux_interet,
      duree_mois: e.duree_mois, mensualite: e.mensualite,
      notes: e.notes,
    })
    setModalOpen(true)
  }
  const save = () => {
    if (!draft.libelle.trim()) { toast.error('Libellé requis'); return }
    if (draft.montant_initial <= 0) { toast.error('Montant initial > 0'); return }
    if (editing) updateMut.mutate({ id: editing.id, patch: draft })
    else createMut.mutate(draft)
  }

  const emprunts = empruntsQ.data ?? []
  const totals = emprunts.reduce((acc, e) => ({
    emprunte:     acc.emprunte + e.montant_initial,
    payeCumul:    acc.payeCumul + e.paye_cumule,
    payeExercice: acc.payeExercice + e.paye_exercice,
    reste:        acc.reste + e.reste,
  }), { emprunte: 0, payeCumul: 0, payeExercice: 0, reste: 0 })

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#1B4F72]/10">
          <Banknote className="size-5 text-[#1B4F72]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.emprunts.title', { defaultValue: 'Emprunts' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi des emprunts contractés par la copropriété — Annexe 8 du Décret 2.23.700
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate} disabled={!residenceId}>
          <Plus className="size-4" />Nouvel emprunt
        </Button>
      </div>

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total emprunté" value={`${fmt.format(totals.emprunte)} DH`} tone="primary" />
        <Kpi label="Payé cumul" value={`${fmt.format(totals.payeCumul)} DH`} tone="muted" />
        <Kpi label="Payé cet exercice" value={`${fmt.format(totals.payeExercice)} DH`} tone="success" />
        <Kpi label="Reste à payer" value={`${fmt.format(totals.reste)} DH`} tone="danger" />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Annexe 8 — Décret 2.23.700</strong> · Tout emprunt collectif doit être voté en AG (Loi 18-00 art. 17).
          Le tableau d&apos;amortissement est fourni par l&apos;organisme prêteur.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Organisme</TableHead>
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Initial</TableHead>
              <TableHead className="text-right">Mensualité</TableHead>
              <TableHead className="text-right">Reste dû</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empruntsQ.isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : emprunts.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Aucun emprunt enregistré.</TableCell></TableRow>
            ) : (
              emprunts.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm font-medium">{e.libelle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.organisme}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {dt.format(new Date(e.date_debut))} → {dt.format(new Date(e.date_fin))}
                    </div>
                    <span className="text-[10px]">{e.duree_mois} mois · {e.taux_interet}%</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmt.format(e.montant_initial)} DH</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmt.format(e.mensualite)} DH</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium text-orange-600">{fmt.format(e.reste)} DH</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', STATUT_CLS[e.statut])}>
                      {STATUT_LABEL[e.statut]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(e)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7"
                        onClick={() => { if (confirm(`Supprimer l'emprunt « ${e.libelle} » ?`)) deleteMut.mutate(e.id) }}
                      >
                        <Trash2 className="size-3.5 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'emprunt" : 'Nouvel emprunt'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Libellé *</Label>
              <Input value={draft.libelle} onChange={(e) => setDraft({ ...draft, libelle: e.target.value })} placeholder="ex: Réfection toiture 2023" />
            </div>
            <div>
              <Label>Organisme prêteur</Label>
              <Input value={draft.organisme} onChange={(e) => setDraft({ ...draft, organisme: e.target.value })} placeholder="ex: Banque Populaire" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={draft.date_debut} onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })} />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input type="date" value={draft.date_fin} onChange={(e) => setDraft({ ...draft, date_fin: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Montant initial (DH) *</Label>
                <Input type="number" min="0" step="0.01" value={draft.montant_initial || ''} onChange={(e) => setDraft({ ...draft, montant_initial: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Taux (%)</Label>
                <Input type="number" min="0" step="0.01" value={draft.taux_interet || ''} onChange={(e) => setDraft({ ...draft, taux_interet: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Durée (mois)</Label>
                <Input type="number" min="1" value={draft.duree_mois || ''} onChange={(e) => setDraft({ ...draft, duree_mois: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Mensualité (DH)</Label>
              <Input type="number" min="0" step="0.01" value={draft.mensualite || ''} onChange={(e) => setDraft({ ...draft, mensualite: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'muted' | 'success' | 'danger' }) {
  const tones = {
    primary: 'text-[#1B4F72]',
    muted:   'text-muted-foreground',
    success: 'text-green-600',
    danger:  'text-orange-600',
  }[tone]
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-1 text-xs text-muted-foreground flex items-center gap-1.5">
        <TrendingDown className="size-3.5" />
        {label}
      </p>
      <p className={cn('text-xl font-bold tracking-tight', tones)}>{value}</p>
    </div>
  )
}
