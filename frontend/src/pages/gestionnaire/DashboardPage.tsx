import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  FilePlus,
  CreditCard,
  Wrench,
  CalendarPlus,
  CalendarDays,
  Droplets,
  ShieldAlert,
  Zap,
  // Sprint 4-8 modules
  Sparkles,
  Scale,
  Landmark,
  CalendarCheck,
  ClipboardCheck,
  ArrowRight,
  UserCheck,
  HardHat,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { KpiCard, LoadingSkeleton, EmptyState } from '@/components/shared'
import { useAuthStore } from '@/stores/authStore'
import {
  getDashboard,
  getRecouvrementMensuel,
  getResidences,
  type DashboardTopImpaye,
  type DashboardTicketUrgent,
  type DashboardAssemblee,
} from '@/services/gestionnaire.service'
import { formatMontant } from '@/lib/utils'
import { AI_FEATURES_ENABLED } from '@/lib/features'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'il y a 1j'
  return `il y a ${diff}j`
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getCategorieIcon(categorie: string) {
  const lower = categorie.toLowerCase()
  if (lower.includes('plomb') || lower.includes('eau'))
    return <Droplets className="size-4 shrink-0 text-blue-500" />
  if (lower.includes('élec') || lower.includes('elec'))
    return <Zap className="size-4 shrink-0 text-yellow-500" />
  if (lower.includes('sécur') || lower.includes('secur'))
    return <ShieldAlert className="size-4 shrink-0 text-red-500" />
  return (
    <Wrench className="size-4 shrink-0 text-[var(--color-imaro-text-muted)]" />
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type ImpayeRowProps = { impaye: DashboardTopImpaye }

function ImpayeRow({ impaye }: ImpayeRowProps) {
  const { t } = useTranslation()
  const { jours, coproprietaire, lot, montant } = impaye

  const badgeClass =
    jours > 60
      ? 'bg-[var(--color-imaro-danger)]/10 text-[var(--color-imaro-danger)]'
      : jours > 30
        ? 'bg-[var(--color-imaro-warning)]/10 text-[var(--color-imaro-warning)]'
        : 'bg-muted text-muted-foreground'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0 dark:border-border">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-imaro-danger)]/10 text-xs font-semibold text-[var(--color-imaro-danger)]">
        {getInitials(coproprietaire.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-imaro-text)] dark:text-foreground">
          {coproprietaire.name}
        </p>
        <p className="text-xs text-muted-foreground">Lot {lot}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-semibold text-[var(--color-imaro-danger)]">
          {formatMontant(montant)}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {t('gestionnaire.dashboard.topImpayes.jours', { n: jours })}
        </span>
      </div>
    </div>
  )
}

type TicketRowProps = { ticket: DashboardTicketUrgent }

function TicketRow({ ticket }: TicketRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0 dark:border-border">
      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-imaro-danger)]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {getCategorieIcon(ticket.titre)}
          <p className="truncate text-sm font-medium text-[var(--color-imaro-text)] dark:text-foreground">
            {ticket.titre}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ticket.residence.name}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {relativeDate(ticket.created_at)}
      </span>
    </div>
  )
}

type AgRowProps = { ag: DashboardAssemblee }

function AgRow({ ag }: AgRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0 dark:border-border">
      <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--color-imaro-primary)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-imaro-text)] dark:text-foreground">
          {ag.titre}
        </p>
        <p className="text-xs text-muted-foreground">{ag.residence.name}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-xs font-medium text-[var(--color-imaro-primary)]">
          {formatDateShort(ag.date)}
        </span>
      </div>
    </div>
  )
}

// ─── CSS bar chart (recharts-free) ───────────────────────────────────────────

type RecouvrementMois = {
  mois: string
  recouvre: number
  restant: number
}

type RecouvrementChartProps = {
  data: RecouvrementMois[]
  labelRecouvre: string
  labelRestant: string
}

// ─── ModuleCard — Sprint 4-8 module quick access ───────────────────────────

type ModuleCardProps = {
  onClick: () => void
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sublabel: string
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger'
}

