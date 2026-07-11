import { useTranslation } from 'react-i18next'
import { useResidenceStore } from '@/stores/residenceStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bell,
  BellRing,
  Send,
  Smartphone,
  MessageCircle,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Gauge,
  CalendarClock,
  Languages,
  Info,
  Clock,
  RefreshCw,
  Hash,
  Globe,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getResidences } from '@/services/gestionnaire.service'
import {
  getRappelsConfig,
  getRappelsStats,
  getRecentRappels,
  getRappelsTemplates,
  updateRappelsConfig,
  sendStageNow,
  sendAllNow,
  type RappelsConfig,
  type ReminderStageId,
  type ExtraChannel,
  type ReminderChannel,
  type ReminderDeliveryStatus,
  type RecentRappel,
} from '@/services/rappels.service'

// ─── Stage visual metadata ─────────────────────────────────────────────────

type StageMeta = {
  labelKey: string
  descKey: string
  dot: string
  ring: string
  tint: string
  accentText: string
}

const STAGE_META: Record<ReminderStageId, StageMeta> = {
  j3: {
    labelKey: 'gestionnaire.rappels.stageJ3',
    descKey: 'gestionnaire.rappels.stageDescJ3',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-200 dark:ring-emerald-900/40',
    tint: 'bg-emerald-50/60 dark:bg-emerald-950/15',
    accentText: 'text-emerald-600 dark:text-emerald-400',
  },
  j2: {
    labelKey: 'gestionnaire.rappels.stageJ2',
    descKey: 'gestionnaire.rappels.stageDescJ2',
    dot: 'bg-blue-500',
    ring: 'ring-blue-200 dark:ring-blue-900/40',
    tint: 'bg-blue-50/60 dark:bg-blue-950/15',
    accentText: 'text-blue-600 dark:text-blue-400',
  },
  j1: {
    labelKey: 'gestionnaire.rappels.stageJ1',
    descKey: 'gestionnaire.rappels.stageDescJ1',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200 dark:ring-amber-900/40',
    tint: 'bg-amber-50/60 dark:bg-amber-950/15',
    accentText: 'text-amber-600 dark:text-amber-400',
  },
  jour_j: {
    labelKey: 'gestionnaire.rappels.stageJourJ',
    descKey: 'gestionnaire.rappels.stageDescJourJ',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200 dark:ring-orange-900/40',
    tint: 'bg-orange-50/60 dark:bg-orange-950/15',
    accentText: 'text-orange-600 dark:text-orange-400',
  },
  retard: {
    labelKey: 'gestionnaire.rappels.stageRetard',
    descKey: 'gestionnaire.rappels.stageDescRetard',
    dot: 'bg-red-500',
    ring: 'ring-red-200 dark:ring-red-900/40',
    tint: 'bg-red-50/60 dark:bg-red-950/15',
    accentText: 'text-red-600 dark:text-red-400',
  },
}

const EXTRA_CHANNELS: { id: ExtraChannel; icon: typeof Mail }[] = [
  { id: 'whatsapp', icon: MessageCircle },
  { id: 'email', icon: Mail },
  { id: 'sms', icon: MessageSquare },
]

const STATUS_META: Record<
  ReminderDeliveryStatus,
  { labelKey: string; cls: string }
> = {
  delivered: {
    labelKey: 'gestionnaire.rappels.statusDelivered',
    cls: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400',
  },
  sent: {
    labelKey: 'gestionnaire.rappels.statusSent',
    cls: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400',
  },
  pending: {
    labelKey: 'gestionnaire.rappels.statusPending',
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400',
  },
  failed: {
    labelKey: 'gestionnaire.rappels.statusFailed',
    cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400',
  },
}

const CHANNEL_ICON: Record<ReminderChannel, typeof Mail> = {
  push: Smartphone,
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageSquare,
}

const dtFmt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

// ─── Page ────────────────────────────────────────────────────────────────────

