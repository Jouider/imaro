import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ShieldAlert,
  AlertCircle,
  Eye,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getAuditLogs,
  type AuditLog,
  type AuditLogCategory,
  type AuditLogSeverity,
} from '@/services/conformite.service'
import { ResidenceFilter } from '@/components/shared'

const CATEGORIES: { value: AuditLogCategory; label: string }[] = [
  { value: 'immeuble', label: 'immeuble' },
  { value: 'lot', label: 'lot' },
  { value: 'coproprietaire', label: 'coproprietaire' },
  { value: 'paiement', label: 'paiement' },
  { value: 'depense', label: 'depense' },
  { value: 'budget', label: 'budget' },
  { value: 'ag', label: 'ag' },
  { value: 'document', label: 'document' },
  { value: 'user', label: 'user' },
  { value: 'auth', label: 'auth' },
  { value: 'system', label: 'system' },
]

const SEVERITY_STYLES: Record<AuditLogSeverity, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30',
  warning:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30',
  sensitive:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/30',
  error:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30',
}

const SEVERITY_LABELS: Record<AuditLogSeverity, string> = {
  info: 'Info',
  warning: 'Avertissement',
  sensitive: 'Sensible',
  error: 'Erreur',
}

const dt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function AuditTrailPage() {
  const { t } = useTranslation()

  const [category, setCategory] = useState<AuditLogCategory | ''>('')
  const [severity, setSeverity] = useState<AuditLogSeverity | ''>('')
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const auditQ = useQuery({
    queryKey: ['audit-logs', { category, severity, search }],
    queryFn: () =>
      getAuditLogs({
        category: category || undefined,
        severity: severity || undefined,
        search: search || undefined,
      }),
  })

  const logs = auditQ.data?.logs ?? []
  const stats = auditQ.data?.stats ?? {
    total: 0,
    errors: 0,
    sensitive: 0,
    error_rate: 0,
  }

  // KAN-131 : export CSV des lignes actuellement filtrées (généré côté client).
  function handleExportCsv() {
    if (logs.length === 0) {
      toast.info(
        t('gestionnaire.audit.exportEmpty', {
          defaultValue: 'Aucune ligne à exporter',
        }),
      )
      return
    }
    const headers = [
      t('gestionnaire.audit.colDate', { defaultValue: 'Date' }),
      t('gestionnaire.audit.colCategory', { defaultValue: 'Catégorie' }),
      t('gestionnaire.audit.colAction', { defaultValue: 'Action' }),
      t('gestionnaire.audit.colSeverity', { defaultValue: 'Sévérité' }),
      t('gestionnaire.audit.colUser', { defaultValue: 'Utilisateur' }),
      t('gestionnaire.audit.colTarget', { defaultValue: 'Cible' }),
      'IP',
    ]
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = logs.map((l) =>
      [
        dt.format(new Date(l.created_at)),
        l.category,
        l.action,
        SEVERITY_LABELS[l.severity],
        l.user_email ?? '',
        l.target_label ?? '',
        l.ip_address ?? '',
      ]
        .map((c) => esc(String(c)))
        .join(';'),
    )
    // BOM UTF-8 pour qu'Excel lise correctement les accents.
    const csv = '﻿' + [headers.map(esc).join(';'), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(
      t('gestionnaire.audit.exportDone', {
        defaultValue: 'Export CSV téléchargé',
      }),
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <Activity className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.audit.title', { defaultValue: "Journal d'audit" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.audit.subtitle', {
              defaultValue:
                'Traçabilité complète des actions sur la plateforme',
            })}
          </p>
        </div>
        <ResidenceFilter />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExportCsv}
        >
          <Download className="size-4" />
          {t('gestionnaire.audit.exportCsv')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => auditQ.refetch()}
        >
          <RefreshCw
            className={cn('size-4', auditQ.isFetching && 'animate-spin')}
          />
          {t('gestionnaire.audit.refresh')}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          label={t('gestionnaire.audit.totalEvents')}
          value={stats.total}
          icon={<Activity className="size-4" />}
          tone="primary"
        />
        <Kpi
          label={t('gestionnaire.audit.errors')}
          value={stats.errors}
          icon={<AlertCircle className="size-4" />}
          tone="danger"
        />
        <Kpi
          label={t('gestionnaire.audit.sensitiveActions')}
          value={stats.sensitive}
          icon={<ShieldAlert className="size-4" />}
          tone="warning"
        />
        <Kpi
          label={t('gestionnaire.audit.errorRate')}
          value={`${stats.error_rate.toFixed(1)}%`}
          icon={<Activity className="size-4" />}
          tone="muted"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
        <Filter className="size-4 text-muted-foreground" />
        <Input
          placeholder={t('gestionnaire.audit.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={category || '__all__'}
          onValueChange={(v) =>
            setCategory(v === '__all__' ? '' : (v as AuditLogCategory))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('common.categorie')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              {t('gestionnaire.audit.allCategories')}
            </SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {t(`gestionnaire.audit.categoryLabels.${c.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={severity || '__all__'}
          onValueChange={(v) =>
            setSeverity(v === '__all__' ? '' : (v as AuditLogSeverity))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('common.severity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              {t('gestionnaire.audit.allFilter')}
            </SelectItem>
            {(['info', 'warning', 'sensitive', 'error'] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('gestionnaire.audit.colHorodatage')}</TableHead>
              <TableHead>{t('common.severity')}</TableHead>
              <TableHead>{t('common.categorie')}</TableHead>
              <TableHead>{t('common.action')}</TableHead>
              <TableHead>{t('gestionnaire.audit.colBy')}</TableHead>
              <TableHead>{t('gestionnaire.audit.colCible')}</TableHead>
              <TableHead className="text-right">
                {t('gestionnaire.audit.colDetails')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditQ.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  {t('common.chargement')}
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-12"
                >
                  {t('gestionnaire.audit.empty')}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {dt.format(new Date(log.created_at))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', SEVERITY_STYLES[log.severity])}
                    >
                      {SEVERITY_LABELS[log.severity]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {log.category}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.action}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.user_email ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.target_label ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setSelectedLog(log)}
                      title={t('gestionnaire.audit.view', {
                        defaultValue: 'Voir',
                      })}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Détail d'une ligne (KAN-131) */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(o) => !o && setSelectedLog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              {selectedLog?.action}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && dt.format(new Date(selectedLog.created_at))}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">
                {t('gestionnaire.audit.colSeverity', {
                  defaultValue: 'Sévérité',
                })}
              </dt>
              <dd className="col-span-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px]',
                    SEVERITY_STYLES[selectedLog.severity],
                  )}
                >
                  {SEVERITY_LABELS[selectedLog.severity]}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">
                {t('gestionnaire.audit.colCategory', {
                  defaultValue: 'Catégorie',
                })}
              </dt>
              <dd className="col-span-2">{selectedLog.category}</dd>
              <dt className="text-muted-foreground">
                {t('gestionnaire.audit.colUser', {
                  defaultValue: 'Utilisateur',
                })}
              </dt>
              <dd className="col-span-2 break-all">
                {selectedLog.user_email ?? '—'}
              </dd>
              <dt className="text-muted-foreground">
                {t('gestionnaire.audit.colTarget', { defaultValue: 'Cible' })}
              </dt>
              <dd className="col-span-2">
                {selectedLog.target_label ??
                  (selectedLog.target_type
                    ? `${selectedLog.target_type} #${selectedLog.target_id ?? ''}`
                    : '—')}
              </dd>
              <dt className="text-muted-foreground">IP</dt>
              <dd className="col-span-2 font-mono text-xs">
                {selectedLog.ip_address ?? '—'}
              </dd>
              {selectedLog.payload && (
                <>
                  <dt className="text-muted-foreground">
                    {t('gestionnaire.audit.colDetails', {
                      defaultValue: 'Détails',
                    })}
                  </dt>
                  <dd className="col-span-2">
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </dd>
                </>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  tone: 'primary' | 'danger' | 'warning' | 'muted'
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
    </div>
  )
}
