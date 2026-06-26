import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Wrench,
  XCircle,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Clock,
  ThumbsUp,
  Inbox,
  UserCheck,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  getTickets,
  updateTicket,
  closTicket,
  createTicket,
  assignTicket,
  getResidences,
  getLots,
  type Ticket,
  type Lot,
} from '@/services/gestionnaire.service'
import { getAppUsers } from '@/services/equipe.service'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { useResidenceStore } from '@/stores/residenceStore'
import { ResidenceFilter } from '@/components/shared'
import { Button } from '@/components/ui/button'
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

const CATEGORIES = [
  'plomberie',
  'electricite',
  'ascenseur',
  'proprete',
  'securite',
  'autre',
] as const

type StatutKey = (typeof STATUTS)[number]

// ─── Per-residence audit (KAN-43) ──────────────────────────────────────────────

type AuditRow = {
  residence_id: number
  residence: string
  total: number
  ouvert: number
  en_cours: number
  resolu: number
  clos: number
}

function buildAudit(tickets: Ticket[]): AuditRow[] {
  const map = new Map<number, AuditRow>()
  for (const t of tickets) {
    const row = map.get(t.residence.id) ?? {
      residence_id: t.residence.id,
      residence: t.residence.name,
      total: 0,
      ouvert: 0,
      en_cours: 0,
      resolu: 0,
      clos: 0,
    }
    row.total += 1
    row[t.statut] += 1
    map.set(t.residence.id, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

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
        <span className="font-mono text-xs text-[var(--color-imaro-primary)]">
          {ticket.reference}
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
      {ticket.assignee && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--color-imaro-primary)]">
          <UserCheck className="size-3 shrink-0" />
          <span className="truncate">{ticket.assignee.name}</span>
        </div>
      )}
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
            {t('gestionnaire.tickets.empty')}
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
// TicketsDashboard — KPIs + charts analytics (KAN-91)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  ouvert: '#e74c3c',
  en_cours: '#2980b9',
  resolu: '#27ae60',
  clos: '#95a5a6',
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#e74c3c',
  normal: '#f39c12',
  faible: '#95a5a6',
}

type TicketStats = {
  total: number
  byStatus: { name: string; key: string; value: number; color: string }[]
  byCategory: { name: string; value: number }[]
  byPriority: { name: string; key: string; value: number; color: string }[]
  byMonth: { month: string; value: number }[]
  avgResolutionDays: number | null
  satisfactionRate: number | null
  ratedCount: number
}

function computeStats(tickets: Ticket[]): TicketStats {
  const total = tickets.length

  const byStatus = STATUTS.map((key) => ({
    key,
    name:
      key === 'en_cours'
        ? 'En cours'
        : key.charAt(0).toUpperCase() + key.slice(1),
    value: tickets.filter((t) => t.statut === key).length,
    color: STATUS_COLORS[key],
  }))

  const catMap = new Map<string, number>()
  for (const t of tickets) {
    catMap.set(t.categorie, (catMap.get(t.categorie) ?? 0) + 1)
  }
  const byCategory = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  const byPriority = PRIORITES.map((key) => ({
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: tickets.filter((t) => t.priorite === key).length,
    color: PRIORITY_COLORS[key],
  }))

  const monthMap = new Map<string, number>()
  for (const t of tickets) {
    const m = t.created_at.slice(0, 7)
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1)
  }
  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, value]) => ({
      month: new Date(m + '-01').toLocaleDateString('fr-FR', {
        month: 'short',
        year: '2-digit',
      }),
      value,
    }))

  const resolved = tickets.filter(
    (t) =>
      (t.statut === 'resolu' || t.statut === 'clos') && t.closed_at !== null,
  )
  const avgResolutionDays =
    resolved.length > 0
      ? resolved.reduce((acc, t) => {
          const days =
            (new Date(t.closed_at!).getTime() -
              new Date(t.created_at).getTime()) /
            (1000 * 3600 * 24)
          return acc + days
        }, 0) / resolved.length
      : null

  const rated = tickets.filter((t) => t.rating)
  const satisfiedCount = rated.filter((t) => t.rating === 'satisfait').length
  const satisfactionRate =
    rated.length > 0 ? Math.round((satisfiedCount / rated.length) * 100) : null

  return {
    total,
    byStatus,
    byCategory,
    byPriority,
    byMonth,
    avgResolutionDays,
    satisfactionRate,
    ratedCount: rated.length,
  }
}

