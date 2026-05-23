import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColumnDef, ColumnMapping } from '@/lib/import/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  mappings: ColumnMapping[]
  columns: ColumnDef[]
  onMappingChange: (index: number, targetKey: string | null) => void
  onNext: () => void
}

export function ColumnMapper({ mappings, columns, onMappingChange, onNext }: Props) {
  const { t } = useTranslation()

  // Check if all required fields are mapped
  const requiredKeys = new Set(columns.filter((c) => c.required).map((c) => c.key))
  const mappedKeys = new Set(mappings.filter((m) => m.targetKey).map((m) => m.targetKey!))
  const missingRequired = [...requiredKeys].filter((k) => !mappedKeys.has(k))
  const allRequiredMapped = missingRequired.length === 0

  // Get already-used target keys to prevent duplicates
  const usedTargets = new Set(mappings.filter((m) => m.targetKey).map((m) => m.targetKey!))

  return (
    <div className="space-y-4">
      {/* Warning for missing required fields */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/30 dark:bg-orange-950/20">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {t('gestionnaire.imports.mapping.requiredMissing')}
            </p>
            <p className="mt-0.5 text-xs text-orange-600 dark:text-orange-400">
              {missingRequired
                .map((k) => columns.find((c) => c.key === k)?.label ?? k)
                .join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
          <span>{t('gestionnaire.imports.mapping.source')}</span>
          <span />
          <span>{t('gestionnaire.imports.mapping.target')}</span>
          <span>{t('gestionnaire.imports.mapping.confidence')}</span>
        </div>

        <div className="divide-y">
          {mappings.map((mapping, i) => {
            return (
              <div
                key={mapping.sourceHeader}
                className={cn(
                  'grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-3',
                  !mapping.targetKey && 'bg-muted/20',
                )}
              >
                {/* Source header */}
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                    {mapping.sourceHeader}
                  </code>
                </div>

                {/* Arrow */}
                <ArrowRight className="size-3.5 text-muted-foreground/40" />

                {/* Target field selector */}
                <Select
                  value={mapping.targetKey ?? '__none__'}
                  onValueChange={(val) =>
                    onMappingChange(i, val === '__none__' ? null : val)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('gestionnaire.imports.mapping.unmapped')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">
                        — {t('gestionnaire.imports.mapping.unmapped')} —
                      </span>
                    </SelectItem>
                    {columns.map((col) => (
                      <SelectItem
                        key={col.key}
                        value={col.key}
                        disabled={usedTargets.has(col.key) && mapping.targetKey !== col.key}
                      >
                        <span className="flex items-center gap-1.5">
                          {col.label}
                          {col.required && (
                            <span className="text-[10px] text-red-500">*</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Confidence badge */}
                <div className="flex justify-end">
                  {mapping.targetKey ? (
                    mapping.confidence === 'high' ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                      >
                        <Check className="size-3" />
                        {t('gestionnaire.imports.mapping.auto')}
                      </Badge>
                    ) : mapping.confidence === 'medium' ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
                      >
                        <Check className="size-3" />
                        {t('gestionnaire.imports.mapping.auto')}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400"
                      >
                        {t('gestionnaire.imports.mapping.manual')}
                      </Badge>
                    )
                  ) : (
                    <HelpCircle className="size-4 text-muted-foreground/30" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!allRequiredMapped}>
          {t('actions.confirm')}
        </Button>
      </div>
    </div>
  )
}
