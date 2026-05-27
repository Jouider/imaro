import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Columns3, Eye, Play, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, type ApiEnvelope } from '@/lib/axios'
import type {
  ImportConfig,
  ImportContext,
  ImportRow,
  ColumnMapping,
  ImportResult,
} from '@/lib/import/types'
import {
  parseExcelFile,
  autoMapColumns,
  applyMappings,
  generateTemplate,
} from '@/lib/import/excel-parser'
import { FileDropZone } from './FileDropZone'
import { ColumnMapper } from './ColumnMapper'
import { ValidationPreview } from './ValidationPreview'
import { ImportProgress } from './ImportProgress'

type Step = 'upload' | 'mapping' | 'preview' | 'execute'

const STEPS: { key: Step; icon: typeof Upload; labelKey: string }[] = [
  {
    key: 'upload',
    icon: Upload,
    labelKey: 'gestionnaire.imports.steps.upload',
  },
  {
    key: 'mapping',
    icon: Columns3,
    labelKey: 'gestionnaire.imports.steps.mapping',
  },
  { key: 'preview', icon: Eye, labelKey: 'gestionnaire.imports.steps.preview' },
  {
    key: 'execute',
    icon: Play,
    labelKey: 'gestionnaire.imports.steps.execute',
  },
]

type Props = {
  config: ImportConfig
  context: ImportContext
  onComplete: () => void
}

export function ImportStepper({ config, context, onComplete }: Props) {
  const { t } = useTranslation()

  // Wizard state
  const [step, setStep] = useState<Step>('upload')
  const [parsing, setParsing] = useState(false)

  // Data flowing through steps
  const [, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [validatedRows, setValidatedRows] = useState<ImportRow[]>([])

  // Execute state
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<ImportResult | null>(null)

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  // ── Step 1: File upload ─────────────────────────────────────────────────────

  const handleFileSelected = useCallback(
    async (file: File) => {
      setParsing(true)
      try {
        const parsed = await parseExcelFile(file)
        setRawHeaders(parsed.headers)
        setRawRows(parsed.rows)

        // Auto-map columns
        const autoMapped = autoMapColumns(parsed.headers, config.columns)
        setMappings(autoMapped)

        setStep('mapping')
      } catch (err) {
        console.error('Parse error:', err)
        // Stay on upload step so user can retry
      } finally {
        setParsing(false)
      }
    },
    [config.columns],
  )

  const handleDownloadTemplate = useCallback(() => {
    generateTemplate(config)
  }, [config])

  // ── Step 2: Column mapping ────────────────────────────────────────────────

  const handleMappingChange = useCallback(
    (index: number, targetKey: string | null) => {
      setMappings((prev) => {
        const next = [...prev]
        // Clear any existing mapping to this target
        if (targetKey) {
          for (let i = 0; i < next.length; i++) {
            if (i !== index && next[i].targetKey === targetKey) {
              next[i] = { ...next[i], targetKey: null, confidence: 'low' }
            }
          }
        }
        next[index] = {
          ...next[index],
          targetKey,
          confidence: targetKey ? 'manual' : 'low',
        }
        return next
      })
    },
    [],
  )

  const handleMappingNext = useCallback(() => {
    // Apply mappings → validate each row
    const mapped = applyMappings(rawRows, mappings)
    const validated: ImportRow[] = mapped.map((row, i) => {
      const errors = config.validate(row, context)
      return {
        ...row,
        _index: i,
        _status: errors.length === 0 ? 'valid' : 'error',
        _errors: errors,
      } as ImportRow
    })
    setValidatedRows(validated)
    setStep('preview')
  }, [rawRows, mappings, config, context])

  // ── Step 3 → 4: Execute import ─────────────────────────────────────────────

  const handleImport = useCallback(
    async (rows: ImportRow[]) => {
      setStep('execute')
      setImporting(true)

      const total = rows.length
      setProgress({ done: 0, total })

      const allResults: ImportResult = {
        total,
        success: 0,
        failed: 0,
        errors: [],
      }

      // Build endpoint URL
      const url = config.endpoint.replace('{id}', String(context.residenceId))

      // Chunk rows
      const chunks: ImportRow[][] = []
      for (let i = 0; i < rows.length; i += config.chunkSize) {
        chunks.push(rows.slice(i, i + config.chunkSize))
      }

      let done = 0

      for (const chunk of chunks) {
        try {
          const payloads = chunk.map((row) => config.transform(row, context))

          // In dev mode with no backend, simulate success
          if (import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_BYPASS) {
            try {
              await api.post<
                ApiEnvelope<{
                  created?: number
                  imported?: number
                  errors?: string[]
                }>
              >(url, { [config.id]: payloads })
            } catch {
              // Mock success in dev
            }
          } else {
            await api.post<
              ApiEnvelope<{
                created?: number
                imported?: number
                errors?: string[]
              }>
            >(url, { [config.id]: payloads })
          }

          allResults.success += chunk.length
        } catch (err: unknown) {
          allResults.failed += chunk.length
          const msg = err instanceof Error ? err.message : 'Erreur inconnue'
          for (const row of chunk) {
            allResults.errors.push({ row: row._index + 1, message: msg })
          }
        }

        done += chunk.length
        setProgress({ done, total })
      }

      setResult(allResults)
      setImporting(false)
    },
    [config, context],
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === stepIndex
          const isDone = i < stepIndex

          return (
            <div key={s.key} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    'h-px w-8 mx-1',
                    isDone
                      ? 'bg-[var(--color-imaro-primary)]'
                      : 'bg-muted-foreground/20',
                  )}
                />
              )}
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive &&
                    'bg-[var(--color-imaro-primary)] text-white shadow-sm',
                  isDone &&
                    'bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]',
                  !isActive && !isDone && 'text-muted-foreground/50',
                )}
              >
                {isDone ? (
                  <Check className="size-3.5" />
                ) : (
                  <Icon className="size-3.5" />
                )}
                <span className="hidden sm:inline">{t(s.labelKey)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <FileDropZone
          onFileSelected={handleFileSelected}
          onDownloadTemplate={handleDownloadTemplate}
          loading={parsing}
        />
      )}

      {step === 'mapping' && (
        <ColumnMapper
          mappings={mappings}
          columns={config.columns}
          onMappingChange={handleMappingChange}
          onNext={handleMappingNext}
        />
      )}

      {step === 'preview' && (
        <ValidationPreview
          rows={validatedRows}
          columns={config.columns}
          onImport={handleImport}
        />
      )}

      {step === 'execute' && (
        <ImportProgress
          result={result}
          progress={progress}
          importing={importing}
          onDone={onComplete}
        />
      )}
    </div>
  )
}
