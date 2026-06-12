import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'en', label: 'EN', name: 'English' },
] as const

/**
 * Compact FR | AR | EN pill toggle — no border outline, a three-segment
 * control. Active segment: navy bg + white text. Inactive: muted, clickable.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'fr'

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5"
      role="group"
      aria-label={t('common.chooseLanguage')}
    >
      {LANGS.map(({ code, label, name }) => (
        <button
          key={code}
          type="button"
          onClick={() => void i18n.changeLanguage(code)}
          aria-pressed={current === code}
          aria-label={name}
          className={cn(
            'min-w-[30px] rounded-md px-1.5 py-1 text-xs font-bold transition-all duration-150',
            current === code
              ? 'bg-[var(--color-imaro-primary)] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
