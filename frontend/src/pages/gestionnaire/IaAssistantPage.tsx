import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useResidenceStore } from '@/stores/residenceStore'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Sparkles,
  Shield,
  FileSearch,
  Lightbulb,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { getResidences } from '@/services/gestionnaire.service'
import {
  runComplianceAudit,
  extractInvoiceData,
  suggestBudget,
  type ComplianceAudit,
  type ComplianceFindingSeverity,
  type InvoiceExtraction,
  type BudgetSuggestion,
} from '@/services/ia.service'

type Tool = 'audit' | 'invoice' | 'budget'

const fmt = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const SEVERITY_META: Record<
  ComplianceFindingSeverity,
  { label: string; cls: string; icon: typeof AlertTriangle }
> = {
  critical: {
    label: 'Critique',
    cls: 'border-red-300 bg-red-50 text-red-700',
    icon: AlertCircle,
  },
  high: {
    label: 'Élevé',
    cls: 'border-orange-300 bg-orange-50 text-orange-700',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Modéré',
    cls: 'border-amber-300 bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
  low: {
    label: 'Faible',
    cls: 'border-blue-300 bg-blue-50 text-blue-700',
    icon: Info,
  },
  info: {
    label: 'Info',
    cls: 'border-gray-200 bg-gray-50 text-gray-600',
    icon: Info,
  },
}

export function IaAssistantPage() {
  const { t } = useTranslation()
  const [tool, setTool] = useState<Tool>('audit')
  const globalResidenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const residenceId = globalResidenceId ?? residencesQ.data?.[0]?.id ?? null

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header — gradient AI badge */}
      <div className="rounded-2xl border-2 border-[var(--color-imaro-primary)]/20 bg-gradient-to-br from-[var(--color-imaro-primary)]/10 via-[#E67E22]/5 to-purple-100/30 p-4 sm:p-6 dark:from-[var(--color-imaro-primary)]/20 dark:via-[#E67E22]/10 dark:to-purple-900/10">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-imaro-primary)] to-purple-600 text-white shadow-lg">
            <Sparkles className="size-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {t('gestionnaire.ia.title')}
              </h1>
              <Badge
                variant="outline"
                className="border-purple-300 bg-white/80 text-[10px] text-purple-700"
              >
                BETA
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('gestionnaire.ia.subtitle')}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('gestionnaire.ia.poweredBy')}
            </p>
          </div>
        </div>
      </div>

      {/* Tool tabs */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ToolCard
          active={tool === 'audit'}
          icon={<Shield className="size-5" />}
          title={t('gestionnaire.ia.toolAuditTitle')}
          description={t('gestionnaire.ia.toolAuditDesc')}
          onClick={() => setTool('audit')}
          accent="navy"
        />
        <ToolCard
          active={tool === 'invoice'}
          icon={<FileSearch className="size-5" />}
          title={t('gestionnaire.ia.toolInvoiceTitle')}
          description={t('gestionnaire.ia.toolInvoiceDesc')}
          onClick={() => setTool('invoice')}
          accent="orange"
        />
        <ToolCard
          active={tool === 'budget'}
          icon={<Lightbulb className="size-5" />}
          title={t('gestionnaire.ia.toolBudgetTitle')}
          description={t('gestionnaire.ia.toolBudgetDesc')}
          onClick={() => setTool('budget')}
          accent="purple"
        />
      </div>

      {/* Residence selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">{t('common.residence')}</label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setResidenceId(Number(v))}
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

      {/* Tool content */}
      {tool === 'audit' && <AuditTool residenceId={residenceId} />}
      {tool === 'invoice' && <InvoiceTool />}
      {tool === 'budget' && <BudgetTool residenceId={residenceId} />}
    </div>
  )
}

// ─── Tool 1: Audit conformité ─────────────────────────────────────────────────