export function RappelsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const globalResidenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  // In dev with no real residences, fall back to a synthetic id so the
  // mock-backed queries still fire and the page renders with sample data.
  // In prod, residenceId stays null → page shows an empty state below.
  const realResidenceId = globalResidenceId ?? residencesQ.data?.[0]?.id ?? null
  const residenceId = realResidenceId ?? (import.meta.env.DEV ? 0 : null)
  const residence = residencesQ.data?.find((r) => r.id === residenceId)

  const queryReady = residenceId !== null

  const configQ = useQuery({
    queryKey: ['rappels-config', residenceId],
    queryFn: () => getRappelsConfig(residenceId as number),
    enabled: queryReady,
  })
  const statsQ = useQuery({
    queryKey: ['rappels-stats', residenceId],
    queryFn: () => getRappelsStats(residenceId as number),
    enabled: queryReady,
  })
  const recentQ = useQuery({
    queryKey: ['rappels-recent', residenceId],
    queryFn: () => getRecentRappels(residenceId as number),
    enabled: queryReady,
  })
  const templatesQ = useQuery({
    queryKey: ['rappels-templates', residenceId],
    queryFn: () => getRappelsTemplates(residenceId as number),
    enabled: queryReady,
  })

  // Config is read straight from the query cache; toggles patch it
  // optimistically via setQueryData (no effect-driven local mirror).
  const cfg = configQ.data ?? null
  const patchConfig = (updater: (c: RappelsConfig) => RappelsConfig) => {
    qc.setQueryData<RappelsConfig>(['rappels-config', residenceId], (old) =>
      old ? updater(old) : old,
    )
  }

  const saveMut = useMutation({
    mutationFn: (patch: Parameters<typeof updateRappelsConfig>[1]) =>
      updateRappelsConfig(residenceId!, patch),
  })

  const sendAllMut = useMutation({
    mutationFn: () => sendAllNow(residenceId!),
    onSuccess: (res) => {
      toast.success(t('gestionnaire.rappels.toastSentAll', { n: res.queued }))
      void qc.invalidateQueries({ queryKey: ['rappels-stats', residenceId] })
      void qc.invalidateQueries({ queryKey: ['rappels-recent', residenceId] })
    },
  })

  const sendStageMut = useMutation({
    mutationFn: (stage: ReminderStageId) => sendStageNow(residenceId!, stage),
    onSuccess: (res, stage) => {
      toast.success(
        t('gestionnaire.rappels.toastStageSent', {
          stage: t(STAGE_META[stage].labelKey),
          n: res.queued,
        }),
      )
    },
  })

  // ── Mutators ──
  const toggleAuto = (v: boolean) => {
    if (!cfg) return
    patchConfig((c) => ({ ...c, auto_enabled: v }))
    saveMut.mutate({ auto_enabled: v })
    toast.success(
      v
        ? t('gestionnaire.rappels.toastEnabled')
        : t('gestionnaire.rappels.toastDisabled'),
    )
  }

  const toggleStage = (id: ReminderStageId, enabled: boolean) => {
    if (!cfg) return
    const stages = cfg.stages.map((s) => (s.id === id ? { ...s, enabled } : s))
    patchConfig((c) => ({ ...c, stages }))
    saveMut.mutate({ stages })
  }

  const toggleChannel = (id: ReminderStageId, ch: ExtraChannel) => {
    if (!cfg) return
    const stages = cfg.stages.map((s) =>
      s.id === id
        ? { ...s, channels: { ...s.channels, [ch]: !s.channels[ch] } }
        : s,
    )
    patchConfig((c) => ({ ...c, stages }))
    saveMut.mutate({ stages })
  }

  // Safe fallback when config hasn't resolved yet — keeps the page rendering
  // its full shell so users immediately see the structure instead of a
  // 4-card skeleton. All stages start disabled in the fallback.
  const fallbackCfg: RappelsConfig = {
    residence_id: residenceId ?? 0,
    auto_enabled: false,
    next_run_at: null,
    daily_limit: 3,
    used_today: 0,
    max_overdue_days: 7,
    run_hour: 9,
    stages: [
      {
        id: 'j3',
        enabled: false,
        channels: { whatsapp: false, email: false, sms: false },
        pending: 0,
      },
      {
        id: 'j2',
        enabled: false,
        channels: { whatsapp: false, email: false, sms: false },
        pending: 0,
      },
      {
        id: 'j1',
        enabled: false,
        channels: { whatsapp: false, email: false, sms: false },
        pending: 0,
      },
      {
        id: 'jour_j',
        enabled: false,
        channels: { whatsapp: false, email: false, sms: false },
        pending: 0,
      },
      {
        id: 'retard',
        enabled: false,
        channels: { whatsapp: false, email: false, sms: false },
        pending: 0,
      },
    ],
    languages: ['fr', 'ar'],
  }
  const view = cfg ?? fallbackCfg

  const nextRunLabel = view.next_run_at
    ? dtFmt.format(new Date(view.next_run_at))
    : t('gestionnaire.rappels.never')

  const pendingTotal = view.stages.reduce((sum, s) => sum + s.pending, 0)
  const remainingManual = Math.max(0, view.daily_limit - view.used_today)

  const stats = statsQ.data

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.rappels.title')}
        subtitle={t('gestionnaire.rappels.subtitle')}
      />

      {/* Residence selector + mini-stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setResidenceId(Number(v))}
        >
          <SelectTrigger className="w-64">
            <SelectValue
              placeholder={t('gestionnaire.rappels.selectResidence')}
            />
          </SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {residence && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Hash className="size-4 text-[var(--color-imaro-primary)]" />
              {residence.nb_lots} {t('gestionnaire.rappels.lots')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-amber-600" />
              {t('gestionnaire.rappels.pendingCount', { n: pendingTotal })}
            </span>
            <span className="flex items-center gap-1.5">
              <Gauge className="size-4 text-green-600" />
              {residence.taux_recouvrement}%
            </span>
          </div>
        )}
      </div>

      {/* Auto-reminders master card */}
      <div
        className={cn(
          'overflow-hidden rounded-2xl border bg-card',
          view.auto_enabled &&
            'ring-1 ring-inset ring-[var(--color-imaro-primary)]/15',
        )}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-gradient-imaro flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
              <BellRing className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('gestionnaire.rappels.autoTitle')}
              </h2>
              <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
                {t('gestionnaire.rappels.autoDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:flex-col sm:items-end lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                  view.auto_enabled
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    view.auto_enabled
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/50',
                  )}
                />
                {view.auto_enabled
                  ? t('gestionnaire.rappels.enabled')
                  : t('gestionnaire.rappels.disabled')}
              </span>
              {view.auto_enabled && (
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <CalendarClock className="size-3.5" />
                  {t('gestionnaire.rappels.nextRun')} : {nextRunLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={view.auto_enabled}
                onCheckedChange={toggleAuto}
                aria-label={t('gestionnaire.rappels.autoTitle')}
              />
              <Button
                size="sm"
                className="gap-1.5 bg-[var(--accent)] text-white hover:brightness-110"
                disabled={sendAllMut.isPending || !view.auto_enabled}
                onClick={() => sendAllMut.mutate()}
              >
                {sendAllMut.isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {t('gestionnaire.rappels.sendAll')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Gauge className="size-5" />}
          value={stats?.delivery_rate != null ? `${stats.delivery_rate}%` : '—'}
          label={t('gestionnaire.rappels.kpiDeliveryRate')}
        />
        <KpiCard
          icon={<CheckCircle2 className="size-5" />}
          value={stats?.delivered ?? 0}
          label={t('gestionnaire.rappels.kpiDelivered')}
        />
        <KpiCard
          icon={<XCircle className="size-5" />}
          value={stats?.failed ?? 0}
          label={t('gestionnaire.rappels.kpiFailed')}
        />
        <KpiCard
          icon={<Send className="size-5" />}
          value={stats?.sent_this_month ?? 0}
          label={t('gestionnaire.rappels.kpiSentMonth')}
        />
      </div>

      {/* Timeline */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-[var(--color-imaro-primary)]" />
            <h2 className="text-base font-bold text-foreground">
              {t('gestionnaire.rappels.timelineTitle')}
            </h2>
            <Badge
              variant="outline"
              className="gap-1 border-[var(--color-imaro-primary)]/30 text-[10px] text-[var(--color-imaro-primary)]"
            >
              <Globe className="size-3" />
              {t('gestionnaire.rappels.globalSettings')}
            </Badge>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t('gestionnaire.rappels.remaining', {
              n: remainingManual,
              max: view.daily_limit,
            })}
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {t('gestionnaire.rappels.timelineSubtitle')} ·{' '}
          {t('gestionnaire.rappels.appliesAll')}
        </p>

        {/* Progress rail */}
        <div className="mb-3 hidden items-center gap-1 md:flex">
          {view.stages.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <span
                className={cn(
                  'size-3 shrink-0 rounded-full ring-4 ring-background',
                  s.enabled ? STAGE_META[s.id].dot : 'bg-muted-foreground/30',
                )}
              />
              {i < view.stages.length - 1 && (
                <span className="h-0.5 flex-1 bg-gradient-to-r from-[var(--color-imaro-primary)]/40 to-[var(--color-imaro-primary)]/10" />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {view.stages.map((stage) => {
            const meta = STAGE_META[stage.id]
            return (
              <div
                key={stage.id}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border p-4 ring-1 ring-inset transition-opacity',
                  meta.ring,
                  stage.enabled ? meta.tint : 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', meta.dot)} />
                    <Bell className={cn('size-4', meta.accentText)} />
                  </div>
                  <Switch
                    checked={stage.enabled}
                    onCheckedChange={(v) => toggleStage(stage.id, v)}
                    aria-label={t(meta.labelKey)}
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {t(meta.labelKey)}
                    </p>
                    <span className={cn('text-sm font-bold', meta.accentText)}>
                      {stage.pending}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {t(meta.descKey)}
                  </p>
                </div>

                {/* Always-on push */}
                <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-2">
                  <Smartphone className="size-3.5 shrink-0 text-[var(--color-imaro-primary)]" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-foreground">
                      {t('gestionnaire.rappels.pushAlways')}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {t('gestionnaire.rappels.pushAlwaysHint')}
                    </p>
                  </div>
                </div>

                {/* Extra channels */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('gestionnaire.rappels.extraChannels')}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {EXTRA_CHANNELS.map(({ id, icon: Icon }) => {
                      const on = stage.channels[id]
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!stage.enabled}
                          onClick={() => toggleChannel(stage.id, id)}
                          aria-pressed={on}
                          aria-label={t(`gestionnaire.rappels.${id}`)}
                          className={cn(
                            'flex size-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                            on
                              ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)] text-white'
                              : 'border-border bg-background text-muted-foreground hover:border-[var(--color-imaro-primary)]/40',
                          )}
                        >
                          <Icon className="size-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto gap-1.5"
                  disabled={
                    !stage.enabled ||
                    stage.pending === 0 ||
                    sendStageMut.isPending
                  }
                  onClick={() => sendStageMut.mutate(stage.id)}
                >
                  <Send className="size-3.5" />
                  {t('gestionnaire.rappels.send')}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Lower grid: preview + recent */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Aperçu */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Badge className="gap-1 border-0 bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                <span className="size-1.5 rounded-full bg-green-500" />
                {t('gestionnaire.rappels.active')}
              </Badge>
              <h2 className="text-base font-bold text-foreground">
                {t('gestionnaire.rappels.previewTitle')}
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {t('gestionnaire.rappels.activeDesc')}
            </p>

            {/* Push */}
            <div className="mb-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Smartphone className="size-4 text-[var(--color-imaro-primary)]" />
                  {t('gestionnaire.rappels.pushAlways')}
                </span>
                <Badge
                  variant="outline"
                  className="border-[var(--color-imaro-primary)]/30 text-[10px] text-[var(--color-imaro-primary)]"
                >
                  {t('gestionnaire.rappels.alwaysActive')}
                </Badge>
              </div>
              {templatesQ.data && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {templatesQ.data.push.title}
                  </span>{' '}
                  — {templatesQ.data.push.body}
                </p>
              )}
            </div>

            {/* WhatsApp bubble */}
            <ChannelBlock
              icon={MessageCircle}
              name={t('gestionnaire.rappels.whatsapp')}
              free={t('gestionnaire.rappels.free')}
              testLabel={t('gestionnaire.rappels.test')}
              onTest={() => toast.success(t('gestionnaire.rappels.toastTest'))}
            >
              {templatesQ.data && (
                <div className="rounded-lg rounded-tl-none bg-[#dcf8c6] p-2.5 text-xs text-slate-800 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-50">
                  {templatesQ.data.whatsapp.body}
                </div>
              )}
            </ChannelBlock>

            {/* Email */}
            <ChannelBlock
              icon={Mail}
              name={t('gestionnaire.rappels.email')}
              free={t('gestionnaire.rappels.free')}
              testLabel={t('gestionnaire.rappels.test')}
              onTest={() => toast.success(t('gestionnaire.rappels.toastTest'))}
            >
              {templatesQ.data && (
                <div className="space-y-1 rounded-lg border bg-background p-2.5 text-xs">
                  <p className="text-muted-foreground">
                    {t('gestionnaire.rappels.emailSubject')} :{' '}
                    <span className="font-medium text-foreground">
                      {templatesQ.data.email.subject}
                    </span>
                  </p>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {templatesQ.data.email.body}
                  </p>
                </div>
              )}
            </ChannelBlock>

            {/* Languages */}
            <div className="mt-4 rounded-xl border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Languages className="size-4 text-[var(--color-imaro-primary)]" />
                <p className="text-sm font-medium">
                  {t('gestionnaire.rappels.langTitle')}
                </p>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {t('gestionnaire.rappels.langDesc')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {view.languages.map((code) => (
                  <span
                    key={code}
                    className="rounded-md border bg-background px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Info className="size-4 text-[var(--color-imaro-primary)]" />
              <h2 className="text-sm font-bold text-foreground">
                {t('gestionnaire.rappels.howTitle')}
              </h2>
            </div>
            <div className="space-y-3">
              <HowItem
                icon={Clock}
                title={t('gestionnaire.rappels.howDaily')}
                desc={t('gestionnaire.rappels.howDailyDesc', {
                  hour: String(view.run_hour).padStart(2, '0'),
                })}
              />
              <HowItem
                icon={RefreshCw}
                title={t('gestionnaire.rappels.howOverdue')}
                desc={t('gestionnaire.rappels.howOverdueDesc', {
                  n: view.max_overdue_days,
                })}
              />
              <HowItem
                icon={Gauge}
                title={t('gestionnaire.rappels.howLimits')}
                desc={t('gestionnaire.rappels.howLimitsDesc', {
                  max: view.daily_limit,
                })}
              />
              <HowItem
                icon={Globe}
                title={t('gestionnaire.rappels.howMultilang')}
                desc={t('gestionnaire.rappels.howMultilangDesc', {
                  n: view.languages.length,
                })}
              />
            </div>
          </div>
        </div>

        {/* Recent */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">
              {t('gestionnaire.rappels.recentTitle')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('gestionnaire.rappels.recentSubtitle')}
            </p>
          </div>
          <RecentTable rows={recentQ.data ?? []} loading={recentQ.isLoading} />
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ChannelBlock({
  icon: Icon,
  name,
  free,
  testLabel,
  onTest,
  children,
}: {
  icon: typeof Mail
  name: string
  free: string
  testLabel: string
  onTest: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-4 text-[var(--color-imaro-primary)]" />
          {name}
          <Badge
            variant="outline"
            className="border-green-200 text-[10px] text-green-700 dark:text-green-400"
          >
            {free}
          </Badge>
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onTest}
        >
          <Send className="size-3" />
          {testLabel}
        </Button>
      </div>
      {children}
    </div>
  )
}

function HowItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Mail
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]">
        <Icon className="size-3.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function RecentTable({
  rows,
  loading,
}: {
  rows: RecentRappel[]
  loading: boolean
}) {
  const { t } = useTranslation()

  const columns: Column<RecentRappel>[] = [
    {
      key: 'date',
      header: t('gestionnaire.rappels.colDate'),
      sortable: true,
      renderCell: (r) => (
        <span className="tabular-nums text-sm">
          {dtFmt.format(new Date(r.date))}
        </span>
      ),
    },
    {
      key: 'resident_name',
      header: t('gestionnaire.rappels.colResident'),
      sortable: true,
    },
    {
      key: 'stage',
      header: t('gestionnaire.rappels.colType'),
      renderCell: (r) => (
        <span className="text-sm">{t(STAGE_META[r.stage].labelKey)}</span>
      ),
    },
    {
      key: 'channel',
      header: t('gestionnaire.rappels.colChannel'),
      renderCell: (r) => {
        const Icon = CHANNEL_ICON[r.channel]
        return (
          <span className="flex items-center gap-1.5 text-sm capitalize">
            <Icon className="size-3.5 text-muted-foreground" />
            {r.channel}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: t('gestionnaire.rappels.colStatus'),
      renderCell: (r) => (
        <Badge
          variant="outline"
          className={cn('text-[10px]', STATUS_META[r.status].cls)}
        >
          {t(STATUS_META[r.status].labelKey)}
        </Badge>
      ),
    },
    {
      key: 'trigger',
      header: t('gestionnaire.rappels.colTrigger'),
      renderCell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.trigger === 'auto'
            ? t('gestionnaire.rappels.triggerAuto')
            : t('gestionnaire.rappels.triggerManual')}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey="id"
      isLoading={loading}
      searchable
      emptyIcon={<Bell className="size-12 text-muted-foreground" />}
      emptyTitle={t('gestionnaire.rappels.recentEmpty')}
      emptyDescription={t('gestionnaire.rappels.recentEmptyDesc')}
    />
  )
}
