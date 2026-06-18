import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type Section = { h: string; p: string[] }

/**
 * Public privacy policy (loi 09-08 / CNDP). Required as a public URL by both
 * the App Store and Play Store (KAN-73 / KAN-74 / KAN-75). No auth.
 */
export function ConfidentialitePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const sections = t('public.confidentialite.sections', {
    returnObjects: true,
  }) as Section[]

  return (
    <div className="min-h-screen bg-[var(--color-imaro-surface)]">
      {/* Header */}
      <header
        className="px-4 py-3 text-white sm:px-6"
        style={{
          background:
            'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark, #154360) 100%)',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t('public.confidentialite.back')}
          </button>
          <Wordmark inverted className="h-8 w-28" />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-start gap-3">
          <ShieldCheck className="mt-1 size-7 shrink-0 text-[var(--color-imaro-primary)]" />
          <div>
            <h1 className="font-display text-2xl leading-tight text-[var(--color-imaro-text)] sm:text-3xl">
              {t('public.confidentialite.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('public.confidentialite.updated')}
            </p>
          </div>
        </div>

        <p className="mb-8 rounded-xl border bg-white p-4 text-sm leading-relaxed text-[var(--color-imaro-text)] dark:bg-card">
          {t('public.confidentialite.intro')}
        </p>

        <div className="space-y-7">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="mb-2 text-base font-semibold text-[var(--color-imaro-primary)]">
                {section.h}
              </h2>
              <div className="space-y-2">
                {section.p.map((para, j) => (
                  <p
                    key={j}
                    className="text-sm leading-relaxed text-[var(--color-imaro-text)]"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t pt-5 text-center text-xs text-muted-foreground">
          {t('public.confidentialite.brand')} · contact@imaro.ma · imaro.ma
        </footer>
      </main>
    </div>
  )
}
