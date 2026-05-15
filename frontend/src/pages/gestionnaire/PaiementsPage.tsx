import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, CreditCard, AlertCircle } from 'lucide-react'
import {
  getPaiements,
  getImpayes,
  storePaiement,
  type Paiement,
  type Impaye,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
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

type Tab = 'historique' | 'impayes'

const STATUT_STYLES: Record<string, string> = {
  payé: 'bg-green-100 text-green-800',
  paye: 'bg-green-100 text-green-800',
  partiel: 'bg-orange-100 text-orange-800',
  impayé: 'bg-red-100 text-red-800',
  impaye: 'bg-red-100 text-red-800',
}

const MODES = ['especes', 'virement', 'cheque', 'mobile'] as const

type PaiementForm = {
  appel_fonds_ligne_id: string
  montant: string
  date_paiement: string
  mode_paiement: string
  reference: string
  notes: string
}

const EMPTY_FORM: PaiementForm = {
  appel_fonds_ligne_id: '',
  montant: '',
  date_paiement: new Date().toISOString().slice(0, 10),
  mode_paiement: 'especes',
  reference: '',
  notes: '',
}

export function PaiementsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('historique')
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === '1')
  const [form, setForm] = useState<PaiementForm>(EMPTY_FORM)

  const { data: paiements = [], isLoading: loadingPaiements } = useQuery({
    queryKey: ['paiements'],
    queryFn: () => getPaiements(),
    enabled: activeTab === 'historique',
  })

  const { data: impayes = [], isLoading: loadingImpayes } = useQuery({
    queryKey: ['impayes'],
    queryFn: () => getImpayes(),
    enabled: activeTab === 'impayes',
  })

  const createMutation = useMutation({
    mutationFn: () =>
      storePaiement({
        appel_fonds_ligne_id: Number(form.appel_fonds_ligne_id),
        montant: Number(form.montant),
        date_paiement: form.date_paiement,
        mode_paiement: form.mode_paiement,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['paiements'] })
      void qc.invalidateQueries({ queryKey: ['impayes'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Paiement enregistré')
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  })

  // ── Paiements columns ─────────────────────────────────────────────────────

  const paiementsColumns: Column<Paiement>[] = [
    {
      key: 'date_paiement',
      header: t('gestionnaire.paiements.colDate'),
      sortable: true,
      renderCell: (r) => r.date_paiement?.slice(0, 10) ?? '—',
    },
    {
      key: 'coproprietaire',
      header: t('gestionnaire.paiements.colCoproprietaire'),
      renderCell: (r) => r.coproprietaire.name,
      sortable: true,
    },
    {
      key: 'lot',
      header: t('gestionnaire.paiements.colLot'),
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot.numero}</span>
      ),
    },
    {
      key: 'appel_fonds',
      header: t('gestionnaire.paiements.colAppel'),
      renderCell: (r) => (
        <span className="max-w-[160px] truncate text-sm">
          {r.appel_fonds.titre}
        </span>
      ),
    },
    {
      key: 'montant_paye',
      header: t('gestionnaire.paiements.colMontant'),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant_paye} />,
    },
    {
      key: 'mode_paiement',
      header: t('gestionnaire.paiements.colMode'),
      renderCell: (r) =>
        t(`gestionnaire.paiements.modes.${r.mode_paiement}`, {
          defaultValue: r.mode_paiement,
        }),
    },
    {
      key: 'statut',
      header: t('gestionnaire.paiements.colStatut'),
      renderCell: (r) => {
        const cls =
          STATUT_STYLES[r.statut] ?? 'bg-gray-100 text-gray-700'
        return (
          <Badge className={`${cls} hover:${cls} border-0`}>{r.statut}</Badge>
        )
      },
    },
  ]

  // ── Impayés columns ───────────────────────────────────────────────────────

  type ImpayeRow = Impaye & { _key: string }
  const impayeRows: ImpayeRow[] = impayes.map((imp, i) => ({
    ...imp,
    _key: `${imp.coproprietaire.id}-${i}`,
  }))

  const impayesColumns: Column<ImpayeRow>[] = [
    {
      key: 'coproprietaire',
      header: t('gestionnaire.paiements.colCoproprietaire'),
      sortable: true,
      renderCell: (r) => r.coproprietaire.name,
    },
    {
      key: 'lot',
      header: t('gestionnaire.paiements.colLot'),
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot.numero}</span>
      ),
    },
    {
      key: 'montant_du',
      header: t('gestionnaire.paiements.colMontantDu'),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant_du} />,
    },
    {
      key: 'montant_restant',
      header: t('gestionnaire.paiements.colRestant'),
      sortable: true,
      renderCell: (r) => (
        <MontantDisplay value={r.montant_restant} colorize />
      ),
    },
    {
      key: 'jours_retard',
      header: t('gestionnaire.paiements.colJoursRetard'),
      sortable: true,
      renderCell: (r) => (
        <span
          className={cn(
            'tabular-nums font-medium',
            r.jours_retard > 60
              ? 'text-red-600'
              : r.jours_retard > 30
                ? 'text-orange-600'
                : 'text-muted-foreground',
          )}
        >
          {r.jours_retard}j
        </span>
      ),
    },
  ]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'historique', label: t('gestionnaire.paiements.tabHistorique') },
    { key: 'impayes', label: t('gestionnaire.paiements.tabImpayes') },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.paiements.title')}
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="me-1.5 size-4" />
            {t('gestionnaire.paiements.newPaiement')}
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
          </button>
        ))}
      </div>

      {activeTab === 'historique' && (
        <DataTable
          data={paiements}
          columns={paiementsColumns}
          rowKey="id"
          isLoading={loadingPaiements}
          searchable
          exportable
          exportFilename="paiements"
          emptyIcon={<CreditCard className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.paiements.emptyHistorique')}
        />
      )}

      {activeTab === 'impayes' && (
        <DataTable
          data={impayeRows}
          columns={impayesColumns}
          rowKey="_key"
          isLoading={loadingImpayes}
          searchable
          exportable
          exportFilename="impayes"
          emptyIcon={<AlertCircle className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.paiements.emptyImpayes')}
        />
      )}

      {/* Register payment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('gestionnaire.paiements.newPaiement')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.paiements.form.appelLigne')}</Label>
              <Input
                type="number"
                value={form.appel_fonds_ligne_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    appel_fonds_ligne_id: e.target.value,
                  }))
                }
                placeholder="ID de la ligne d'appel de fonds"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.paiements.form.montant')}</Label>
                <Input
                  type="number"
                  value={form.montant}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, montant: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.paiements.form.date')}</Label>
                <Input
                  type="date"
                  value={form.date_paiement}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date_paiement: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('gestionnaire.paiements.form.mode')}</Label>
              <Select
                value={form.mode_paiement}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, mode_paiement: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`gestionnaire.paiements.modes.${m}`, {
                        defaultValue: m,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.paiements.form.reference')}</Label>
                <Input
                  value={form.reference}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reference: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.paiements.form.notes')}</Label>
                <Input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
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
              disabled={
                !form.appel_fonds_ligne_id ||
                !form.montant ||
                createMutation.isPending
              }
            >
              {createMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