function ModuleCard({
  onClick,
  icon,
  iconBg,
  label,
  value,
  sublabel,
  tone = 'default',
}: ModuleCardProps) {
  const toneAccent = {
    default:
      'border-border bg-card hover:border-[var(--color-imaro-primary)]/40',
    info: 'border-blue-200 bg-blue-50/30 hover:border-blue-300 dark:border-blue-900/40 dark:bg-blue-950/10',
    success:
      'border-green-200 bg-green-50/30 hover:border-green-300 dark:border-green-900/40 dark:bg-green-950/10',
    warning:
      'border-amber-200 bg-amber-50/30 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/10',
    danger:
      'border-red-200 bg-red-50/30 hover:border-red-300 dark:border-red-900/40 dark:bg-red-950/10',
  }[tone]

  const valueTone = {
    default: 'text-foreground',
    info: 'text-blue-700 dark:text-blue-300',
    success: 'text-green-700 dark:text-green-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
  }[tone]

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border-2 ${toneAccent} p-4 text-left transition-all hover:shadow-md`}
    >
      <div
        className={`flex size-9 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tracking-tight ${valueTone}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
        {sublabel}
      </p>
      <ArrowRight className="absolute right-3 top-3 size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  )
}

function RecouvrementChart({
  data,
  labelRecouvre,
  labelRestant,
}: RecouvrementChartProps) {
  const maxVal = useMemo(() => {
    if (!data.length) return 25000
    const m = Math.max(...data.flatMap((d) => [d.recouvre, d.restant]))
    return Math.ceil((m * 1.15) / 1000) * 1000
  }, [data])

  // 5 horizontal grid ticks: 0 → maxVal
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal))

  function barPct(value: number) {
    return maxVal > 0 ? `${(value / maxVal) * 100}%` : '0%'
  }

  return (
    <div className="w-full">
      <div className="flex gap-0">
        {/* Y-axis labels — reversed so 0k is at bottom, maxVal at top */}
        <div
          className="flex shrink-0 flex-col justify-between pb-6 pr-2 text-right"
          style={{ width: 36 }}
        >
          {[...ticks].reverse().map((t) => (
            <span
              key={t}
              className="text-[10px] leading-none text-[var(--color-imaro-text-muted)]"
            >
              {Math.round(t / 1000)}k
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1">
          {/* Horizontal grid lines — absolutely positioned in the bar area */}
          <div className="absolute inset-x-0 top-0 h-[192px]">
            {ticks.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-dashed border-border"
                style={{ bottom: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          {/* Bar columns — stretch (no items-end) so columns fill the 192px height,
              then each column uses flex-col + justify-end so bars grow from the bottom */}
          <div className="flex h-[192px] justify-between gap-0.5">
            {data.map((d) => (
              <div key={d.mois} className="flex flex-1 flex-col justify-end">
                {/* Two side-by-side bars inside a row that aligns to bottom */}
                <div className="flex w-full flex-1 items-end gap-px">
                  <div
                    className="rounded-t-[3px] bg-[var(--color-imaro-primary)] transition-all duration-500"
                    style={{
                      height: barPct(d.recouvre),
                      flex: 1,
                      minHeight: d.recouvre > 0 ? 2 : 0,
                    }}
                  />
                  <div
                    className="rounded-t-[3px] bg-[var(--color-imaro-danger)] transition-all duration-500"
                    style={{
                      height: barPct(d.restant),
                      flex: 1,
                      minHeight: d.restant > 0 ? 2 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between pt-1.5">
            {data.map((d) => (
              <span
                key={d.mois}
                className="flex-1 text-center text-[10px] leading-none text-[var(--color-imaro-text-muted)]"
              >
                {d.mois}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex justify-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[var(--color-imaro-primary)]" />
          <span className="text-xs text-[var(--color-imaro-text-muted)]">
            {labelRecouvre}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[var(--color-imaro-danger)]" />
          <span className="text-xs text-[var(--color-imaro-text-muted)]">
            {labelRestant}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const ALL_RESIDENCES = '__all__'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [residenceFilter, setResidenceFilter] = useState<string>(ALL_RESIDENCES)

  const residenceId =
    residenceFilter === ALL_RESIDENCES ? undefined : Number(residenceFilter)

  // Queries
  const residencesQuery = useQuery({
    queryKey: ['gestionnaire', 'residences'],
    queryFn: () => getResidences(),
  })

  const dashboardQuery = useQuery({
    queryKey: ['gestionnaire', 'dashboard', residenceId],
    queryFn: () => getDashboard(residenceId),
  })

  const chartQuery = useQuery({
    queryKey: ['gestionnaire', 'recouvrement', residenceId],
    queryFn: () => getRecouvrementMensuel(),
  })

  const dashboard = dashboardQuery.data
  const residences = residencesQuery.data ?? []

  // Greeting based on local time
  const hour = new Date().getHours()
  const greetingKey =
    hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const firstName = (user?.name ?? '').split(' ')[0] || ''
  const totalResidences = residences.length
  const urgentTickets = dashboard?.tickets_urgents?.length ?? 0
  const subtitleParts: string[] = []
  if (totalResidences > 0) {
    subtitleParts.push(
      `${totalResidences} ${totalResidences > 1 ? t('gestionnaire.dashboard.residencesPl') : t('gestionnaire.dashboard.residencesSg')}`,
    )
  }
  if (urgentTickets > 0) {
    subtitleParts.push(
      `${urgentTickets} ${urgentTickets > 1 ? t('gestionnaire.dashboard.actionsPl') : t('gestionnaire.dashboard.actionsSg')}`,
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page heading — DM Serif greeting + contextual subtitle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-[var(--primary)] sm:text-4xl">
            {firstName
              ? t(`gestionnaire.dashboard.greeting.${greetingKey}WithName`, {
                  name: firstName,
                })
              : t(`gestionnaire.dashboard.greeting.${greetingKey}`)}
          </h1>
          {subtitleParts.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitleParts.join(' · ')}
            </p>
          )}
        </div>

        {/* A — Filtre résidence */}
        <Select value={residenceFilter} onValueChange={setResidenceFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={t('gestionnaire.dashboard.filterAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_RESIDENCES}>
              {t('gestionnaire.dashboard.filterAll')}
            </SelectItem>
            {residences.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* B — KPI cards */}
      {dashboardQuery.isLoading ? (
        <LoadingSkeleton variant="kpi" count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={<Building2 className="size-5" />}
            value={dashboard?.kpi.nb_residences ?? 0}
            label={t('gestionnaire.dashboard.kpi.residences')}
          />
          <KpiCard
            icon={<Users className="size-5" />}
            value={dashboard?.kpi.nb_coproprietaires ?? 0}
            label={t('gestionnaire.dashboard.kpi.coproprietaires')}
          />
          <KpiCard
            icon={<TrendingUp className="size-5" />}
            value={formatMontant(dashboard?.kpi.ca_mensuel ?? 0)}
            label={t('gestionnaire.dashboard.kpi.caMensuel')}
          />
          <KpiCard
            icon={<AlertCircle className="size-5" />}
            value={formatMontant(dashboard?.kpi.total_impayes ?? 0)}
            label={t('gestionnaire.dashboard.kpi.impayes')}
          />
        </div>
      )}

      {/* B-bis — Module overview (Sprint 4-8 modules) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('gestionnaire.dashboard.modules.title', {
              defaultValue: 'Aperçu modules',
            })}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Assistant IA masqué temporairement (KAN-111) */}
          {AI_FEATURES_ENABLED && (
            <button
              onClick={() => void navigate('/gestionnaire/ia')}
              className="group relative overflow-hidden rounded-xl border-2 border-purple-300 bg-gradient-to-br from-[var(--color-imaro-primary)] via-[var(--color-imaro-primary)]/90 to-purple-600 p-4 text-left text-white shadow-md transition-all hover:shadow-lg dark:border-purple-900/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                  <Sparkles className="size-4" />
                </div>
                <Badge className="border-0 bg-white/20 text-[10px] text-white backdrop-blur">
                  BETA
                </Badge>
              </div>
              <p className="mt-3 text-sm font-bold">Assistant IA</p>
              <p className="mt-0.5 text-xs text-white/80">
                {t('gestionnaire.dashboard.iaSubtitle')}
              </p>
              <ArrowRight className="absolute bottom-3 right-3 size-4 text-white/60 transition-transform group-hover:translate-x-1" />
            </button>
          )}

          {/* Conformité — progress */}
          <ModuleCard
            onClick={() => void navigate('/gestionnaire/conformite')}
            icon={<CalendarCheck className="size-4" />}
            iconBg="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            label={t('gestionnaire.dashboard.conformite')}
            value="14%"
            sublabel={t('gestionnaire.dashboard.conformiteCycle')}
            tone="info"
          />

          {/* Recouvrement — prescription risk */}
          <ModuleCard
            onClick={() => void navigate('/gestionnaire/recouvrement')}
            icon={<Scale className="size-4" />}
            iconBg="bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            label="Recouvrement"
            value="1 critique"
            sublabel="Risque prescription · 2 lots en retard"
            tone="danger"
          />

          {/* Pointage bancaire */}
          <ModuleCard
            onClick={() => void navigate('/gestionnaire/pointage')}
            icon={<Landmark className="size-4" />}
            iconBg="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            label="Pointage bancaire"
            value="À faire"
            sublabel="Dernier import il y a 47 jours"
            tone="warning"
          />

          {/* Patrimoine */}
          <ModuleCard
            onClick={() => void navigate('/gestionnaire/equipements')}
            icon={<HardHat className="size-4" />}
            iconBg="bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
            label="Patrimoine"
            value="157.500 DH"
            sublabel="4 équipements · 1 emprunt actif"
          />

          {/* Annexes prêtes */}
          <ModuleCard
            onClick={() => void navigate('/gestionnaire/annexes')}
            icon={<ClipboardCheck className="size-4" />}
            iconBg="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
            label="Annexes comptables"
            value="12 prêtes"
            sublabel="3 requises · 9 complémentaires · Décret 2.23.700"
            tone="success"
          />
        </div>
      </section>

      {/* C — Recouvrement chart */}
      <Card className="dark:bg-card dark:border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold text-[var(--color-imaro-primary)] dark:text-foreground">
              {t('gestionnaire.dashboard.chart.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {chartQuery.isLoading ? (
            <LoadingSkeleton variant="text" count={3} className="h-48" />
          ) : (
            <RecouvrementChart
              data={chartQuery.data ?? []}
              labelRecouvre={t('gestionnaire.dashboard.chart.recouvre')}
              labelRestant={t('gestionnaire.dashboard.chart.restant')}
            />
          )}
        </CardContent>
      </Card>

      {/* D — Row 3: two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Top impayés */}
        <Card className="dark:bg-card dark:border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-semibold text-[var(--color-imaro-primary)] dark:text-foreground">
                {t('gestionnaire.dashboard.topImpayes.title')}
              </CardTitle>
              {dashboard?.top_impayes && dashboard.top_impayes.length > 0 && (
                <Badge className="bg-[var(--color-imaro-danger)] text-white">
                  {formatMontant(
                    dashboard.top_impayes.reduce(
                      (acc, i) => acc + i.montant,
                      0,
                    ),
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {dashboardQuery.isLoading ? (
              <LoadingSkeleton variant="table" count={5} />
            ) : !dashboard?.top_impayes?.length ? (
              <EmptyState
                icon={<AlertCircle className="size-12" />}
                title={t('gestionnaire.dashboard.topImpayes.title')}
              />
            ) : (
              <div>
                {dashboard.top_impayes.map((impaye) => (
                  <ImpayeRow
                    key={`${impaye.coproprietaire.id}-${impaye.lot}`}
                    impaye={impaye}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Tickets + AG stacked */}
        <div className="flex flex-col gap-6">
          {/* Tickets urgents */}
          <Card className="dark:bg-card dark:border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-semibold text-[var(--color-imaro-primary)] dark:text-foreground">
                  {t('gestionnaire.dashboard.ticketsUrgents.title')}
                </CardTitle>
                {dashboard?.tickets_urgents &&
                  dashboard.tickets_urgents.length > 0 && (
                    <Badge className="bg-[var(--color-imaro-danger)] text-white">
                      {dashboard.tickets_urgents.length}
                    </Badge>
                  )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardQuery.isLoading ? (
                <LoadingSkeleton variant="table" count={3} />
              ) : !dashboard?.tickets_urgents?.length ? (
                <EmptyState
                  icon={<Wrench className="size-12" />}
                  title={t('gestionnaire.dashboard.ticketsUrgents.empty')}
                />
              ) : (
                <div>
                  {dashboard.tickets_urgents.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assemblées à venir */}
          <Card className="dark:bg-card dark:border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[var(--color-imaro-primary)] dark:text-foreground">
                {t('gestionnaire.dashboard.assemblees.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardQuery.isLoading ? (
                <LoadingSkeleton variant="table" count={2} />
              ) : !dashboard?.assemblees_a_venir?.length ? (
                <EmptyState
                  icon={<CalendarDays className="size-12" />}
                  title={t('gestionnaire.dashboard.assemblees.empty')}
                />
              ) : (
                <div>
                  {dashboard.assemblees_a_venir.map((ag) => (
                    <AgRow key={ag.id} ag={ag} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* E — Actions rapides */}
      <Card className="dark:bg-card dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[var(--color-imaro-primary)] dark:text-foreground">
            {t('gestionnaire.dashboard.actions.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-[var(--color-imaro-accent)] text-white hover:opacity-90"
              onClick={() =>
                void navigate('/gestionnaire/appels-fonds?create=1')
              }
            >
              <FilePlus className="me-2 size-4" />
              {t('gestionnaire.dashboard.actions.appelFonds')}
            </Button>
            <Button
              variant="outline"
              className="border-[var(--color-imaro-accent)] text-[var(--color-imaro-accent)] hover:bg-[var(--color-imaro-accent)]/10"
              onClick={() => void navigate('/gestionnaire/paiements?create=1')}
            >
              <CreditCard className="me-2 size-4" />
              {t('gestionnaire.dashboard.actions.paiement')}
            </Button>
            <Button
              variant="outline"
              className="border-[var(--color-imaro-accent)] text-[var(--color-imaro-accent)] hover:bg-[var(--color-imaro-accent)]/10"
              onClick={() => void navigate('/gestionnaire/tickets')}
            >
              <Wrench className="me-2 size-4" />
              {t('gestionnaire.dashboard.actions.ticket')}
            </Button>
            <Button
              variant="outline"
              className="border-[var(--color-imaro-accent)] text-[var(--color-imaro-accent)] hover:bg-[var(--color-imaro-accent)]/10"
              onClick={() => void navigate('/gestionnaire/assemblees?create=1')}
            >
              <CalendarPlus className="me-2 size-4" />
              {t('gestionnaire.dashboard.actions.ag')}
            </Button>

            {/* Separator */}
            <div className="mx-1 hidden h-9 w-px bg-border md:block" />

            {/* New shortcuts to Sprint 4-8 modules */}
            {/* Audit IA masqué temporairement (KAN-111) */}
            {AI_FEATURES_ENABLED && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void navigate('/gestionnaire/ia')}
              >
                <Sparkles className="size-4 text-purple-600" />
                {t('gestionnaire.dashboard.actions.iaAudit', {
                  defaultValue: 'Audit IA',
                })}
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void navigate('/gestionnaire/pointage')}
            >
              <Landmark className="size-4 text-amber-600" />
              {t('gestionnaire.dashboard.actions.pointage', {
                defaultValue: 'Pointage relevé',
              })}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void navigate('/gestionnaire/annexes')}
            >
              <ClipboardCheck className="size-4 text-blue-600" />
              {t('gestionnaire.dashboard.actions.annexes', {
                defaultValue: 'Générer annexe',
              })}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void navigate('/gestionnaire/occupants')}
            >
              <UserCheck className="size-4 text-[var(--color-imaro-primary)]" />
              {t('gestionnaire.dashboard.actions.occupants', {
                defaultValue: 'Occupants',
              })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
