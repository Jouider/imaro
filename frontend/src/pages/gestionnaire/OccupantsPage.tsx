import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserCheck, Plus, Pencil, Trash2, Home, KeyRound, AlertCircle,
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
import { getResidences, getLots } from '@/services/gestionnaire.service'
import {
  getOccupantsByResidence, createOccupant, updateOccupant, deleteOccupant,
  type Occupant, type OccupantType, type CreateOccupantInput,
} from '@/services/conformite.service'

const TYPE_META: Record<OccupantType, { label: string; cls: string; icon: typeof Home }> = {
  proprietaire_occupant: { label: 'Propriétaire occupant', cls: 'border-[#1B4F72]/30 bg-[#1B4F72]/5 text-[#1B4F72]', icon: Home },
  locataire:             { label: 'Locataire',              cls: 'border-amber-200 bg-amber-50 text-amber-700',     icon: KeyRound },
  usufruitier:           { label: 'Usufruitier',            cls: 'border-purple-200 bg-purple-50 text-purple-700',  icon: UserCheck },
  autre:                 { label: 'Autre',                  cls: 'border-gray-200 bg-gray-50 text-gray-700',        icon: UserCheck },
}

const dt = new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function OccupantsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Occupant | null>(null)
  const [draft, setDraft] = useState<CreateOccupantInput>({
    lot_id: 0, nom: '', telephone: '', email: '', type: 'locataire',
    date_debut: new Date().toISOString().slice(0, 10), date_fin: '',
  })

  const residencesQ = useQuery({ queryKey: ['residences'], queryFn: () => getResidences() })

  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const occupantsQ = useQuery({
    queryKey: ['occupants', residenceId],
    queryFn: () => getOccupantsByResidence(residenceId!),
    enabled: !!residenceId,
  })

  const lotsQ = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(residenceId!),
    enabled: !!residenceId,
  })

  const lots = lotsQ.data?.lots ?? []

  const createMut = useMutation({
    mutationFn: ({ lotId, input }: { lotId: number; input: CreateOccupantInput }) =>
      createOccupant(lotId, input),
    onSuccess: () => {
      toast.success('Occupant ajouté')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['occupants', residenceId] })
    },
    onError: () => toast.error('Échec de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CreateOccupantInput> }) =>
      updateOccupant(id, patch),
    onSuccess: () => {
      toast.success('Occupant mis à jour')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['occupants', residenceId] })
    },
    onError: () => toast.error('Échec de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteOccupant(id),
    onSuccess: () => {
      toast.success('Occupant supprimé')
      void queryClient.invalidateQueries({ queryKey: ['occupants', residenceId] })
    },
    onError: () => toast.error('Échec de la suppression'),
  })

  const openCreateModal = () => {
    setEditing(null)
    setDraft({
      lot_id: lots[0]?.id ?? 0,
      nom: '', telephone: '', email: '', type: 'locataire',
      date_debut: new Date().toISOString().slice(0, 10),
      date_fin: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (o: Occupant) => {
    setEditing(o)
    setDraft({
      lot_id: o.lot_id,
      coproprietaire_id: o.coproprietaire_id,
      nom: o.nom,
      telephone: o.telephone ?? '',
      email: o.email ?? '',
      type: o.type,
      date_debut: o.date_debut,
      date_fin: o.date_fin ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!draft.nom.trim()) { toast.error('Nom requis'); return }
    if (!draft.lot_id)     { toast.error('Lot requis'); return }
    // Strip empty date_fin
    const cleaned = { ...draft, date_fin: draft.date_fin || undefined }
    if (editing) updateMut.mutate({ id: editing.id, patch: cleaned })
    else createMut.mutate({ lotId: draft.lot_id, input: cleaned })
  }

  const occupants = occupantsQ.data ?? []
  const byType = {
    proprietaire_occupant: occupants.filter((o) => o.type === 'proprietaire_occupant').length,
    locataire:             occupants.filter((o) => o.type === 'locataire').length,
    other:                 occupants.filter((o) => o.type === 'usufruitier' || o.type === 'autre').length,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#1B4F72]/10">
          <UserCheck className="size-5 text-[#1B4F72]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.occupants.title', { defaultValue: 'Occupants' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.occupants.subtitle', {
              defaultValue: 'Registre des occupants par lot — propriétaires, locataires, usufruitiers',
            })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreateModal} disabled={lots.length === 0}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      {/* Residence selector */}
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

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Home className="size-4 text-[#1B4F72]" />
            <p className="text-xs text-muted-foreground">Propriétaires occupants</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{byType.proprietaire_occupant}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <KeyRound className="size-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">Locataires</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{byType.locataire}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <UserCheck className="size-4 text-purple-600" />
            <p className="text-xs text-muted-foreground">Usufruitiers / autres</p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{byType.other}</p>
        </div>
      </div>

      {/* Legal note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Art. 11 Loi 18-00</strong> — Le registre des occupants doit être à jour pour
          la convocation des AG et la communication des charges. Un seul «propriétaire occupant»
          actif par lot à la fois.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot</TableHead>
              <TableHead>Nom complet</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {occupantsQ.isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : occupants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Aucun occupant enregistré.</TableCell></TableRow>
            ) : (
              occupants.map((o) => {
                const meta = TYPE_META[o.type]
                const lot = lots.find((l) => l.id === o.lot_id)
                const Icon = meta.icon
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{lot?.numero ?? `Lot #${o.lot_id}`}</TableCell>
                    <TableCell className="text-sm font-medium">{o.nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] gap-1', meta.cls)}>
                        <Icon className="size-3" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{o.telephone ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dt.format(new Date(o.date_debut))}
                      {o.date_fin && <> → {dt.format(new Date(o.date_fin))}</>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditModal(o)} title="Modifier">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="size-7"
                          onClick={() => {
                            if (confirm(`Supprimer l'occupant « ${o.nom} » ?`)) deleteMut.mutate(o.id)
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier un occupant' : 'Ajouter un occupant'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="lot">Lot</Label>
              <Select
                value={String(draft.lot_id || '')}
                onValueChange={(v) => setDraft({ ...draft, lot_id: Number(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Choisir un lot" /></SelectTrigger>
                <SelectContent>
                  {lots.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.numero} — {l.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nom">Nom complet *</Label>
              <Input id="nom" value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tel">Téléphone</Label>
                <Input id="tel" value={draft.telephone} onChange={(e) => setDraft({ ...draft, telephone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as OccupantType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as OccupantType[]).map((k) => (
                    <SelectItem key={k} value={k}>{TYPE_META[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="debut">Date de début</Label>
                <Input id="debut" type="date" value={draft.date_debut} onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="fin">Date de fin (optionnelle)</Label>
                <Input id="fin" type="date" value={draft.date_fin ?? ''} onChange={(e) => setDraft({ ...draft, date_fin: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
