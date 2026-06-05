import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Landmark,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getVirementsDeclares,
  validerVirement,
} from '@/services/paiements.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  BANQUES,
  parseBankStatement,
  autoMatchAll,
  getMockParseResult,
  getMockTargets,
  buildVirementTargets,
  computeStats,
  type Banque,
  type ParseResult,
  type Match,
  type MatchableTarget,
} from '@/services/pointage.service'

const fmt = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function PointagePage() {
  const { t } = useTranslation()

  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [matches, setMatches] = useState<Record<string, Match | null>>({})
  const [filter, setFilter] = useState<
    'all' | 'auto' | 'suggested' | 'unmatched'
  >('all')
  const [banque, setBanque] = useState<Banque>('attijariwafa')
  const [parsing, setParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Paiements déclarés par les résidents (portail) → cibles de rapprochement.
  const { data: virements = [] } = useQuery({
    queryKey: ['virements-declares'],
    queryFn: () => getVirementsDeclares(),
  })

  // Cibles = paiements/dépenses attendus (mock) + paiements déclarés résidents.
  const targets: MatchableTarget[] = useMemo(
    () => [...getMockTargets(), ...buildVirementTargets(virements)],
    [virements],
  )

  const stats = useMemo(() => {
    if (!parsed) return null
    return computeStats(parsed, matches)
  }, [parsed, matches])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    setParsing(true)
    try {
      const result = await parseBankStatement(file, banque)
      setParsed(result)
      // Run auto-matching immediately
      const newMatches = autoMatchAll(result.lines, targets)
      setMatches(newMatches)
      toast.success(
        t('gestionnaire.pointage.importedMsg', {
          total: result.totalLines,
          auto: Object.values(newMatches).filter(
            (m) => m?.confidence === 'auto',
          ).length,
        }),
      )
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('gestionnaire.pointage.parseError'),
      )
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleLoadDemo = () => {
    const demo = getMockParseResult()
    setParsed(demo)
    const newMatches = autoMatchAll(demo.lines, targets)
    setMatches(newMatches)
    toast.success(t('gestionnaire.pointage.demoLoaded', { n: demo.totalLines }))
  }

  const handleConfirm = (lineId: string) => {
    const match = matches[lineId]
    if (!match) return
    setMatches((prev) => ({
      ...prev,
      [lineId]: { ...match, status: 'confirmed' },
    }))
    // Si la ligne rapproche un paiement déclaré par un résident, on valide le
    // virement déclaré : l'argent est confirmé reçu sur le relevé du syndic.
    if (match.declared && match.virementId) {
      void validerVirement(match.virementId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['virements-declares'] })
          toast.success(t('gestionnaire.pointage.declaredConfirmed'))
        })
        .catch(() => toast.error(t('gestionnaire.pointage.declaredError')))
    } else {
      toast.success(t('gestionnaire.pointage.matchConfirmed'))
    }
  }

  const handleReject = (lineId: string) => {
    setMatches((prev) => ({ ...prev, [lineId]: null }))
    toast.info(t('gestionnaire.pointage.toastMatchRejected'))
  }

  const handleReset = () => {
    setParsed(null)
    setMatches({})
  }

  // ── Filtered lines ─────────────────────────────────────────────────────────

  const filteredLines = useMemo(() => {
    if (!parsed) return []
    return parsed.lines.filter((l) => {
      const m = matches[l.id]
      if (filter === 'all') return true
      if (filter === 'auto') return m?.confidence === 'auto'
      if (filter === 'suggested') return m?.confidence === 'suggested'
      if (filter === 'unmatched') return !m
      return true
    })
  }, [parsed, matches, filter])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <Landmark className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.pointage.title', {
              defaultValue: 'Pointage bancaire',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.pointage.subtitle', {
              defaultValue:
                'Rapprochement automatique du relevé bancaire avec vos paiements et dépenses',
            })}
          </p>
        </div>
        {parsed && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleReset}
          >
            <RefreshCw className="size-4" />
            {t('gestionnaire.pointage.newPointage')}
          </Button>
        )}
      </div>

      {/* Empty state — file upload */}
      {!parsed && (
        <div className="space-y-6">
          {/* Bank selector + drop zone */}
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[240px] space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Banque source
                </label>
                <Select
                  value={banque}
                  onValueChange={(v) => setBanque(v as Banque)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANQUES.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                Importez le relevé bancaire au format CSV ou Excel exporté
                depuis votre espace bancaire en ligne. Imaro détecte
                automatiquement les colonnes (date, libellé, débit, crédit).
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 text-center',
                'transition-colors hover:border-[var(--color-imaro-primary)]/40 hover:bg-[var(--color-imaro-primary)]/5',
                parsing && 'opacity-60 pointer-events-none',
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-imaro-primary)]/10">
                <Upload className="size-6 text-[var(--color-imaro-primary)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('gestionnaire.pointage.dropHint')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('gestionnaire.pointage.formatsHint')}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="bank-statement-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                size="sm"
                className="gap-2"
              >
                {parsing ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Choisir un fichier
              </Button>
            </div>

            {/* Demo button */}
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
              <Sparkles className="size-4 text-amber-600" />
              <p className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                Pas de fichier sous la main ? Chargez le jeu de démo (relevé
                Attijariwafa avec 10 lignes pour résidence Atlas).
              </p>
              <Button variant="outline" size="sm" onClick={handleLoadDemo}>
                {t('gestionnaire.pointage.demo')}
              </Button>
            </div>
          </div>

          {/* Supported banks */}
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('gestionnaire.pointage.supportedBanks')}
            </p>
            <div className="flex flex-wrap gap-2">
              {BANQUES.filter((b) => b.code !== 'autre').map((b) => (
                <Badge
                  key={b.code}
                  variant="outline"
                  className="border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 text-[var(--color-imaro-primary)]"
                >
                  {b.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loaded statement view */}
      {parsed && stats && (
        <>
          {/* Source banner */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <Landmark className="size-4 text-[var(--color-imaro-primary)]" />
            <div className="flex-1 text-sm">
              <span className="font-semibold">{parsed.fileName}</span>
              <span className="ml-2 text-muted-foreground">
                · {BANQUES.find((b) => b.code === parsed.banque)?.label}
                {parsed.periode.from && (
                  <>
                    {' '}
                    · {dt.format(new Date(parsed.periode.from))} →{' '}
                    {dt.format(new Date(parsed.periode.to))}
                  </>
                )}
              </span>
            </div>
            <Badge
              variant="outline"
              className="border-[var(--color-imaro-primary)]/30 bg-[var(--color-imaro-primary)]/5 text-[var(--color-imaro-primary)] text-xs"
            >
              {parsed.totalLines} lignes
            </Badge>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi
              label={t('gestionnaire.pointage.credits')}
              value={`${fmt.format(stats.total_credit)} DH`}
              icon={<ArrowDownToLine className="size-4" />}
              tone="success"
            />
            <Kpi
              label={t('gestionnaire.pointage.debits')}
              value={`${fmt.format(stats.total_debit)} DH`}
              icon={<ArrowUpFromLine className="size-4" />}
              tone="warning"
            />
            <Kpi
              label={t('gestionnaire.pointage.autoMatched')}
              value={`${stats.auto_matched} / ${stats.total_lines}`}
              icon={<Sparkles className="size-4" />}
              tone="primary"
              subtitle={`${Math.round((stats.auto_matched / stats.total_lines) * 100)}%`}
            />
            <Kpi
              label={t('gestionnaire.pointage.toCheck')}
              value={`${stats.suggested + stats.unmatched}`}
              icon={<AlertTriangle className="size-4" />}
              tone={stats.suggested + stats.unmatched > 0 ? 'warning' : 'muted'}
              subtitle={`${stats.suggested} suggérées · ${stats.unmatched} sans match`}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              Toutes ({stats.total_lines})
            </FilterChip>
            <FilterChip
              active={filter === 'auto'}
              onClick={() => setFilter('auto')}
            >
              <CheckCircle2 className="me-1.5 size-3.5" />
              {t('gestionnaire.pointage.autoMatchedCount', {
                n: stats.auto_matched,
              })}
            </FilterChip>
            <FilterChip
              active={filter === 'suggested'}
              onClick={() => setFilter('suggested')}
            >
              <AlertTriangle className="me-1.5 size-3.5" />
              Suggérées ({stats.suggested})
            </FilterChip>
            <FilterChip
              active={filter === 'unmatched'}
              onClick={() => setFilter('unmatched')}
            >
              <XCircle className="me-1.5 size-3.5" />
              Non rapprochées ({stats.unmatched})
            </FilterChip>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t('common.date')}</TableHead>
                  <TableHead>
                    {t('gestionnaire.pointage.colLibelleBancaire')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('common.debit')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('common.credit')}
                  </TableHead>
                  <TableHead>Rapprochement Imaro</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-10"
                    >
                      {t('gestionnaire.pointage.noLineFilter')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLines.map((line) => {
                    const m = matches[line.id]
                    return (
                      <TableRow
                        key={line.id}
                        className={cn(
                          m?.status === 'confirmed' &&
                            'bg-green-50/50 dark:bg-green-950/10',
                        )}
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {dt.format(new Date(line.date))}
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-sm max-w-[280px] truncate"
                          title={line.libelle}
                        >
                          {line.libelle}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {line.debit > 0 ? (
                            <span className="text-orange-600">
                              {fmt.format(line.debit)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {line.credit > 0 ? (
                            <span className="text-green-600 font-medium">
                              {fmt.format(line.credit)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <MatchCell match={m} />
                        </TableCell>
                        <TableCell className="text-right">
                          {m && m.status !== 'confirmed' && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => handleConfirm(line.id)}
                                title={t('gestionnaire.pointage.confirmMatch')}
                              >
                                <CheckCircle2 className="size-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => handleReject(line.id)}
                                title={t('gestionnaire.pointage.rejectMatch')}
                              >
                                <XCircle className="size-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                          {m?.status === 'confirmed' && (
                            <Badge
                              variant="outline"
                              className="border-green-300 bg-green-50 text-[10px] text-green-700"
                            >
                              {t('gestionnaire.pointage.confirmed')}
                            </Badge>
                          )}
                          {!m && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                            >
                              Lier...
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Confirm all CTA */}
          {stats.auto_matched > 0 && (
            <div className="flex items-center justify-between rounded-xl border-2 border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="size-5 text-[var(--color-imaro-primary)]" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {stats.auto_matched} rapprochements automatiques prêts à
                    confirmer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Les paiements seront marqués comme reçus dans Imaro et liés
                    à ces lignes bancaires.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  const declaredIds: number[] = []
                  setMatches((prev) => {
                    const next = { ...prev }
                    Object.entries(next).forEach(([k, v]) => {
                      if (v?.confidence === 'auto' && v.status === 'pending') {
                        next[k] = { ...v, status: 'confirmed' }
                        if (v.declared && v.virementId)
                          declaredIds.push(v.virementId)
                      }
                    })
                    return next
                  })
                  if (declaredIds.length > 0) {
                    void Promise.all(
                      declaredIds.map((id) => validerVirement(id)),
                    ).then(() =>
                      queryClient.invalidateQueries({
                        queryKey: ['virements-declares'],
                      }),
                    )
                  }
                  toast.success(
                    t('gestionnaire.pointage.allConfirmed', {
                      count: stats.auto_matched,
                    }),
                  )
                }}
              >
                <CheckCircle2 className="size-4" />
                Tout confirmer
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  icon,
  tone,
  subtitle,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone: 'primary' | 'success' | 'warning' | 'muted'
  subtitle?: string
}) {
  const toneClasses = {
    primary:
      'bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]',
    success:
      'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400',
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
      <p className="text-xl font-bold tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)] text-white'
          : 'border-border bg-card text-muted-foreground hover:border-[var(--color-imaro-primary)]/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function MatchCell({ match }: { match: Match | null | undefined }) {
  const { t } = useTranslation()
  if (!match) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <XCircle className="size-3.5" />
        {t('gestionnaire.pointage.noMatch')}
      </span>
    )
  }
  const accent =
    match.confidence === 'auto'
      ? 'border-green-300 bg-green-50 text-green-700'
      : 'border-amber-300 bg-amber-50 text-amber-700'
  const icon =
    match.confidence === 'auto' ? (
      <CheckCircle2 className="size-3.5" />
    ) : (
      <AlertTriangle className="size-3.5" />
    )
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
            accent,
          )}
        >
          {icon}
          {match.confidence === 'auto' ? 'Auto' : 'Suggéré'}
          <span className="ml-1 opacity-60">
            ({Math.round(match.score * 100)}%)
          </span>
        </span>
        <span className="text-sm font-medium">{match.targetLabel}</span>
        {match.declared && (
          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-imaro-primary)]/30 bg-[var(--color-imaro-primary)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-imaro-primary)]">
            <UserCheck className="size-3" />
            {t('gestionnaire.pointage.declaredBadge')}
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {match.reasons.join(' · ')}
      </p>
    </div>
  )
}
