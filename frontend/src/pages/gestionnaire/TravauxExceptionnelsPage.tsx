import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HardHat, Plus, Pencil, Trash2, AlertCircle,
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
  getTravauxExceptionnels, createTravaux, updateTravaux, deleteTravaux,
  type TravauxExceptionnel, type TravauxStatus, type CreateTravauxInput,
} from '@/services/sprint7.service'

const fmt = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dt = new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })

const STATUT_META: Record<TravauxStatus, { label: string; cls: string }> = {
  vote:     { label: 'Voté',      cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  en_cours: { label: 'En cours',  cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  termine:  { label: 'Terminé',   cls: 'border-green-200 bg-green-50 text-green-700' },
  annule:   { label: 'Annulé',    cls: 'border-gray-200 bg-gray-50 text-gray-600' },
}

const emptyDraft = (residenceId: number): CreateTravauxInput => ({
  residence_id: residenceId,
  libelle: '', description: '',
  date_vote_ag: new Date().toISOString().slice(0, 10),
  prestataire: '',
  montant_vote: 0, montant_engage: 0, montant_regle: 0,
  statut: 'vote',
})

export function TravauxExceptionnelsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TravauxExceptionnel | null>(null)
  const [draft, setDraft] = useState<CreateTravauxInput>(emptyDraft(0))

  const residencesQ = useQuery({ queryKey: ['residences'], queryFn: () => getResidences() })
  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const travauxQ = useQuery({
    queryKey: ['travaux-exceptionnels', residenceId],
    queryFn: () => getTravauxExceptionnels(residenceId!),
    enabled: !!residenceId,
  })

  const createMut = useMutation({
    mutationFn: (input: CreateTravauxInput) => createTravaux(residenceId!, input),
    onSuccess: () => { toast.success('Travaux enregistrés'); setModalOpen(false); void queryClient.invalidateQueries({ queryKey: ['travaux-exceptionnels', residenceId] }) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CreateTravauxInput> }) => updateTravaux(id, patch),
    onSuccess: () => { toast.success('Travaux mis à jour'); setModalOpen(false); void queryClient.invalidateQueries({ queryKey: ['travaux-exceptionnels', residenceId] }) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTravaux(id),
    onSuccess: () => { toast.success('Travaux supprimés'); void queryClient.invalidateQueries({ queryKey: ['travaux-exceptionnels', residenceId] }) },
  })

  const openCreate = () => { setEditing(null); setDraft(emptyDraft(residenceId ?? 0)); setModalOpen(true) }
  const openEdit = (tr: TravauxExceptionnel) => {
    setEditing(tr)
    setDraft({
      residence_id: tr.residence_id, libelle: tr.libelle, description: tr.description,
      date_vote_ag: tr.date_vote_ag, ag_id: tr.ag_id, prestataire: tr.prestataire,
      montant_vote: tr.montant_vote, montant_engage: tr.montant_engage, montant_regle: tr.montant_regle,
      date_debut: tr.date_debut, date_fin_prevue: tr.date_fin_prevue, date_fin_reelle: tr.date_fin_reelle,
      statut: tr.statut,
    })
    setModalOpen(true)
  }
  const save = () => {
    if (!draft.libelle.trim()) { toast.error('Libellé requis'); return }
    if (editing) updateMut.mutate({ id: editing.id, patch: draft })
    else createMut.mutate(draft)
  }

  const travaux = travauxQ.data ?? []
  const totals = travaux.reduce((acc, t) => ({
    vote:   acc.vote + t.montant_vote,
    engage: acc.engage + t.montant_engage,
    regle:  acc.regle + t.montant_regle,
    reste:  acc.reste + (t.montant_engage - t.montant_regle),
  }), { vote: 0, engage: 0, regle: 0, reste: 0 })

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#1B4F72]/10">
          <HardHat className="size-5 text-[#1B4F72]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.travaux.title', { defaultValue: 'Travaux exceptionnels' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi des travaux non courants votés en AG — Annexe 6 du Décret 2.23.700
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate} disabled={!residenceId}>
          <Plus className="size-4" />Nouveaux travaux
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
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Montant voté</p>
          <p className="text-xl font-bold tracking-tight text-[#1B4F72]">{fmt.format(totals.vote)} DH</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Montant engagé</p>
          <p className="text-xl font-bold tracking-tight text-amber-600">{fmt.format(totals.engage)} DH</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Montant réglé</p>
          <p className="text-xl font-bold tracking-tight text-green-600">{fmt.format(totals.regle)} DH</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Reste à régler</p>
          <p className="text-xl font-bold tracking-tight text-orange-600">{fmt.format(totals.reste)} DH</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Annexe 6 — Décret 2.23.700</strong> · Les travaux non courants (gros entretien, transformation,
          amélioration) doivent être votés en AG (Loi 18-00 art. 17) à la majorité requise selon le type de travaux.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Vote AG</TableHead>
              <TableHead>Prestataire</TableHead>
              <TableHead className="text-right">Voté</TableHead>
              <TableHead className="text-right">Engagé</TableHead>
              <TableHead className="text-right">Réglé</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {travauxQ.isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : travaux.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Aucun travaux exceptionnel pour cet exercice.</TableCell></TableRow>
            ) : (
              travaux.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell className="text-sm font-medium max-w-xs truncate" title={tr.libelle}>
                    {tr.libelle}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{dt.format(new Date(tr.date_vote_ag))}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tr.prestataire ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmt.format(tr.montant_vote)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-amber-600">{fmt.format(tr.montant_engage)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-green-600 font-medium">{fmt.format(tr.montant_regle)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', STATUT_META[tr.statut].cls)}>
                      {STATUT_META[tr.statut].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(tr)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7"
                        onClick={() => { if (confirm(`Supprimer « ${tr.libelle} » ?`)) deleteMut.mutate(tr.id) }}
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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier les travaux' : 'Nouveaux travaux exceptionnels'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Libellé *</Label>
              <Input value={draft.libelle} onChange={(e) => setDraft({ ...draft, libelle: e.target.value })} placeholder="ex: Ravalement façade nord" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date vote AG</Label>
                <Input type="date" value={draft.date_vote_ag} onChange={(e) => setDraft({ ...draft, date_vote_ag: e.target.value })} />
              </div>
              <div>
                <Label>Prestataire</Label>
                <Input value={draft.prestataire ?? ''} onChange={(e) => setDraft({ ...draft, prestataire: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Montant voté (DH)</Label>
                <Input type="number" min="0" step="0.01" value={draft.montant_vote || ''} onChange={(e) => setDraft({ ...draft, montant_vote: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Engagé (DH)</Label>
                <Input type="number" min="0" step="0.01" value={draft.montant_engage || ''} onChange={(e) => setDraft({ ...draft, montant_engage: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Réglé (DH)</Label>
                <Input type="number" min="0" step="0.01" value={draft.montant_regle || ''} onChange={(e) => setDraft({ ...draft, montant_regle: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Début</Label>
                <Input type="date" value={draft.date_debut ?? ''} onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })} />
              </div>
              <div>
                <Label>Fin prévue</Label>
                <Input type="date" value={draft.date_fin_prevue ?? ''} onChange={(e) => setDraft({ ...draft, date_fin_prevue: e.target.value })} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={draft.statut} onValueChange={(v) => setDraft({ ...draft, statut: v as TravauxStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUT_META) as TravauxStatus[]).map((k) => (
                      <SelectItem key={k} value={k}>{STATUT_META[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
