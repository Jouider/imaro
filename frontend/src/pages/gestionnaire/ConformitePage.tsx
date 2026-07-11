import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useResidenceStore } from '@/stores/residenceStore'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck,
  Calendar,
  Lock,
  Users,
  Archive,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  getComplianceCalendar,
  type CompliancePhase,
  type ComplianceTask,
} from '@/services/conformite.service'

const PHASE_META: Record<
  CompliancePhase,
  { label: string; icon: typeof Calendar; color: string }
> = {
  operations_mensuelles: {
    label: 'ops',
    icon: Calendar,
    color: 'var(--color-imaro-primary-light)',
  },
  cloture_exercice: {
    label: 'cloture',
    icon: Lock,
    color: '#E67E22',
  },
  preparation_ag: {
    label: 'prepAg',
    icon: Users,
    color: '#8E44AD',
  },
  archivage: { label: 'Archivage', icon: Archive, color: '#27AE60' },
}

const STATUS_STYLES: Record<ComplianceTask['status'], string> = {
  pending: 'text-muted-foreground',
  in_progress: 'text-blue-600 dark:text-blue-400',
  done: 'text-green-600 dark:text-green-400',
  skipped: 'text-muted-foreground line-through',
  overdue: 'text-red-600 dark:text-red-400',
}

const STATUS_BADGES: Record<
  ComplianceTask['status'],
  { label: string; cls: string }
> = {
  pending: {
    label: 'todo',
    cls: 'border-gray-200 bg-gray-50 text-gray-600',
  },
  in_progress: {
    label: 'in_progress',
    cls: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  done: {
    label: 'done',
    cls: 'border-green-200 bg-green-50 text-green-700',
  },
  skipped: {
    label: 'skipped',
    cls: 'border-gray-200 bg-gray-50 text-gray-400',
  },
  overdue: { label: 'En retard', cls: 'border-red-200 bg-red-50 text-red-700' },
}

export function ConformitePage() {
  const { t } = useTranslation()

  const globalResidenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)
  const [exercice, setExercice] = useState(2026)

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const residenceId = globalResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const calendarQ = useQuery({
    queryKey: ['compliance', residenceId, exercice],
    queryFn: () => getComplianceCalendar(residenceId!, exercice),
    enabled: !!residenceId,
  })

  const calendar = calendarQ.data
  const phases = calendar?.phases ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <CalendarCheck className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.conformite.title', {
              defaultValue: 'Calendrier de conformité',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.conformite.subtitle', {
              defaultValue: 'Cycle annuel de conformité — Décret 2.23.700',
            })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">{t('common.residence')}</label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setResidenceId(Number(v))}
        >
          <SelectTrigger className="w-64">
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

        <label className="text-sm font-medium">{t('common.exercice')}</label>
        <Select
          value={String(exercice)}
          onValueChange={(v) => setExercice(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overall progress */}
      {calendar && (
        <div className="rounded-xl border bg-gradient-to-br from-[var(--color-imaro-primary)]/5 to-[#E67E22]/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {t('gestionnaire.conformite.exerciceLabel', {
                    n: calendar.exercice,
                  })}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    calendar.regime === 'simplifie'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-blue-300 bg-blue-50 text-blue-700',
                  )}
                >
                  {calendar.regime === 'simplifie' ? 'PETIT' : 'NORMAL'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {calendar.regime === 'simplifie'
                  ? `Régime simplifié (≤ ${calendar.seuil_recettes.toLocaleString('fr-MA')} MAD/an)`
                  : 'Régime normal'}
              </p>
            </div>

            {/* Progress ring */}
            <div className="relative size-20">
              <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted-foreground/15"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="var(--color-imaro-primary)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${calendar.progression_pct * 2.13} 213`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[var(--color-imaro-primary)]">
                  {calendar.progression_pct}%
                </span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  Avancement
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase timeline */}
      {calendar && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('gestionnaire.conformite.timeline')}
          </h3>
          <div className="flex items-center gap-1">
            {phases.map((p, i) => {
              const meta = PHASE_META[p.phase]
              const Icon = meta.icon
              const isCurrent = p.progress_pct > 0 && p.progress_pct < 100
              const isDone = p.progress_pct === 100

              return (
                <div key={p.phase} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        'flex size-12 items-center justify-center rounded-full transition-all',
                        isDone &&
                          'bg-green-100 text-green-600 dark:bg-green-950/30',
                        isCurrent &&
                          'bg-[var(--color-imaro-primary)] text-white shadow-md ring-4 ring-[var(--color-imaro-primary)]/15',
                        !isDone &&
                          !isCurrent &&
                          'bg-muted text-muted-foreground/40',
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'max-w-[110px] text-center text-xs font-medium',
                        isCurrent && 'text-[var(--color-imaro-primary)]',
                      )}
                    >
                      {t(`gestionnaire.conformite.phaseLabel.${p.phase}`)}
                    </span>
                  </div>
                  {i < phases.length - 1 && (
                    <div
                      className={cn(
                        'mx-1 h-px flex-1 transition-all',
                        isDone ? 'bg-green-300' : 'bg-muted-foreground/15',
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks per phase */}
      <div className="grid gap-6 lg:grid-cols-2">
        {phases.map((p) => {
          const meta = PHASE_META[p.phase]
          const Icon = meta.icon
          return (
            <div key={p.phase} className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex size-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${meta.color}1a`,
                    color: meta.color,
                  }}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">
                    {t(`gestionnaire.conformite.phaseLabel.${p.phase}`)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t(`gestionnaire.conformite.phaseDesc.${p.phase}`, {
                      defaultValue: '',
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {p.tasks.filter((t) => t.status === 'done').length}/
                    {p.tasks.length} tâches terminées
                  </p>
                  {p.phase === 'preparation_ag' && (
                    <Link
                      to="/gestionnaire/assemblees"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-imaro-primary)] hover:underline"
                    >
                      {t('gestionnaire.conformite.agLink', {
                        defaultValue: 'Gérer les assemblées',
                      })}
                      <ChevronRight className="size-3.5 rtl:rotate-180" />
                    </Link>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {p.progress_pct}%
                </span>
              </div>

              <ul className="space-y-2">
                {p.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 text-sm">
                    {task.status === 'done' && (
                      <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    )}
                    {task.status === 'in_progress' && (
                      <Clock className="size-4 text-blue-500 shrink-0 animate-pulse" />
                    )}
                    {task.status === 'overdue' && (
                      <AlertTriangle className="size-4 text-red-500 shrink-0" />
                    )}
                    {(task.status === 'pending' ||
                      task.status === 'skipped') && (
                      <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                    )}

                    <span
                      className={cn(
                        'flex-1 text-xs',
                        STATUS_STYLES[task.status],
                      )}
                    >
                      {task.task_label}
                    </span>

                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat('fr-MA', {
                          day: '2-digit',
                          month: 'short',
                        }).format(new Date(task.due_date))}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-4 text-[9px] px-1.5',
                        STATUS_BADGES[task.status].cls,
                      )}
                    >
                      {t(`gestionnaire.conformite.phaseStatut.${task.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
