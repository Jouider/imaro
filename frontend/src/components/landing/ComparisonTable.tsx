import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'

const ROWS = [
  'recouvrement',
  'annexes',
  'pointage',
  'reporting',
  'archivage',
  'ia',
] as const

/**
 * Tableau "Excel & courrier vs Imaro" — 6 lignes.
 * Présentation côté-à-côté, headers contrastés, lignes alternées.
 */
export function ComparisonTable() {
  const { t } = useTranslation()
  return (
    <section className="bg-slate-50/60 py-24 dark:bg-background">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            {t('landing.comparison.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.comparison.title')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('landing.comparison.subtitle')}
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl dark:bg-card">
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-slate-200/80 bg-slate-100/60 dark:bg-background">
            <div className="p-4 sm:p-5" />
            <div className="border-x border-slate-200/80 p-4 text-center sm:p-5">
              <span className="text-sm font-semibold text-muted-foreground">
                {t('landing.comparison.colExcel')}
              </span>
            </div>
            <div className="bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] p-4 text-center sm:p-5">
              <span className="text-sm font-bold uppercase tracking-wider text-white">
                {t('landing.comparison.colImaro')}
              </span>
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row}
              className={`grid grid-cols-3 border-b border-slate-200/60 last:border-b-0 ${
                i % 2 === 1 ? 'bg-slate-50/40 dark:bg-background/40' : ''
              }`}
            >
              <div className="p-4 sm:p-5">
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {t(`landing.comparison.row.${row}.label`)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 border-x border-slate-200/60 p-4 sm:p-5">
                <X className="size-4 shrink-0 text-red-400" />
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {t(`landing.comparison.row.${row}.excel`)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 p-4 sm:p-5">
                <Check className="size-4 shrink-0 text-emerald-500" />
                <span className="text-xs font-medium text-[var(--primary)] sm:text-sm">
                  {t(`landing.comparison.row.${row}.imaro`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
