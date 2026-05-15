import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Wrench, XCircle, ChevronDown } from 'lucide-react'
import {
  getTickets,
  updateTicket,
  closTicket,
  type Ticket,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/ui/button'
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
  ouvert: 'bg-red-100 text-red-800',
  en_cours: 'bg-blue-100 text-blue-800',
  resolu: 'bg-green-100 text-green-800',
  clos: 'bg-gray-100 text-gray-600',
}

const PRIORITE_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  normal: 'bg-yellow-100 text-yellow-800',
  faible: 'bg-gray-100 text-gray-600',
}

const STATUTS = ['ouvert', 'en_cours', 'resolu', 'clos'] as const
const PRIORITES = ['urgent', 'normal', 'faible'] as const

export function TicketsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterPriorite, setFilterPriorite] = useState<string>('all')
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null)
  const [closeTarget, setCloseTarget] = useState<Ticket | null>(null)
  const [newStatut, setNewStatut] = useState<string>('')

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', filterStatut, filterPriorite],
    queryFn: () =>
      getTickets({
        statut: filterStatut !== 'all' ? filterStatut : undefined,
        priorite: filterPriorite !== 'all' ? filterPriorite : undefined,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      updateTicket(id, { statut }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      setDetailTicket(null)
      toast.success(t('gestionnaire.tickets.updateSuccess'))
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const closeMutation = useMutation({
    mutationFn: (id: number) => closTicket(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      setCloseTarget(null)
      setDetailTicket(null)
      toast.success(t('gestionnaire.tickets.closeSuccess'))
    },
    onError: () => toast.error('Erreur lors de la clôture'),
  })

  function openDetail(ticket: Ticket) {
    setDetailTicket(ticket)
    setNewStatut(ticket.statut)
  }

  const columns: Column<Ticket>[] = [
    {
      key: 'id',
      header: t('gestionnaire.tickets.colRef'),
      renderCell: (r) => (
        <span className="font-mono text-sm text-muted-foreground">
          #{r.id}
        </span>
      ),
      className: 'w-16',
    },
    {
      key: 'description',
      header: t('gestionnaire.tickets.colTitre'),
      renderCell: (r) => (
        <span className="line-clamp-2 max-w-[240px] text-sm">
          {r.description}
        </span>
      ),
    },
    {
      key: 'residence',
      header: t('gestionnaire.tickets.colResidence'),
      renderCell: (r) => r.residence.name,
    },
    {
      key: 'priorite',
      header: t('gestionnaire.tickets.colPriorite'),
      renderCell: (r) => {
        const cls =
          PRIORITE_STYLES[r.priorite] ?? 'bg-gray-100 text-gray-600'
        return (
          <Badge className={`${cls} hover:${cls} border-0`}>
            {t(`gestionnaire.tickets.priorite.${r.priorite}`, {
              defaultValue: r.priorite,
            })}
          </Badge>
        )
      },
    },
    {
      key: 'statut',
      header: t('gestionnaire.tickets.colStatut'),
      renderCell: (r) => {
        const cls = STATUT_STYLES[r.statut] ?? 'bg-gray-100 text-gray-600'
        return (
          <Badge className={`${cls} hover:${cls} border-0`}>
            {t(`gestionnaire.tickets.statut.${r.statut}`, {
              defaultValue: r.statut,
            })}
          </Badge>
        )
      },
    },
    {
      key: 'created_at',
      header: t('gestionnaire.tickets.colDate'),
      sortable: true,
      renderCell: (r) => r.created_at.slice(0, 10),
    },
    {
      key: 'categorie',
      header: '',
      className: 'w-20 text-right',
      renderCell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetail(r)}
          className="gap-1"
        >
          Voir <ChevronDown className="size-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.tickets.title')}
        subtitle={t('gestionnaire.tickets.subtitle')}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('gestionnaire.tickets.filterAll')}</SelectItem>
            {STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`gestionnaire.tickets.statut.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriorite} onValueChange={setFilterPriorite}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('gestionnaire.tickets.filterAll')}</SelectItem>
            {PRIORITES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`gestionnaire.tickets.priorite.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={tickets}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        searchable
        emptyIcon={<Wrench className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.tickets.empty')}
        emptyDescription={t('gestionnaire.tickets.emptyDesc')}
      />

      {/* Ticket detail dialog */}
      <Dialog
        open={!!detailTicket}
        onOpenChange={(open) => !open && setDetailTicket(null)}
      >
        {detailTicket && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  #{detailTicket.id}
                </span>
                <span className="capitalize">{detailTicket.categorie}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Résidence</p>
                  <p>{detailTicket.residence.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Lot</p>
                  <p className="font-mono">{detailTicket.lot.numero}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">
                    Copropriétaire
                  </p>
                  <p>{detailTicket.user.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Date</p>
                  <p>{detailTicket.created_at.slice(0, 10)}</p>
                </div>
              </div>

              {/* Priorité & statut badges */}
              <div className="flex gap-2">
                <Badge
                  className={cn(
                    PRIORITE_STYLES[detailTicket.priorite] ??
                      'bg-gray-100 text-gray-600',
                    'border-0',
                  )}
                >
                  {t(
                    `gestionnaire.tickets.priorite.${detailTicket.priorite}`,
                    { defaultValue: detailTicket.priorite },
                  )}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="rounded-md border bg-muted/30 p-3 text-sm">
                  {detailTicket.description}
                </p>
              </div>

              {/* Photos */}
              {detailTicket.images && detailTicket.images.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {t('gestionnaire.tickets.images')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detailTicket.images.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="h-20 w-20 rounded-md object-cover border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('gestionnaire.tickets.noImages')}
                </p>
              )}

              {/* Statut selector (only if not closed) */}
              {detailTicket.statut !== 'clos' && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {t('gestionnaire.tickets.colStatut')}
                  </p>
                  <Select
                    value={newStatut}
                    onValueChange={setNewStatut}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS.filter((s) => s !== 'clos').map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`gestionnaire.tickets.statut.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row gap-2">
              {detailTicket.statut !== 'clos' && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setCloseTarget(detailTicket)
                  }}
                >
                  <XCircle className="me-1.5 size-4" />
                  {t('gestionnaire.tickets.closeTicket')}
                </Button>
              )}
              {detailTicket.statut !== 'clos' && (
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      id: detailTicket.id,
                      statut: newStatut,
                    })
                  }
                  disabled={
                    newStatut === detailTicket.statut ||
                    updateMutation.isPending
                  }
                >
                  {updateMutation.isPending
                    ? t('actions.loading')
                    : t('actions.save')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Close ticket confirmation */}
      <ConfirmModal
        open={!!closeTarget}
        onOpenChange={(open) => !open && setCloseTarget(null)}
        title={t('gestionnaire.tickets.closeConfirm')}
        description={t('gestionnaire.tickets.closeDesc')}
        confirmLabel={t('gestionnaire.tickets.closeTicket')}
        onConfirm={() => closeTarget && closeMutation.mutate(closeTarget.id)}
        isLoading={closeMutation.isPending}
      />
    </div>
  )
}
