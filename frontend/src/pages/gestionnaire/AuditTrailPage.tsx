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
import { cn } from '@/lib/utils'
import {
  getAuditLogs,
  type AuditLogCategory,
  type AuditLogSeverity,
} from '@/services/conformite.service'

const CATEGORIES: { value: AuditLogCategory; label: string }[] = [
  { value: 'immeuble', label: 'Immeuble' },
  { value: 'lot', label: 'Lot' },
  { value: 'coproprietaire', label: 'Copropriétaire' },
  { value: 'paiement', label: 'Paiement' },
  { value: 'depense', label: 'Dépense' },
  { value: 'budget', label: 'Budget' },
  { value: 'ag', label: 'Assemblée' },
  { value: 'document', label: 'Document' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'auth', label: 'Authentification' },
  { value: 'system', label: 'Système' },
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
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="size-4" />
          Exporter CSV
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
          Actualiser
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
          label="Erreurs"
          value={stats.errors}
          icon={<AlertCircle className="size-4" />}
          tone="danger"
        />
        <Kpi
          label="Actions sensibles"
          value={stats.sensitive}
          icon={<ShieldAlert className="size-4" />}
          tone="warning"
        />
        <Kpi
          label="Taux d'erreur"
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
                {c.label}
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
            <SelectItem value="__all__">Toutes</SelectItem>
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
              <TableHead>Horodatage</TableHead>
              <TableHead>{t('common.severity')}</TableHead>
              <TableHead>{t('common.categorie')}</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>{t('gestionnaire.audit.colBy')}</TableHead>
              <TableHead>Cible</TableHead>
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
                  Chargement...
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
                    <Button variant="ghost" size="icon" className="size-7">
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
