import { Check, FileText, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type DocItem = { key: string; ref: string; required: boolean }
type DocCategory = { key: string; items: DocItem[] }

const DOC_CATEGORIES: DocCategory[] = [
  {
    key: 'exercice',
    items: [
      { key: 'rapport_gestion', ref: 'art. 8', required: true },
      { key: 'bilan_exercice', ref: 'art. 16 quinquies', required: true },
      { key: 'budget_previsionnel', ref: 'art. 16 quinquies', required: true },
    ],
  },
  {
    key: 'comptabilite',
    items: [
      { key: 'recettes_depenses', ref: 'décret 2-10-388', required: true },
      { key: 'releve_bancaire', ref: 'décret 2-10-388', required: false },
      { key: 'justificatifs_charges', ref: 'décret 2-10-388', required: false },
    ],
  },
  {
    key: 'pmo',
    items: [
      { key: 'plan_maintenance', ref: 'art. 20', required: false },
      { key: 'pv_travaux', ref: 'art. 21', required: false },
    ],
  },
  {
    key: 'recouvrement',
    items: [
      { key: 'etat_impayes', ref: 'art. 25 bis', required: true },
      { key: 'historique_relances', ref: 'art. 25 bis', required: false },
    ],
  },
]

type Props = {
  checked: Set<string>
  onToggle: (key: string) => void
}

export function AgDocumentsSidebar({ checked, onToggle }: Props) {
  const { t } = useTranslation()

  const allItems = DOC_CATEGORIES.flatMap((c) => c.items)
  const requiredItems = allItems.filter((i) => i.required)
  const doneCount = allItems.filter((i) => checked.has(i.key)).length
  const requiredDone = requiredItems.filter((i) => checked.has(i.key)).length
  const allRequiredDone = requiredDone === requiredItems.length
  const pct = allItems.length > 0 ? (doneCount / allItems.length) * 100 : 0

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-[var(--color-imaro-surface)] p-4 sm:w-[252px] sm:shrink-0 sm:max-h-[66vh] sm:overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-[var(--color-imaro-primary)]" />
          <p className="text-sm font-semibold text-[var(--color-imaro-primary)]">
            {t('gestionnaire.assemblees.docs.title')}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t('gestionnaire.assemblees.docs.subtitle')}
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {t('gestionnaire.assemblees.docs.progress', {
              done: doneCount,
              total: allItems.length,
            })}
          </span>
          {allRequiredDone && (
            <span className="text-[11px] font-semibold text-[var(--color-imaro-success)]">
              ✓
            </span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: allRequiredDone
                ? 'var(--color-imaro-success)'
                : 'var(--color-imaro-primary)',
            }}
          />
        </div>
      </div>

      {/* Categories */}
      {DOC_CATEGORIES.map((cat) => (
        <div key={cat.key} className="space-y-0.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t(`gestionnaire.assemblees.docs.cat.${cat.key}`)}
          </p>
          {cat.items.map((item) => {
            const isChecked = checked.has(item.key)
            return (
              <label
                key={item.key}
                htmlFor={`doc-${item.key}`}
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                  isChecked
                    ? 'bg-[var(--color-imaro-success)]/8 text-[var(--color-imaro-success)]'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                <input
                  type="checkbox"
                  id={`doc-${item.key}`}
                  checked={isChecked}
                  onChange={() => onToggle(item.key)}
                  className="sr-only"
                />
                {/* custom checkbox */}
                <div
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    isChecked
                      ? 'border-[var(--color-imaro-success)] bg-[var(--color-imaro-success)] text-white'
                      : item.required
                        ? 'border-[var(--color-imaro-primary)]/60'
                        : 'border-muted-foreground/40',
                  )}
                >
                  {isChecked && <Check className="size-2.5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'leading-snug',
                      item.required && !isChecked && 'font-medium',
                    )}
                  >
                    {t(`gestionnaire.assemblees.docs.items.${item.key}`)}
                    {item.required && !isChecked && (
                      <span className="ms-0.5 text-[var(--color-imaro-accent)]">
                        *
                      </span>
                    )}
                  </span>
                  <p
                    className={cn(
                      'text-[10px]',
                      isChecked
                        ? 'text-[var(--color-imaro-success)]/70'
                        : 'text-muted-foreground',
                    )}
                  >
                    Loi 18-00, {item.ref}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      ))}

      {/* Required legend */}
      {!allRequiredDone && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <AlertTriangle className="size-3 shrink-0 text-[var(--color-imaro-accent)]" />
          {t('gestionnaire.assemblees.docs.requiredHint')}
        </p>
      )}
    </div>
  )
}
