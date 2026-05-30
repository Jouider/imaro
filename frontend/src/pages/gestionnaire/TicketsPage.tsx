import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Wrench, XCircle, ChevronDown, LayoutGrid, List } from 'lucide-react'
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

const STATUT_DOT: Record<string, string> = {
  ouvert: 'bg-red-500',
  en_cours: 'bg-blue-500',
  resolu: 'bg-green-500',
  clos: 'bg-gray-400',
}

const PRIORITE_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  normal: 'bg-yellow-100 text-yellow-800',
  faible: 'bg-gray-100 text-gray-600',
}

const STATUTS = ['ouvert', 'en_cours', 'resolu', 'clos'] as const
const PRIORITES = ['urgent', 'normal', 'faible'] as const

type StatutKey = (typeof STATUTS)[number]

// ---------------------------------------------------------------------------
// KanbanCard
// ---------------------------------------------------------------------------
interface KanbanCardProps {
  ticket: Ticket
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: number) => void
  onClick: (ticket: Ticket) => void
}

function KanbanCard({ ticket, onDragStart, onClick }: KanbanCardProps) {
  const { t } = useTranslation()
  const isClos = ticket.statut === 'clos'
  const priorityCls =
    PRIORITE_STYLES[ticket.priorite] ?? 'bg-gray-100 text-gray-600'

  return (
    <div
      draggable={!isClos}
      onDragStart={isClos ? undefined : (e) => onDragStart(e, ticket.id)}
      onClick={() => onClick(ticket)}
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm transition-shadow',
        isClos
          ? 'cursor-default opacity-70'
          : 'cursor-grab hover:shadow-md active:cursor-grabbing',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          #{ticket.id}
        </span>
        <Badge
          className={`${priorityCls} hover:${priorityCls} border-0 text-[10px]`}
        >
          {t(`gestionnaire.tickets.priorite.${ticket.priorite}`, {
            defaultValue: ticket.priorite,
          })}
        </Badge>
      </div>
      <p className="mb-2 line-clamp-2 text-sm leading-snug">
        {ticket.description}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[110px]">{ticket.residence.name}</span>
        <span>{ticket.created_at.slice(0, 10)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------
interface KanbanColumnProps {
  statut: StatutKey
  tickets: Ticket[]
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: number) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, statut: StatutKey) => void
  onCardClick: (ticket: Ticket) => void
}

function KanbanColumn({
  statut,
  tickets,
  onDragStart,
  onDrop,
  onCardClick,
}: KanbanColumnProps) {
  const { t } = useTranslation()
  const [isOver, setIsOver] = useState(false)

  const headerBadgeCls = STATUT_STYLES[statut] ?? 'bg-gray-100 text-gray-600'
  const dotCls = STATUT_DOT[statut] ?? 'bg-gray-400'

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsOver(true)
  }

  function handleDragLeave() {
    setIsOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    setIsOver(false)
    onDrop(e, statut)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex min-w-[220px] flex-col rounded-xl border bg-muted/30 p-3 transition-colors',
        isOver && 'border-[var(--color-imaro-primary)] bg-blue-50/40',
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('size-2 shrink-0 rounded-full', dotCls)} />
        <span className="text-sm font-semibold capitalize">
          {t(`gestionnaire.tickets.statut.${statut}`, { defaultValue: statut })}
        </span>
        <Badge
          className={cn(
            headerBadgeCls,
            'ms-auto border-0 text-xs tabular-nums',
          )}
        >
          {tickets.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {tickets.map((ticket) => (
          <KanbanCard
            key={ticket.id}
            ticket={ticket}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}
        {tickets.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Aucun ticket
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------
interface KanbanBoardProps {
  tickets: Ticket[]
  onCardClick: (ticket: Ticket) => void
  onMove: (id: number, statut: string) => void
}

function KanbanBoard({ tickets, onCardClick, onMove }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<number | null>(null)

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: number) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    targetStatut: StatutKey,
  ) {
    e.preventDefault()
    if (dragId === null) return
    const ticket = tickets.find((t) => t.id === dragId)
    if (!ticket) return
    if (ticket.statut !== targetStatut) {
      onMove(dragId, targetStatut)
    }
    setDragId(null)
  }

  const byStatut = (statut: StatutKey) =>
    tickets.filter((t) => t.statut === statut)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[880px] grid-cols-4 gap-4">
        {STATUTS.map((statut) => (
          <KanbanColumn
            key={statut}
            statut={statut}
            tickets={byStatut(statut)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TicketsPage
// ---------------------------------------------------------------------------
export function TicketsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterPriorite, setFilterPriorite] = useState<string>('all')
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null)
  const [closeTarget, setCloseTarget] = useState<Ticket | null>(null)
  const [newStatut, setNewStatut] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

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
        <span className="font-mono text-sm text-muted-foreground">#{r.id}</span>
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
        const cls = PRIORITE_STYLES[r.priorite] ?? 'bg-gray-100 text-gray-600'
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
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.tickets.title')}
        subtitle={t('gestionnaire.tickets.subtitle')}
      />

      {/* Filters + view toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('gestionnaire.tickets.filterAll')}
            </SelectItem>
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
            <SelectItem value="all">
              {t('gestionnaire.tickets.filterAll')}
            </SelectItem>
            {PRIORITES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`gestionnaire.tickets.priorite.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View mode toggle — pushed to the right */}
        <div className="ms-auto flex overflow-hidden rounded-md border">
          <button
            type="button"
            aria-label="Vue tableau"
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center justify-center px-2.5 py-1.5 transition-colors',
              viewMode === 'table'
                ? 'bg-[var(--color-imaro-primary)] text-white'
                : 'bg-white text-muted-foreground hover:bg-muted',
            )}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Vue kanban"
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex items-center justify-center px-2.5 py-1.5 transition-colors',
              viewMode === 'kanban'
                ? 'bg-[var(--color-imaro-primary)] text-white'
                : 'bg-white text-muted-foreground hover:bg-muted',
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          tickets={tickets}
          onCardClick={openDetail}
          onMove={(id, statut) => updateMutation.mutate({ id, statut })}
        />
      ) : (
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
      )}

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
                  {t(`gestionnaire.tickets.priorite.${detailTicket.priorite}`, {
                    defaultValue: detailTicket.priorite,
                  })}
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
                  <Select value={newStatut} onValueChange={setNewStatut}>
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
