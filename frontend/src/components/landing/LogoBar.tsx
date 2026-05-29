import { useTranslation } from 'react-i18next'

/**
 * "Ils nous font confiance" — bande logos clients (placeholders SVG monochrome).
 * 6 logos répétés en marquee continu pour donner de la vie.
 */
export function LogoBar() {
  const { t } = useTranslation()
  const logos = [
    'Atlas Promotion',
    'Résidence Anfa',
    'Marina Group',
    'Bouygues Maroc',
    'Sotraplast',
    'Yasmine Immobilier',
  ]
  // Duplicate for seamless marquee loop
  const reel = [...logos, ...logos]
  return (
    <section className="border-y border-slate-200/70 bg-white py-12 dark:bg-card">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t('landing.logoBar.title')}
        </p>
        <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="l-marquee flex w-max items-center gap-12 px-6 sm:gap-16">
            {reel.map((name, i) => (
              <LogoSilhouette key={`${name}-${i}`} name={name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function LogoSilhouette({ name }: { name: string }) {
  // Generate a stable mark from the name initials
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="flex shrink-0 items-center gap-2 text-slate-400 transition-colors duration-300 hover:text-[var(--primary)]">
      <span className="flex size-9 items-center justify-center rounded-lg border-2 border-current font-display text-base font-bold tracking-tight">
        {initials}
      </span>
      <span className="font-display text-xl font-medium tracking-tight">
        {name}
      </span>
    </div>
  )
}