function KpiCard({
  title,
  value,
  sub,
  color,
  icon,
}: {
  title: string
  value: string | number
  sub?: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color + '20', color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold leading-tight" style={{ color }}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function TicketsDashboard({ tickets }: { tickets: Ticket[] }) {
  const { t } = useTranslation()
  const stats = computeStats(tickets)

  const active = stats.byStatus
    .filter((s) => s.key === 'ouvert' || s.key === 'en_cours')
    .reduce((acc, s) => acc + s.value, 0)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          title={t('gestionnaire.tickets.stats.total', {
            defaultValue: 'Total tickets',
          })}
          value={stats.total}
          color="#1b4f72"
          icon={<Wrench className="size-5" />}
        />
        <KpiCard
          title={t('gestionnaire.tickets.stats.active', {
            defaultValue: 'En cours / Ouverts',
          })}
          value={active}
          color="#e67e22"
          icon={<BarChart3 className="size-5" />}
        />
        <KpiCard
          title={t('gestionnaire.tickets.stats.avgResolution', {
            defaultValue: 'Délai moyen de résolution',
          })}
          value={
            stats.avgResolutionDays !== null
              ? `${stats.avgResolutionDays.toFixed(1)}j`
              : '—'
          }
          sub={
            stats.avgResolutionDays !== null
              ? t('gestionnaire.tickets.stats.days', { defaultValue: 'jours' })
              : t('gestionnaire.tickets.stats.noData', {
                  defaultValue: 'Aucun ticket clôturé',
                })
          }
          color="#27ae60"
          icon={<Clock className="size-5" />}
        />
        <KpiCard
          title={t('gestionnaire.tickets.stats.satisfaction', {
            defaultValue: 'Taux de satisfaction',
          })}
          value={
            stats.satisfactionRate !== null ? `${stats.satisfactionRate}%` : '—'
          }
          sub={
            stats.ratedCount > 0
              ? t('gestionnaire.tickets.stats.rated', {
                  defaultValue: '{{n}} avis',
                  n: stats.ratedCount,
                })
              : t('gestionnaire.tickets.stats.noRatings', {
                  defaultValue: 'Aucun avis',
                })
          }
          color="#9b59b6"
          icon={<ThumbsUp className="size-5" />}
        />
      </div>

      {/* Charts row 1: donut by status + bars by category */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Donut — by status */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">
            {t('gestionnaire.tickets.stats.byStatus', {
              defaultValue: 'Répartition par statut',
            })}
          </p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  dataKey="value"
                  innerRadius={34}
                  outerRadius={56}
                  paddingAngle={2}
                >
                  {stats.byStatus.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 text-xs">
              {stats.byStatus.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ms-auto font-semibold tabular-nums">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bars — by category */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">
            {t('gestionnaire.tickets.stats.byCategory', {
              defaultValue: 'Tickets par catégorie',
            })}
          </p>
          {stats.byCategory.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t('gestionnaire.tickets.empty')}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={stats.byCategory}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  cursor={{ fill: '#f8f9fa' }}
                />
                <Bar
                  dataKey="value"
                  fill="#1b4f72"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2: priority + monthly trend */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bars — by priority */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">
            {t('gestionnaire.tickets.stats.byPriority', {
              defaultValue: 'Répartition par priorité',
            })}
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={stats.byPriority}
              margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {stats.byPriority.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bars — monthly trend */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">
            {t('gestionnaire.tickets.stats.trend', {
              defaultValue: 'Tendance (6 derniers mois)',
            })}
          </p>
          {stats.byMonth.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t('gestionnaire.tickets.empty')}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={stats.byMonth}
                margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="value"
                  fill="#e67e22"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TicketsInbox — mes tickets assignés (KAN-88)
// ---------------------------------------------------------------------------

function TicketsInbox({
  tickets,
  currentUserId,
  onCardClick,
  t,
}: {
  tickets: Ticket[]
  currentUserId: number | null
  onCardClick: (ticket: Ticket) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const mine = currentUserId
    ? tickets.filter((t) => t.assignee?.id === currentUserId)
    : []

  if (mine.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
        <Inbox className="size-12 text-muted-foreground/30" />
        <p className="font-medium text-sm text-muted-foreground">
          {t('gestionnaire.tickets.inbox.empty', {
            defaultValue: 'Aucun ticket assigné',
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('gestionnaire.tickets.inbox.emptyHint', {
            defaultValue:
              'Les tickets qui vous sont assignés apparaîtront ici.',
          })}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {t('gestionnaire.tickets.inbox.count', {
          defaultValue: '{{n}} ticket(s) assigné(s)',
          n: mine.length,
        })}
      </p>
      {mine.map((ticket) => {
        const statusCls =
          STATUT_STYLES[ticket.statut] ?? 'bg-gray-100 text-gray-600'
        const priorityCls =
          PRIORITE_STYLES[ticket.priorite] ?? 'bg-gray-100 text-gray-600'
        return (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onCardClick(ticket)}
            className="w-full text-start rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-[var(--color-imaro-primary)] mb-0.5">
                  {ticket.reference}
                </p>
                <p className="text-sm font-medium line-clamp-1">
                  {ticket.description}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ticket.residence.name} · {ticket.categorie}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge className={`${statusCls} border-0 text-xs`}>
                  {t(`gestionnaire.tickets.statut.${ticket.statut}`, {
                    defaultValue: ticket.statut,
                  })}
                </Badge>
                <Badge className={`${priorityCls} border-0 text-[10px]`}>
                  {t(`gestionnaire.tickets.priorite.${ticket.priorite}`, {
                    defaultValue: ticket.priorite,
                  })}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TicketsAudit — réclamations par résidence (KAN-43)
// ---------------------------------------------------------------------------
function TicketsAudit({
  audit,
  t,
}: {
  audit: AuditRow[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  if (audit.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <BarChart3 className="size-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {t('gestionnaire.tickets.empty')}
        </p>
      </div>
    )
  }

  const maxTotal = audit[0].total
  const minTotal = audit[audit.length - 1].total
  // Only rank when there's an actual spread (more than one residence + not all tied).
  const showRank = audit.length > 1 && maxTotal !== minTotal

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b bg-muted/30 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 className="size-4 text-[var(--color-imaro-primary)]" />
          {t('gestionnaire.tickets.audit.title', {
            defaultValue: 'Réclamations par résidence',
          })}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('gestionnaire.tickets.audit.subtitle', {
            defaultValue:
              'Volume de tickets par immeuble — du plus sollicité au moins sollicité.',
          })}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-4 py-2 text-start font-medium">
              {t('gestionnaire.tickets.colResidence')}
            </th>
            <th className="px-3 py-2 text-center font-medium">
              {t('gestionnaire.tickets.audit.total', { defaultValue: 'Total' })}
            </th>
            <th className="px-3 py-2 text-center font-medium">
              {t('gestionnaire.tickets.statut.ouvert')}
            </th>
            <th className="px-3 py-2 text-center font-medium">
              {t('gestionnaire.tickets.statut.en_cours')}
            </th>
            <th className="px-3 py-2 text-center font-medium">
              {t('gestionnaire.tickets.statut.resolu')}
            </th>
            <th className="px-3 py-2 text-center font-medium">
              {t('gestionnaire.tickets.statut.clos')}
            </th>
          </tr>
        </thead>
        <tbody>
          {audit.map((row) => (
            <tr
              key={row.residence_id}
              className="border-b last:border-0 hover:bg-muted/20"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">
                <div className="flex items-center gap-2">
                  {row.residence}
                  {showRank && row.total === maxTotal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                      <TrendingUp className="size-3" />
                      {t('gestionnaire.tickets.audit.most', {
                        defaultValue: 'Le plus',
                      })}
                    </span>
                  )}
                  {showRank && row.total === minTotal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">
                      <TrendingDown className="size-3" />
                      {t('gestionnaire.tickets.audit.least', {
                        defaultValue: 'Le moins',
                      })}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-center font-bold text-[var(--color-imaro-primary)]">
                {row.total}
              </td>
              <td className="px-3 py-2.5 text-center text-red-600">
                {row.ouvert}
              </td>
              <td className="px-3 py-2.5 text-center text-blue-600">
                {row.en_cours}
              </td>
              <td className="px-3 py-2.5 text-center text-green-600">
                {row.resolu}
              </td>
              <td className="px-3 py-2.5 text-center text-muted-foreground">
                {row.clos}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [viewMode, setViewMode] = useState<
    'table' | 'kanban' | 'audit' | 'stats' | 'inbox'
  >('table')
  const [assigneeId, setAssigneeId] = useState<string>('')

  const currentUser = useAuthStore((s) => s.user)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    residence_id: '',
    lot_id: '',
    categorie: 'plomberie',
    priorite: 'normal' as Ticket['priorite'],
    description: '',
  })

  const residenceId = useResidenceStore((s) => s.residenceId)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', filterStatut, filterPriorite],
    queryFn: () =>
      getTickets({
        statut: filterStatut !== 'all' ? filterStatut : undefined,
        priorite: filterPriorite !== 'all' ? filterPriorite : undefined,
      }),
  })

  // Global residence scope (KAN-47): null = all residences.
  const scopedTickets =
    residenceId === null
      ? tickets
      : tickets.filter((t) => t.residence.id === residenceId)

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const { data: lotsData } = useQuery({
    queryKey: ['lots', createForm.residence_id],
    queryFn: () => getLots(Number(createForm.residence_id)),
    enabled: createOpen && !!createForm.residence_id,
  })
  const lots: Lot[] = lotsData?.lots ?? []

  const { data: allUsers = [] } = useQuery({
    queryKey: ['app-users'],
    queryFn: getAppUsers,
  })
  const gestionnaires = allUsers.filter(
    (u) => u.role === 'gestionnaire' && u.statut === 'actif',
  )

  // Audit reflects the active residence scope (KAN-43 + KAN-47).
  const audit = buildAudit(scopedTickets)

  const createMutation = useMutation({
    mutationFn: () =>
      createTicket({
        residence_id: Number(createForm.residence_id),
        lot_id: Number(createForm.lot_id),
        categorie: createForm.categorie,
        priorite: createForm.priorite,
        description: createForm.description.trim(),
      }),
    onSuccess: (ticket) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      setCreateOpen(false)
      setCreateForm({
        residence_id: '',
        lot_id: '',
        categorie: 'plomberie',
        priorite: 'normal',
        description: '',
      })
      toast.success(
        t('gestionnaire.tickets.createSuccess', {
          defaultValue: 'Ticket créé',
          ref: ticket.reference,
        }),
      )
    },
    onError: () => toast.error(t('common.createError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      updateTicket(id, { statut }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      setDetailTicket(null)
      toast.success(t('gestionnaire.tickets.updateSuccess'))
    },
    onError: () => toast.error(t('common.updateError')),
  })

  const closeMutation = useMutation({
    mutationFn: (id: number) => closTicket(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      setCloseTarget(null)
      setDetailTicket(null)
      toast.success(t('gestionnaire.tickets.closeSuccess'))
    },
    onError: () => toast.error(t('gestionnaire.tickets.toastClotureError')),
  })

  const assignMut = useMutation({
    mutationFn: ({
      id,
      gestionnaireId,
    }: {
      id: number
      gestionnaireId: number | null
    }) => assignTicket(id, gestionnaireId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(
        t('gestionnaire.tickets.assignSuccess', {
          defaultValue: 'Ticket assigné',
        }),
      )
    },
    onError: () => toast.error(t('common.updateError')),
  })

  function openDetail(ticket: Ticket) {
    setDetailTicket(ticket)
    setNewStatut(ticket.statut)
    setAssigneeId(ticket.assignee ? String(ticket.assignee.id) : '')
  }

  const columns: Column<Ticket>[] = [
    {
      key: 'reference',
      header: t('gestionnaire.tickets.colRef'),
      sortable: true,
      renderCell: (r) => (
        <span className="font-mono text-xs font-medium text-[var(--color-imaro-primary)]">
          {r.reference}
        </span>
      ),
      className: 'w-32',
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
      key: 'assignee',
      header: t('gestionnaire.tickets.colAssignee', {
        defaultValue: 'Assigné à',
      }),
      renderCell: (r) =>
        r.assignee ? (
          <span className="flex items-center gap-1 text-xs text-[var(--color-imaro-primary)]">
            <UserCheck className="size-3 shrink-0" />
            {r.assignee.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
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
        actions={
          <div className="flex items-center gap-2">
            <ResidenceFilter />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.tickets.create', {
                defaultValue: 'Nouveau ticket',
              })}
            </Button>
          </div>
        }
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
          <button
            type="button"
            aria-label={t('gestionnaire.tickets.audit.tab', {
              defaultValue: 'Audit par résidence',
            })}
            onClick={() => setViewMode('audit')}
            className={cn(
              'flex items-center justify-center px-2.5 py-1.5 transition-colors',
              viewMode === 'audit'
                ? 'bg-[var(--color-imaro-primary)] text-white'
                : 'bg-white text-muted-foreground hover:bg-muted',
            )}
          >
            <BarChart3 className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('gestionnaire.tickets.stats.tab', {
              defaultValue: 'Statistiques',
            })}
            onClick={() => setViewMode('stats')}
            className={cn(
              'flex items-center justify-center px-2.5 py-1.5 transition-colors',
              viewMode === 'stats'
                ? 'bg-[var(--color-imaro-primary)] text-white'
                : 'bg-white text-muted-foreground hover:bg-muted',
            )}
          >
            <PieIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('gestionnaire.tickets.inbox.tab', {
              defaultValue: 'Mes tickets',
            })}
            onClick={() => setViewMode('inbox')}
            className={cn(
              'flex items-center justify-center px-2.5 py-1.5 transition-colors',
              viewMode === 'inbox'
                ? 'bg-[var(--color-imaro-primary)] text-white'
                : 'bg-white text-muted-foreground hover:bg-muted',
            )}
          >
            <Inbox className="size-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      {viewMode === 'stats' ? (
        <TicketsDashboard tickets={scopedTickets} />
      ) : viewMode === 'inbox' ? (
        <TicketsInbox
          tickets={scopedTickets}
          currentUserId={currentUser?.id ?? null}
          onCardClick={openDetail}
          t={t}
        />
      ) : viewMode === 'audit' ? (
        <TicketsAudit audit={audit} t={t} />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tickets={scopedTickets}
          onCardClick={openDetail}
          onMove={(id, statut) => updateMutation.mutate({ id, statut })}
        />
      ) : (
        <DataTable
          data={scopedTickets}
          columns={columns}
          rowKey="id"
          isLoading={isLoading}
          searchable
          emptyIcon={<Wrench className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.tickets.empty')}
          emptyDescription={t('gestionnaire.tickets.emptyDesc')}
        />
      )}

      {/* Create ticket dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setCreateForm((f) => ({ ...f, lot_id: '' }))
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('gestionnaire.tickets.create', {
                defaultValue: 'Nouveau ticket',
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('common.residence')}</Label>
                <Select
                  value={createForm.residence_id}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({
                      ...f,
                      residence_id: v,
                      lot_id: '',
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('common.selectResidence')} />
                  </SelectTrigger>
                  <SelectContent>
                    {residences.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  {t('gestionnaire.tickets.form.lot', { defaultValue: 'Lot' })}
                </Label>
                <Select
                  value={createForm.lot_id}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, lot_id: v }))
                  }
                  disabled={!createForm.residence_id || lots.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t('gestionnaire.tickets.form.selectLot', {
                        defaultValue: 'Lot',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.numero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  {t('gestionnaire.tickets.form.categorie', {
                    defaultValue: 'Catégorie',
                  })}
                </Label>
                <Select
                  value={createForm.categorie}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, categorie: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`gestionnaire.tickets.categories.${c}`, {
                          defaultValue: c,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.tickets.colPriorite')}</Label>
                <Select
                  value={createForm.priorite}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({
                      ...f,
                      priorite: v as Ticket['priorite'],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`gestionnaire.tickets.priorite.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ticket-desc">
                {t('gestionnaire.tickets.colTitre')}
              </Label>
              <textarea
                id="ticket-desc"
                rows={3}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={t('gestionnaire.tickets.form.descPlaceholder', {
                  defaultValue: 'Décrivez le problème…',
                })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/10 dark:bg-card"
              />
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
                !createForm.residence_id ||
                !createForm.lot_id ||
                !createForm.description.trim() ||
                createForm.description.trim().length < 10 ||
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

      {/* Ticket detail dialog */}
      <Dialog
        open={!!detailTicket}
        onOpenChange={(open) => !open && setDetailTicket(null)}
      >
        {detailTicket && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-[var(--color-imaro-primary)]">
                  {detailTicket.reference}
                </span>
                <span className="capitalize">{detailTicket.categorie}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t('common.residence')}
                  </p>
                  <p>{detailTicket.residence.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t('common.lot')}
                  </p>
                  <p className="font-mono">{detailTicket.lot.numero}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t('common.coproprietaire')}
                  </p>
                  <p>{detailTicket.user.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t('common.date')}
                  </p>
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

              {/* Assignation — KAN-88 */}
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <UserCheck className="size-3.5" />
                  {t('gestionnaire.tickets.assignTo', {
                    defaultValue: 'Assigner à',
                  })}
                </p>
                <div className="flex gap-2">
                  <Select
                    value={assigneeId}
                    onValueChange={setAssigneeId}
                    disabled={assignMut.isPending}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={t(
                          'gestionnaire.tickets.assignPlaceholder',
                          {
                            defaultValue: 'Sélectionner un gestionnaire',
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        {t('gestionnaire.tickets.unassigned', {
                          defaultValue: 'Non assigné',
                        })}
                      </SelectItem>
                      {gestionnaires.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      assignMut.isPending ||
                      assigneeId ===
                        (detailTicket.assignee
                          ? String(detailTicket.assignee.id)
                          : 'unassigned') ||
                      assigneeId === ''
                    }
                    onClick={() =>
                      assignMut.mutate({
                        id: detailTicket.id,
                        gestionnaireId:
                          assigneeId === 'unassigned'
                            ? null
                            : Number(assigneeId),
                      })
                    }
                  >
                    {assignMut.isPending
                      ? t('actions.loading')
                      : t('actions.save')}
                  </Button>
                </div>
              </div>
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
