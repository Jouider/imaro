import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scale,
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  TrendingUp,
  Mail,
  Settings,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { cn } from '@/lib/utils'
import { getResidences } from '@/services/gestionnaire.service'
import {
  getRecouvrement,
  sendMiseEnDemeure,
  getPenaltyConfig,
  updatePenaltyConfig,
  recalculatePenalties,
  type PrescriptionSeverity,
  type PenaltyConfig,
} from '@/services/conformite.service'

const fmt = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const SEVERITY_META: Record<
  PrescriptionSeverity,
  { label: string; cls: string }
> = {
  low: { label: 'Faible', cls: 'border-green-200 bg-green-50 text-green-700' },
  medium: {
    label: 'Modéré',
    cls: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  high: {
    label: 'Élevé',
    cls: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  critical: { label: 'Critique', cls: 'border-red-200 bg-red-50 text-red-700' },
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  en_retard: {
    label: 'En retard',
    cls: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  mise_en_demeure: {
    label: 'Mise en demeure',
    cls: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  contentieux: {
    label: 'Contentieux',
    cls: 'border-red-200 bg-red-50 text-red-700',
  },
}

export function RecouvrementPage() {
  const { t } = useTranslation()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(
    null,
  )

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const recQ = useQuery({
    queryKey: ['recouvrement', residenceId],
    queryFn: () => getRecouvrement(residenceId!),
    enabled: !!residenceId,
  })

  const mdMut = useMutation({
    mutationFn: (paiementId: number) => sendMiseEnDemeure(paiementId),
    onSuccess: () => recQ.refetch(),
  })

  const queryClient = useQueryClient()

  // ── Penalty config ────────────────────────────────────────────────────────
  const [showConfig, setShowConfig] = useState(false)
  /**
   * Local edits patch — applied on top of the server config when the user
   * tweaks the form. Reset to `null` on cancel/save → derived value falls
   * back to the server response. Avoids setState-in-effect.
   */
  const [configEdits, setConfigEdits] = useState<Partial<PenaltyConfig>>({})

  const configQ = useQuery({
    queryKey: ['penalty-config', residenceId],
    queryFn: () => getPenaltyConfig(residenceId!),
    enabled: !!residenceId,
  })

  const draftConfig: PenaltyConfig | null = configQ.data
    ? { ...configQ.data, ...configEdits }
    : null

  const setDraftConfig = (next: PenaltyConfig) => {
    if (!configQ.data) return
    const patch: Partial<PenaltyConfig> = {}
    ;(Object.keys(next) as (keyof PenaltyConfig)[]).forEach((k) => {
      if (next[k] !== configQ.data![k]) {
        // assigning via index — k is a key of PenaltyConfig
        ;(patch as Record<string, unknown>)[k] = next[k]
      }
    })
    setConfigEdits(patch)
  }

  const saveConfigMut = useMutation({
    mutationFn: (cfg: PenaltyConfig) => updatePenaltyConfig(residenceId!, cfg),
    onSuccess: () => {
      toast.success(t('gestionnaire.recouvrement.toastConfigSaved'))
      setConfigEdits({})
      void queryClient.invalidateQueries({
        queryKey: ['penalty-config', residenceId],
      })
    },
    onError: () => toast.error(t('gestionnaire.recouvrement.saveError')),
  })

  const recalcMut = useMutation({
    mutationFn: () => recalculatePenalties(residenceId!),
    onSuccess: (r) => {
      toast.success(
        `${r.recalculated} pénalités recalculées (${r.total_penalty_amount.toFixed(2)} DH)`,
      )
      void queryClient.invalidateQueries({
        queryKey: ['recouvrement', residenceId],
      })
    },
    onError: () => toast.error(t('gestionnaire.recouvrement.recalcError')),
  })

  const data = recQ.data
  const criticalCount =
    data?.prescription_risks.filter((r) => r.severite === 'critical').length ??
    0
  const highCount =
    data?.prescription_risks.filter((r) => r.severite === 'high').length ?? 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <Scale className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.recouvrement.title', {
              defaultValue: 'Recouvrement',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.recouvrement.subtitle', {
              defaultValue: 'Suivi des impayés, pénalités et mises en demeure',
            })}
          </p>
        </div>
      </div>

      {/* Residence selector + action buttons */}
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

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => recalcMut.mutate()}
            disabled={
              !residenceId || recalcMut.isPending || !configQ.data?.enabled
            }
            title={
              !configQ.data?.enabled
                ? "Activer les pénalités d'abord"
                : 'Recalculer les pénalités sur les impayés'
            }
          >
            <Sparkles
              className={cn('size-3.5', recalcMut.isPending && 'animate-pulse')}
            />
            {t('gestionnaire.recouvrement.recalcPenalites')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowConfig((v) => !v)}
          >
            <Settings className="size-3.5" />
            {showConfig
              ? 'Masquer la configuration'
              : 'Configuration pénalités'}
          </Button>
        </div>
      </div>

      {/* Penalty configuration form */}
      {showConfig && draftConfig && (
        <div className="rounded-xl border-2 border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Settings className="size-4 text-[var(--color-imaro-primary)]" />
            <h2 className="text-sm font-bold text-[var(--color-imaro-primary)]">
              {t('gestionnaire.recouvrement.configTitle')}
            </h2>
            <Badge
              variant="outline"
              className="ml-2 border-blue-200 bg-blue-50 text-[10px] text-blue-700"
            >
              Loi 18-00 · Art. 25
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Enabled toggle */}
            <div className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <Label
                  htmlFor="penalty-enabled"
                  className="text-sm font-medium"
                >
                  {t('gestionnaire.recouvrement.penalitesActivees')}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('gestionnaire.recouvrement.penalitesAutoDesc')}
                </p>
              </div>
              <Switch
                id="penalty-enabled"
                checked={draftConfig.enabled}
                onCheckedChange={(checked) =>
                  setDraftConfig({ ...draftConfig, enabled: checked })
                }
              />
            </div>

            {/* Grace period */}
            <div className="rounded-lg border bg-card p-3">
              <Label htmlFor="grace-days" className="text-sm font-medium">
                {t('gestionnaire.recouvrement.graceDays')}
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('gestionnaire.recouvrement.graceHint')}
              </p>
              <Input
                id="grace-days"
                type="number"
                min="0"
                value={draftConfig.grace_period_days}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    grace_period_days: Number(e.target.value),
                  })
                }
                className="mt-2"
                disabled={!draftConfig.enabled}
              />
            </div>

            {/* Rate type */}
            <div className="rounded-lg border bg-card p-3">
              <Label className="text-sm font-medium">
                {t('gestionnaire.recouvrement.penaltyType')}
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(['fixed', 'percentage', 'daily'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={!draftConfig.enabled}
                    onClick={() =>
                      setDraftConfig({ ...draftConfig, rate_type: type })
                    }
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                      draftConfig.rate_type === type
                        ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)] text-white'
                        : 'border-border bg-card text-muted-foreground hover:border-[var(--color-imaro-primary)]/40',
                    )}
                  >
                    {type === 'fixed'
                      ? 'Fixe (DH)'
                      : type === 'percentage'
                        ? 'Pourcentage'
                        : 'Journalier'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rate value */}
            <div className="rounded-lg border bg-card p-3">
              <Label htmlFor="rate-value" className="text-sm font-medium">
                Valeur (
                {draftConfig.rate_type === 'fixed'
                  ? 'DH'
                  : draftConfig.rate_type === 'percentage'
                    ? '%'
                    : 'DH/jour'}
                )
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {draftConfig.rate_type === 'fixed' &&
                  'Montant forfaitaire ajouté à chaque impayé'}
                {draftConfig.rate_type === 'percentage' &&
                  'Pourcentage du montant impayé'}
                {draftConfig.rate_type === 'daily' &&
                  'Pénalité ajoutée par jour de retard'}
              </p>
              <Input
                id="rate-value"
                type="number"
                step="0.01"
                min="0"
                value={draftConfig.rate_value}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    rate_value: Number(e.target.value),
                  })
                }
                className="mt-2"
                disabled={!draftConfig.enabled}
              />
            </div>

            {/* Cap max (optional) */}
            <div className="rounded-lg border bg-card p-3 md:col-span-2">
              <Label htmlFor="cap-max" className="text-sm font-medium">
                Plafond maximum (DH, optionnel)
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('gestionnaire.recouvrement.plafondHint')}
              </p>
              <Input
                id="cap-max"
                type="number"
                step="0.01"
                min="0"
                value={draftConfig.cap_max_montant ?? ''}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    cap_max_montant:
                      e.target.value === ''
                        ? undefined
                        : Number(e.target.value),
                  })
                }
                className="mt-2 max-w-xs"
                disabled={!draftConfig.enabled}
              />
            </div>
          </div>

          {/* AG approval reminder */}
          {draftConfig.enabled && !draftConfig.ag_approved_at && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>{t('gestionnaire.recouvrement.bannerTitle')}</strong>{' '}
                {t('gestionnaire.recouvrement.bannerBody')}
              </p>
            </div>
          )}

          {/* Save button */}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigEdits({})}
              disabled={
                saveConfigMut.isPending || Object.keys(configEdits).length === 0
              }
            >
              {t('actions.cancel')}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => draftConfig && saveConfigMut.mutate(draftConfig)}
              disabled={saveConfigMut.isPending}
            >
              <RefreshCw
                className={cn(
                  'size-3.5',
                  saveConfigMut.isPending && 'animate-spin',
                )}
              />
              {t('actions.save')}
            </Button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          label={t('gestionnaire.recouvrement.totalImpaye')}
          value={data ? `${fmt.format(data.total_impaye)} DH` : '—'}
          icon={<TrendingUp className="size-4" />}
          tone="danger"
        />
        <Kpi
          label={t('gestionnaire.recouvrement.penalites')}
          value={data ? `${fmt.format(data.total_penalites)} DH` : '—'}
          icon={<FileWarning className="size-4" />}
          tone="warning"
        />
        <Kpi
          label="Lots en retard"
          value={data?.nb_lots_en_retard ?? 0}
          icon={<AlertTriangle className="size-4" />}
          tone="warning"
        />
        <Kpi
          label="Risque prescription"
          value={`${criticalCount + highCount}`}
          icon={<ShieldAlert className="size-4" />}
          tone="danger"
          subtitle={
            criticalCount > 0
              ? `${criticalCount} critique${criticalCount > 1 ? 's' : ''}`
              : 'aucun risque'
          }
        />
      </div>

      {/* Prescription Risk — the killer feature */}
      <section className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50/50 to-orange-50/30 p-6 dark:border-red-900/30 dark:from-red-950/10 dark:to-orange-950/10">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="size-5 text-red-600" />
          <h2 className="text-base font-bold text-red-800 dark:text-red-200">
            {t('gestionnaire.recouvrement.prescriptionRisk')}
          </h2>
          <Badge
            variant="outline"
            className="ml-2 border-red-300 bg-white text-[10px] text-red-700"
          >
            {t('gestionnaire.recouvrement.prescriptionBadge')}
          </Badge>
        </div>
        <p className="mb-4 text-xs text-red-700/80 dark:text-red-300/80">
          Les créances de charges de copropriété sont prescrites après 5 ans
          sans interruption. Une action légale immédiate est requise pour les
          créances à statut critique.
        </p>

        {data?.prescription_risks.length === 0 ? (
          <div className="rounded-lg bg-white/60 px-4 py-6 text-center text-sm text-muted-foreground dark:bg-card">
            ✓ Aucun risque de prescription identifié
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-red-200/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.coproprietaire')}</TableHead>
                  <TableHead>{t('common.lot')}</TableHead>
                  <TableHead className="text-right">
                    {t('common.amount')}
                  </TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead className="text-right">Jours restants</TableHead>
                  <TableHead>{t('common.severity')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.prescription_risks.map((r) => (
                  <TableRow key={r.coproprietaire_id}>
                    <TableCell className="font-medium text-sm">
                      {r.coproprietaire_nom}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.lot_numero}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmt.format(r.montant)} DH
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat('fr-MA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      }).format(new Date(r.date_origine))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          r.severite === 'critical' && 'text-red-600',
                          r.severite === 'high' && 'text-orange-600',
                        )}
                      >
                        {r.jours_restants}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          SEVERITY_META[r.severite].cls,
                        )}
                      >
                        {SEVERITY_META[r.severite].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Lots en retard */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('gestionnaire.recouvrement.allLateLots')}
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.lot')}</TableHead>
                <TableHead>{t('common.coproprietaire')}</TableHead>
                <TableHead className="text-right">
                  {t('common.amountDue')}
                </TableHead>
                <TableHead className="text-right">
                  {t('gestionnaire.recouvrement.penalties')}
                </TableHead>
                <TableHead className="text-right">
                  {t('gestionnaire.recouvrement.age')}
                </TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.lots ?? []).map((l) => (
                <TableRow key={l.lot_id}>
                  <TableCell className="font-mono text-sm">
                    {l.lot_numero}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {l.coproprietaire_nom}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt.format(l.montant_du)} DH
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-amber-600">
                    {fmt.format(l.montant_penalites)} DH
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {l.anciennete_jours} j
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        STATUS_BADGES[l.statut]?.cls,
                      )}
                    >
                      {STATUS_BADGES[l.statut]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      disabled={l.statut !== 'en_retard' || mdMut.isPending}
                      onClick={() => mdMut.mutate(l.lot_id)}
                    >
                      <Mail className="size-3" />
                      Mise en demeure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  tone: 'primary' | 'danger' | 'warning' | 'muted'
  subtitle?: string
}) {
  const toneClasses = {
    primary:
      'bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]',
    danger: 'bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400',
    warning:
      'bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground',
  }[tone]

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-lg',
            toneClasses,
          )}
        >
          {icon}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
