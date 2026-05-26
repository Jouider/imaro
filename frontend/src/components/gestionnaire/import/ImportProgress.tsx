import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImportResult } from '@/lib/import/types'

type Props = {
  result: ImportResult | null
  progress: { done: number; total: number }
  importing: boolean
  onDone: () => void
}

export function ImportProgress({ result, progress, importing, onDone }: Props) {
  const { t } = useTranslation()

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {importing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-[#1B4F72]" />
              <span>
                {t('gestionnaire.imports.execute.inProgress')
                  .replace('{done}', String(progress.done))
                  .replace('{total}', String(progress.total))}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {pct}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B4F72] to-[#2980b9] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Result summary */}
      {result && !importing && (
        <div className="space-y-4">
          {/* Success card */}
          <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 p-6 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900/30">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <PartyPopper className="size-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                  {t('gestionnaire.imports.execute.success').replace(
                    '{count}',
                    String(result.success),
                  )}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {result.total}{' '}
                  {result.total > 1 ? 'lignes traitées' : 'ligne traitée'}
                </p>
              </div>
            </div>
          </div>

          {/* Failed rows */}
          {result.failed > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="size-4 text-red-600" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t('gestionnaire.imports.execute.failed').replace(
                    '{count}',
                    String(result.failed),
                  )}
                </p>
              </div>
              <ul className="space-y-1 text-xs text-red-600 dark:text-red-400 max-h-[150px] overflow-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="shrink-0 font-mono">L{err.row}:</span>
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Done button */}
          <div className="flex justify-end">
            <Button onClick={onDone} className="gap-2">
              <CheckCircle2 className="size-4" />
              {t('gestionnaire.imports.execute.done')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
