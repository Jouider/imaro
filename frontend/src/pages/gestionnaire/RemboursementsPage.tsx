import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Undo2, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import {
  getResidences,
  getCoproprietaires,
  type Coproprietaire,
} from '@/services/gestionnaire.service'
import {
  getRemboursements,
  createRemboursement,
  updateRemboursement,
  deleteRemboursement,
  type Remboursement,
  type RemboursementMotif,
  type RemboursementStatus,
  type CreateRemboursementInput,
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

const STATUT_META: Record<RemboursementStatus, { label: string; cls: string }> =
  {
    demande: {
      label: 'Demandé',
      cls: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    approuve: {
      label: 'Approuvé',
      cls: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    paye: { label: 'Payé', cls: 'border-green-200 bg-green-50 text-green-700' },
    rejete: { label: 'Rejeté', cls: 'border-red-200 bg-red-50 text-red-700' },
  }

const MOTIF_LABEL: Record<RemboursementMotif, string> = {
  trop_percu: 'Trop-perçu',
  erreur_appel: "Erreur d'appel",
  indemnite: 'Indemnité',
  autre: 'Autre',
}

const empty = (residenceId: number): CreateRemboursementInput => ({
  residence_id: residenceId,
  coproprietaire_id: 0,
  coproprietaire_nom: '',
  motif: 'trop_percu',
  montant: 0,
  date_demande: new Date().toISOString().slice(0, 10),
  statut: 'demande',
})

export function RemboursementsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(
    null,
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Remboursement | null>(null)
  const [draft, setDraft] = useState<CreateRemboursementInput>(empty(0))

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const copropQ = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId!),
    enabled: !!residenceId,
  })

  const remboursementsQ = useQuery({
    queryKey: ['remboursements', residenceId],
    queryFn: () => getRemboursements(residenceId!),
    enabled: !!residenceId,
  })

  const createMut = useMutation({
    mutationFn: (input: CreateRemboursementInput) =>
      createRemboursement(residenceId!, input),
    onSuccess: () => {
      toast.success(t('gestionnaire.remboursements.toastCreated'))
      setModalOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['remboursements', residenceId],
      })
    },
  })
  const updateMut = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number
      patch: Partial<CreateRemboursementInput>
    }) => updateRemboursement(id, patch),
    onSuccess: () => {
      toast.success(t('gestionnaire.remboursements.toastUpdated'))
      setModalOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['remboursements', residenceId],
      })
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRemboursement(id),
    onSuccess: () => {
      toast.success(t('gestionnaire.remboursements.toastDeleted'))
      void queryClient.invalidateQueries({
        queryKey: ['remboursements', residenceId],
      })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setDraft(empty(residenceId ?? 0))
    setModalOpen(true)
  }
  const openEdit = (r: Remboursement) => {
    setEditing(r)
    setDraft({ ...r })
    setModalOpen(true)
  }
  const save = () => {
    if (!draft.coproprietaire_id) {
      toast.error(t('common.selectCopro'))
      return
    }
    if (draft.montant <= 0) {
      toast.error(t('common.amountPositive'))
      return
    }
    if (editing) updateMut.mutate({ id: editing.id, patch: draft })
    else createMut.mutate(draft)
  }

  const remboursements = remboursementsQ.data ?? []
  const totals = remboursements.reduce(
    (acc, r) => ({
      total: acc.total + r.montant,
      paye: acc.paye + (r.statut === 'paye' ? r.montant : 0),
      enAttente:
        acc.enAttente +
        (r.statut === 'demande' || r.statut === 'approuve' ? r.montant : 0),
    }),
    { total: 0, paye: 0, enAttente: 0 },
  )

  const coprops: Coproprietaire[] = copropQ.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <Undo2 className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.remboursements.title', {
              defaultValue: 'Remboursements',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.remboursements.subtitle')}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={openCreate}
          disabled={!residenceId}
        >
          <Plus className="size-4" />
          {t('gestionnaire.remboursements.newRemboursement')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">{t('common.residence')}</label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setPickedResidenceId(Number(v))}
        >
          <SelectTrigger className="w-72">
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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">
            {t('gestionnaire.remboursements.totalRequested')}
          </p>
          <p className="text-2xl font-bold tracking-tight">
            {fmt.format(totals.total)} DH
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">En attente</p>
          <p className="text-2xl font-bold tracking-tight text-amber-600">
            {fmt.format(totals.enAttente)} DH
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">
            {t('common.paye')}
          </p>
          <p className="text-2xl font-bold tracking-tight text-green-600">
            {fmt.format(totals.paye)} DH
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.coproprietaire')}</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead className="text-right">{t('common.amount')}</TableHead>
              <TableHead>Demande</TableHead>
              <TableHead>
                {t('gestionnaire.remboursements.colPaiement')}
              </TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remboursementsQ.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Chargement…
                </TableCell>
              </TableRow>
            ) : remboursements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t('gestionnaire.remboursements.emptyRow')}
                </TableCell>
              </TableRow>
            ) : (
              remboursements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{r.coproprietaire_nom}</div>
                    {r.lot_numero && (
                      <div className="font-mono text-[10px] text-muted-foreground">
                        Lot {r.lot_numero}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {MOTIF_LABEL[r.motif]}
                    {r.description && (
                      <div
                        className="text-[10px] text-muted-foreground line-clamp-1"
                        title={r.description}
                      >
                        {r.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {fmt.format(r.montant)} DH
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dt.format(new Date(r.date_demande))}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.date_paiement ? (
                      <div>
                        {dt.format(new Date(r.date_paiement))}
                        {r.mode_paiement && (
                          <div className="text-[10px]">{r.mode_paiement}</div>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', STATUT_META[r.statut].cls)}
                    >
                      {STATUT_META[r.statut].label}
                    </Badge>
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
                          if (
                            confirm(
                              `Supprimer le remboursement à ${r.coproprietaire_nom} ?`,
                            )
                          )
                            deleteMut.mutate(r.id)
                        }}
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('gestionnaire.remboursements.modalEdit')
                : t('gestionnaire.remboursements.newRemboursement')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t('common.coproprietaire')} *</Label>
              <Select
                value={
                  draft.coproprietaire_id ? String(draft.coproprietaire_id) : ''
                }
                onValueChange={(v) => {
                  const c = coprops.find((cp) => cp.id === Number(v))
                  if (c) {
                    setDraft({
                      ...draft,
                      coproprietaire_id: c.id,
                      coproprietaire_nom: c.name,
                      lot_numero: c.lot?.numero,
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectCopro')} />
                </SelectTrigger>
                <SelectContent>
                  {coprops.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} {c.lot ? `— Lot ${c.lot.numero}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Motif</Label>
                <Select
                  value={draft.motif}
                  onValueChange={(v) =>
                    setDraft({ ...draft, motif: v as RemboursementMotif })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MOTIF_LABEL) as RemboursementMotif[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {MOTIF_LABEL[k]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
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
              <Label>Description</Label>
              <Input
                value={draft.description ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="ex: Double versement appel Q1 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('gestionnaire.remboursements.dateDemande')}</Label>
                <Input
                  type="date"
                  value={draft.date_demande}
                  onChange={(e) =>
                    setDraft({ ...draft, date_demande: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('common.status')}</Label>
                <Select
                  value={draft.statut}
                  onValueChange={(v) =>
                    setDraft({ ...draft, statut: v as RemboursementStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUT_META) as RemboursementStatus[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {STATUT_META[k].label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.statut === 'paye' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('gestionnaire.remboursements.datePaiement')}</Label>
                  <Input
                    type="date"
                    value={draft.date_paiement ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, date_paiement: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select
                    value={draft.mode_paiement ?? ''}
                    onValueChange={(v) =>
                      setDraft({
                        ...draft,
                        mode_paiement: v as 'virement' | 'cheque' | 'especes',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="cheque">
                        {t('common.cheque')}
                      </SelectItem>
                      <SelectItem value="especes">
                        {t('common.especes')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={save}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
