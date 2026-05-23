import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { ImportRow, ColumnDef } from '@/lib/import/types'

type Props = {
  rows: ImportRow[]
  columns: ColumnDef[]
  onImport: (validRows: ImportRow[]) => void
  loading?: boolean
}

export function ValidationPreview({ rows, columns, onImport, loading }: Props) {
  const { t } = useTranslation()
  const [skipErrors, setSkipErrors] = useState(true)

  const validRows = useMemo(() => rows.filter((r) => r._status === 'valid'), [rows])
  const errorRows = useMemo(() => rows.filter((r) => r._status === 'error'), [rows])

  const rowsToImport = skipErrors ? validRows : rows

  // Visible columns: only those that have data
  const mappedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const row of rows) {
      for (const col of columns) {
        const val = String(row[col.key] ?? '').trim()
        if (val) keys.add(col.key)
      }
    }
    return columns.filter((c) => keys.has(c.key))
  }, [rows, columns])

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            {t('gestionnaire.imports.preview.summary', {
              valid: validRows.length,
              errors: errorRows.length,
            })
              .replace('{valid}', String(validRows.length))
              .replace('{errors}', String(errorRows.length))}
          </span>
        </div>

        {errorRows.length > 0 && (
          <div className="flex items-center gap-2 ms-auto">
            <Checkbox
              id="skip-errors"
              checked={skipErrors}
              onCheckedChange={(v) => setSkipErrors(!!v)}
            />
            <label htmlFor="skip-errors" className="text-xs text-muted-foreground cursor-pointer">
              {t('gestionnaire.imports.preview.skipErrors')}
            </label>
          </div>
        )}
      </div>

      {/* Data table */}
      <div className="max-h-[400px] overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-2 text-start font-semibold text-muted-foreground w-10">#</th>
              <th className="px-3 py-2 text-start font-semibold text-muted-foreground w-10" />
              {mappedKeys.map((col) => (
                <th key={col.key} className="px-3 py-2 text-start font-semibold text-muted-foreground whitespace-nowrap">
                  {col.label}
                  {col.required && <span className="text-red-500 ms-0.5">*</span>}
                </th>
              ))}
              <th className="px-3 py-2 text-start font-semibold text-muted-foreground">Erreurs</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={row._index}
                className={cn(
                  row._status === 'error' && 'bg-red-50/50 dark:bg-red-950/10',
                )}
              >
                <td className="px-3 py-2 text-muted-foreground">{row._index + 1}</td>
                <td className="px-3 py-2">
                  {row._status === 'valid' ? (
                    <CheckCircle2 className="size-3.5 text-green-500" />
                  ) : (
                    <XCircle className="size-3.5 text-red-500" />
                  )}
                </td>
                {mappedKeys.map((col) => (
                  <td key={col.key} className="px-3 py-2 max-w-[200px] truncate">
                    {String(row[col.key] ?? '—')}
                  </td>
                ))}
                <td className="px-3 py-2">
                  {row._errors.length > 0 && (
                    <div className="flex items-start gap-1">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 line-clamp-2">
                        {row._errors.join(' · ')}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Import button */}
      <div className="flex justify-end">
        <Button
          onClick={() => onImport(rowsToImport.filter((r) => r._status === 'valid'))}
          disabled={validRows.length === 0 || loading}
          className="gap-2"
        >
          {loading ? (
            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : null}
          {t('gestionnaire.imports.preview.importButton')
            .replace('{count}', String(skipErrors ? validRows.length : rowsToImport.length))}
        </Button>
      </div>
    </div>
  )
}