function AuditTool({ residenceId }: { residenceId: number | null }) {
  const { t } = useTranslation()
  const [exercice] = useState(2026)
  const [audit, setAudit] = useState<ComplianceAudit | null>(null)

  const runMut = useMutation({
    mutationFn: () => runComplianceAudit(residenceId!, exercice),
    onSuccess: (data) => {
      setAudit(data)
      toast.success(
        t('gestionnaire.ia.auditDone', { score: data.overall_score }),
      )
    },
    onError: () => toast.error(t('gestionnaire.ia.auditError')),
  })

  if (!audit) {
    return (
      <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-imaro-primary)] to-purple-600 text-white shadow-lg">
          <Shield className="size-8" />
        </div>
        <h2 className="text-lg font-bold">
          {t('gestionnaire.ia.auditEmptyTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t('gestionnaire.ia.auditEmptyDesc')}
        </p>
        <Button
          size="lg"
          className="mt-6 gap-2"
          onClick={() => runMut.mutate()}
          disabled={!residenceId || runMut.isPending}
        >
          {runMut.isPending ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              {t('gestionnaire.ia.analyzing')}
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              {t('gestionnaire.ia.runAudit')}
            </>
          )}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          {t('gestionnaire.ia.auditHint')}
        </p>
      </div>
    )
  }

  const findingsBySev = audit.findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1
      return acc
    },
    {} as Record<ComplianceFindingSeverity, number>,
  )

  const scoreColor =
    audit.overall_score >= 90
      ? 'text-green-600'
      : audit.overall_score >= 70
        ? 'text-amber-600'
        : audit.overall_score >= 50
          ? 'text-orange-600'
          : 'text-red-600'

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">
                {t('gestionnaire.ia.auditReport', {
                  name: audit.residence_name,
                })}
              </h2>
              <Badge
                variant="outline"
                className="border-purple-300 bg-purple-50 text-[10px] text-purple-700"
              >
                {t('gestionnaire.ia.exerciceBadge', { n: audit.exercice })}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {audit.summary}
            </p>

            {/* Severity counters */}
            <div className="mt-4 flex flex-wrap gap-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                const count = findingsBySev[sev] ?? 0
                if (count === 0) return null
                return (
                  <Badge
                    key={sev}
                    variant="outline"
                    className={cn('text-xs gap-1', SEVERITY_META[sev].cls)}
                  >
                    {t(`gestionnaire.ia.severity.${sev}`)} · {count}
                  </Badge>
                )
              })}
            </div>
          </div>

          <div className="text-center">
            <div className="relative size-24">
              <svg className="size-24 -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted-foreground/15"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={scoreColor}
                  stroke="currentColor"
                  strokeDasharray={`${(audit.overall_score / 100) * 251} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-2xl font-bold', scoreColor)}>
                  {audit.overall_score}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  / 100
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs font-medium capitalize">
              {audit.health_status}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="mt-4 gap-1.5"
          onClick={() => runMut.mutate()}
          disabled={runMut.isPending}
        >
          <RefreshCw
            className={cn('size-3.5', runMut.isPending && 'animate-spin')}
          />
          {t('gestionnaire.ia.rerunAudit')}
        </Button>
      </div>

      {/* Strengths */}
      <div className="rounded-xl border bg-green-50/50 p-4 dark:bg-green-950/10">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">
            {t('gestionnaire.ia.strengths')}
          </h3>
        </div>
        <ul className="space-y-1.5 text-sm text-green-700 dark:text-green-300">
          {audit.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Findings */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('gestionnaire.ia.attentionPoints', { n: audit.findings.length })}
        </h3>
        <div className="space-y-3">
          {audit.findings.map((f) => {
            const meta = SEVERITY_META[f.severity]
            const Icon = meta.icon
            return (
              <div
                key={f.id}
                className={cn(
                  'rounded-xl border-2 p-4',
                  meta.cls.replace('text-', 'border-').split(' ')[0],
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg',
                      meta.cls,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold">{f.title}</h4>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', meta.cls)}
                      >
                        {t(`gestionnaire.ia.severity.${f.severity}`)}
                      </Badge>
                      {f.reference && (
                        <Badge
                          variant="outline"
                          className="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
                        >
                          {f.reference}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {f.description}
                    </p>
                    <div className="mt-3 rounded-lg bg-card p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-imaro-primary)] mb-1">
                        {t('gestionnaire.ia.recommendedAction')}
                      </p>
                      <p className="text-sm">{f.recommendation}</p>
                    </div>
                    {f.impact_estimated && (
                      <p className="mt-2 text-xs text-red-600 font-medium">
                        ⚠ {f.impact_estimated}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Metadata */}
      <div className="rounded-lg border border-muted bg-muted/30 p-3 text-[10px] text-muted-foreground">
        {t('gestionnaire.ia.auditMeta', {
          model: audit.metadata.model,
          ms: audit.metadata.duration_ms,
          tokens: audit.metadata.tokens_used.toLocaleString(),
          date: new Date(audit.generated_at).toLocaleString('fr-MA'),
        })}
      </div>
    </div>
  )
}

// ─── Tool 2: Extraction facture ───────────────────────────────────────────────

function InvoiceTool() {
  const { t } = useTranslation()
  const [extraction, setExtraction] = useState<InvoiceExtraction | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mut = useMutation({
    mutationFn: (file: File) => extractInvoiceData(file),
    onSuccess: (data) => {
      setExtraction(data)
      toast.success(
        t('gestionnaire.ia.invoiceDone', {
          pct: (data.confidence * 100).toFixed(0),
        }),
      )
    },
    onError: () => toast.error(t('gestionnaire.ia.invoiceError')),
  })

  const onFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setExtraction(null)
    mut.mutate(file)
  }

  if (!extraction && !mut.isPending) {
    return (
      <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E67E22] to-amber-600 text-white shadow-lg">
          <FileSearch className="size-8" />
        </div>
        <h2 className="text-lg font-bold">
          {t('gestionnaire.ia.invoiceEmptyTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t('gestionnaire.ia.invoiceEmptyDesc')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          size="lg"
          className="mt-6 gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          {t('gestionnaire.ia.chooseInvoice')}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          {t('gestionnaire.ia.acceptedFormats')}
        </p>
      </div>
    )
  }

  if (mut.isPending) {
    return (
      <div className="rounded-2xl border-2 bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E67E22] to-amber-600 text-white shadow-lg">
          <Sparkles className="size-8 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold">{t('gestionnaire.ia.analyzing')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('gestionnaire.ia.analyzingInvoice', { fileName })}
        </p>
        <div className="mx-auto mt-6 h-2 max-w-xs overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#E67E22] to-amber-500" />
        </div>
      </div>
    )
  }

  if (!extraction) return null

  return (
    <div className="space-y-4">
      {/* Confidence bar */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-[var(--color-imaro-primary)]" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs gap-1',
              extraction.confidence >= 0.9
                ? 'border-green-300 bg-green-50 text-green-700'
                : extraction.confidence >= 0.7
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-red-300 bg-red-50 text-red-700',
            )}
          >
            <Sparkles className="size-3" />
            {t('gestionnaire.ia.confidence', {
              pct: (extraction.confidence * 100).toFixed(0),
            })}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {t('gestionnaire.ia.newInvoice')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {/* Extracted fields */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field
          label={t('gestionnaire.ia.fournisseur')}
          value={extraction.fournisseur}
        />
        <Field label="ICE" value={extraction.fournisseur_ice ?? '—'} mono />
        <Field
          label={t('common.date')}
          value={new Date(extraction.date).toLocaleDateString('fr-MA')}
        />
        <Field
          label={t('gestionnaire.ia.numeroFacture')}
          value={extraction.numero_facture ?? '—'}
          mono
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field
          label="HT"
          value={
            extraction.montant_ht
              ? `${fmt.format(extraction.montant_ht)} DH`
              : '—'
          }
        />
        <Field
          label="TVA"
          value={
            extraction.montant_tva
              ? `${fmt.format(extraction.montant_tva)} DH`
              : '—'
          }
        />
        <Field
          label="TTC"
          value={`${fmt.format(extraction.montant_ttc)} DH`}
          highlight
        />
      </div>

      {/* Description */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {t('common.description')}
        </p>
        <p className="text-sm">{extraction.description}</p>
      </div>

      {/* Line items */}
      {extraction.ligne_items && extraction.ligne_items.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('gestionnaire.ia.detectedLines')}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.libelle')}</TableHead>
                <TableHead className="text-right">
                  {t('common.amount')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extraction.ligne_items.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{l.libelle}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {fmt.format(l.montant)} DH
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Suggested classification */}
      <div className="rounded-xl border-2 border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-[var(--color-imaro-primary)]" />
          <p className="text-sm font-semibold text-[var(--color-imaro-primary)]">
            {t('gestionnaire.ia.classification')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('common.categorie')}
            value={extraction.categorie_suggeree.replace(/_/g, ' ')}
          />
          <Field
            label={t('gestionnaire.ia.compteComptable')}
            value={extraction.compte_comptable_suggere}
            mono
          />
        </div>
      </div>

      {/* Warnings */}
      {extraction.warnings && extraction.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
            {extraction.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setExtraction(null)
            setFileName('')
          }}
        >
          {t('actions.cancel')}
        </Button>
        <Button size="sm" className="gap-1.5">
          <CheckCircle2 className="size-4" />
          {t('gestionnaire.ia.createExpense')}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        {t('gestionnaire.ia.invoiceMeta', {
          model: extraction.metadata.model,
          ms: extraction.metadata.duration_ms,
          count: extraction.metadata.page_count,
        })}
      </p>
    </div>
  )
}

// ─── Tool 3: Suggestions budget ───────────────────────────────────────────────

function BudgetTool({ residenceId }: { residenceId: number | null }) {
  const { t } = useTranslation()
  const [exerciceCible, setExerciceCible] = useState(2027)
  const [suggestion, setSuggestion] = useState<BudgetSuggestion | null>(null)

  const mut = useMutation({
    mutationFn: () => suggestBudget(residenceId!, exerciceCible),
    onSuccess: (data) => {
      setSuggestion(data)
      toast.success(
        t('gestionnaire.ia.budgetDone', {
          variation: `${data.variation_globale_pct >= 0 ? '+' : ''}${data.variation_globale_pct.toFixed(1)}%`,
        }),
      )
    },
    onError: () => toast.error(t('gestionnaire.ia.budgetError')),
  })

  if (!suggestion) {
    return (
      <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
          <Lightbulb className="size-8" />
        </div>
        <h2 className="text-lg font-bold">
          {t('gestionnaire.ia.budgetEmptyTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t('gestionnaire.ia.budgetEmptyDesc')}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <label className="text-sm font-medium">
            {t('gestionnaire.ia.exerciceCible')}
          </label>
          <Select
            value={String(exerciceCible)}
            onValueChange={(v) => setExerciceCible(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="lg"
          className="mt-6 gap-2"
          onClick={() => mut.mutate()}
          disabled={!residenceId || mut.isPending}
        >
          {mut.isPending ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              {t('gestionnaire.ia.analyzing')}
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              {t('gestionnaire.ia.generateSuggestions')}
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {t('gestionnaire.ia.budgetNMinus1')}
          </p>
          <p className="text-xl font-bold tracking-tight">
            {fmt.format(suggestion.total_charges_n_minus_1)} DH
          </p>
        </div>
        <div className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4 dark:bg-purple-950/20">
          <p className="text-xs text-purple-600 mb-1 flex items-center gap-1">
            <Sparkles className="size-3" />{' '}
            {t('gestionnaire.ia.suggestionBudget', {
              n: suggestion.exercice_cible,
            })}
          </p>
          <p className="text-xl font-bold tracking-tight text-purple-700">
            {fmt.format(suggestion.total_charges_suggere)} DH
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <TrendingUp className="size-3" />{' '}
            {t('gestionnaire.ia.variationGlobale')}
          </p>
          <p
            className={cn(
              'text-xl font-bold tracking-tight',
              suggestion.variation_globale_pct >= 0
                ? 'text-orange-600'
                : 'text-green-600',
            )}
          >
            {suggestion.variation_globale_pct >= 0 ? '+' : ''}
            {suggestion.variation_globale_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Hypothèses */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t('gestionnaire.ia.hypotheses')}
        </p>
        <ul className="space-y-1.5 text-sm">
          {suggestion.hypotheses.map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--color-imaro-primary)]" />
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Table des suggestions */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('gestionnaire.ia.colCompte')}</TableHead>
              <TableHead className="text-right">
                {t('gestionnaire.ia.colRealise')}
              </TableHead>
              <TableHead className="text-right">
                {t('gestionnaire.ia.colSuggere', {
                  n: suggestion.exercice_cible,
                })}
              </TableHead>
              <TableHead className="text-right">Δ</TableHead>
              <TableHead>{t('gestionnaire.ia.colJustif')}</TableHead>
              <TableHead>{t('gestionnaire.ia.colConf')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestion.lignes.map((l) => {
              const confColor =
                l.confidence === 'high'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : l.confidence === 'medium'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-red-200 bg-red-50 text-red-700'
              return (
                <TableRow key={l.compte_numero}>
                  <TableCell className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {l.compte_numero}
                    </span>{' '}
                    <span className="font-medium">{l.compte_libelle}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {fmt.format(l.realise_n_minus_1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium text-purple-700">
                    {fmt.format(l.suggestion_n_plus_1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    <span
                      className={cn(
                        'font-medium',
                        l.variation_pct > 5
                          ? 'text-orange-600'
                          : l.variation_pct < 0
                            ? 'text-green-600'
                            : 'text-muted-foreground',
                      )}
                    >
                      {l.variation_pct >= 0 ? '+' : ''}
                      {l.variation_pct.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">
                    {l.justification}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', confColor)}
                    >
                      {t(`gestionnaire.ia.conf.${l.confidence}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
        >
          <RefreshCw
            className={cn('size-3.5 me-1.5', mut.isPending && 'animate-spin')}
          />
          {t('gestionnaire.ia.regenerate')}
        </Button>
        <Button size="sm" className="gap-1.5">
          <CheckCircle2 className="size-4" />
          {t('gestionnaire.ia.applyBudget', { n: suggestion.exercice_cible })}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        {t('gestionnaire.ia.budgetMeta', {
          model: suggestion.metadata.model,
          ms: suggestion.metadata.duration_ms,
          tokens: suggestion.metadata.tokens_used.toLocaleString(),
        })}
      </p>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToolCard({
  active,
  icon,
  title,
  description,
  onClick,
  accent,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  accent: 'navy' | 'orange' | 'purple'
}) {
  const accentClasses = {
    navy: active
      ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)] text-white'
      : 'border-border bg-card hover:border-[var(--color-imaro-primary)]/40',
    orange: active
      ? 'border-[#E67E22] bg-[#E67E22] text-white'
      : 'border-border bg-card hover:border-[#E67E22]/40',
    purple: active
      ? 'border-purple-600 bg-purple-600 text-white'
      : 'border-border bg-card hover:border-purple-400',
  }[accent]
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-4 text-left transition-all',
        accentClasses,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <p
        className={cn(
          'text-xs',
          active ? 'text-white/80' : 'text-muted-foreground',
        )}
      >
        {description}
      </p>
    </button>
  )
}

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3',
        highlight &&
          'border-[var(--color-imaro-primary)]/30 bg-[var(--color-imaro-primary)]/5',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-sm font-medium',
          mono && 'font-mono',
          highlight && 'text-[var(--color-imaro-primary)] text-base font-bold',
        )}
      >
        {value}
      </p>
    </div>
  )
}
