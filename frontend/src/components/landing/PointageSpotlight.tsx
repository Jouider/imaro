import { useTranslation } from 'react-i18next'
import { Landmark, ArrowRight, CheckCircle2, Upload } from 'lucide-react'

const BANKS = [
  'Attijariwafa',
  'BCP',
  'Bank of Africa',
  'CIH',
  'SGMA',
  'BMCI',
  'Crédit du Maroc',
  'CAM',
  'CFG Bank',
  'Al Barid Bank',
]

/**
 * Spotlight section #2 — Pointage bancaire.
 * Left : visual showing 10 banks → drop file → 8 auto-match.
 * Right : copy + benefits.
 */
export function PointageSpotlight() {
  const { t } = useTranslation()
  return (
    <section
      id="pointage"
      className="relative overflow-hidden bg-white py-24 dark:bg-card"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
        {/* Left — visual */}
        <div className="order-2 lg:order-1">
          <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50/40 to-white p-6 shadow-xl dark:from-background dark:to-card">
            {/* Banks chip cloud */}
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('landing.pointage.banksTitle')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BANKS.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 dark:bg-card dark:text-slate-300"
                >
                  {b}
                </span>
              ))}
            </div>

            {/* Drop zone */}
            <div className="mt-5 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-4 text-center dark:bg-sky-950/20">
              <Upload className="mx-auto size-5 text-sky-600" />
              <p className="mt-1.5 text-xs font-semibold text-[var(--primary)]">
                releve_avril_2026.xlsx
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t('landing.pointage.fileSize')}
              </p>
            </div>

            {/* Arrow */}
            <div className="my-3 flex justify-center text-sky-500">
              <ArrowRight className="size-5 rotate-90" />
            </div>

            {/* Matched lines preview */}
            <div className="space-y-1.5">
              {[
                {
                  who: 'H. Alaoui · Lot A-101',
                  amount: '1 500,00',
                  match: true,
                },
                {
                  who: 'S. Bennani · Lot A-102',
                  amount: '1 500,00',
                  match: true,
                },
                {
                  who: 'K. El Fassi · Lot A-201',
                  amount: '850,00',
                  match: false,
                },
                { who: 'N. Tazi · Lot A-202', amount: '1 500,00', match: true },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] ${
                    row.match
                      ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20'
                      : 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20'
                  }`}
                >
                  <span className="font-medium text-[var(--primary)]">
                    {row.who}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {row.amount} DH
                    </span>
                    {row.match ? (
                      <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Auto
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Suggéré
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                {t('landing.pointage.summary')}
              </span>
              <span className="font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                8 / 10
              </span>
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            <Landmark className="size-3.5" />
            {t('landing.pointage.eyebrow')}
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.pointage.title')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('landing.pointage.subtitle')}
          </p>

          <ul className="mt-8 space-y-3">
            {(['benefit1', 'benefit2', 'benefit3'] as const).map((k) => (
              <li key={k} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <span className="text-[15px] leading-relaxed text-muted-foreground">
                  {t(`landing.pointage.${k}`)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 inline-flex items-baseline gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:bg-sky-950/20">
            <span className="font-display text-3xl text-[var(--primary)]">
              2h → 10min
            </span>
            <span className="text-xs text-muted-foreground">
              {t('landing.pointage.timeGain')}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
