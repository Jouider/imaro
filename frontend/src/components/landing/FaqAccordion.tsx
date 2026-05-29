import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const

/**
 * FAQ — 6 questions via shadcn Accordion. Centré, max-w-3xl.
 */
export function FaqAccordion() {
  const { t } = useTranslation()
  return (
    <section id="faq" className="bg-white py-24 dark:bg-card">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            {t('landing.faq.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.faq.title')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('landing.faq.subtitle')}
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mt-12 w-full divide-y divide-slate-200/70 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_10px_-3px_rgb(29_78_216_/_0.06)] dark:bg-card"
        >
          {QUESTIONS.map((q, i) => (
            <AccordionItem
              key={q}
              value={q}
              className="border-b-0 px-5 sm:px-6"
            >
              <AccordionTrigger className="py-5 text-left text-[15px] font-semibold text-[var(--primary)] hover:no-underline sm:text-base">
                <span className="me-3 font-display text-base text-[var(--accent)]">
                  {String(i + 1).padStart(2, '0')}.
                </span>
                {t(`landing.faq.${q}.question`)}
              </AccordionTrigger>
              <AccordionContent className="pb-5 pe-2 ps-11 text-[15px] leading-relaxed text-muted-foreground">
                {t(`landing.faq.${q}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
