import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'en', label: 'EN', name: 'English' },
] as const

/**
 * Single-button language selector (KAN-61). Shows the active language code with
 * a globe icon; clicking opens a dropdown to pick FR / AR / EN. Replaces the old
 * three-segment pill so the header stays compact.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'fr'
  const active = LANGS.find((l) => l.code === current) ?? LANGS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('common.chooseLanguage')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/20"
        >
          <Languages
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span>{active.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel>{t('common.chooseLanguage')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map(({ code, label, name }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => void i18n.changeLanguage(code)}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex min-w-[24px] justify-center rounded bg-muted px-1 py-0.5 text-[11px] font-bold',
                  current === code &&
                    'bg-[var(--color-imaro-primary)] text-white',
                )}
              >
                {label}
              </span>
              <span className="text-sm">{name}</span>
            </span>
            {current === code && (
              <Check
                className="size-4 text-[var(--color-imaro-primary)]"
                aria-hidden="true"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
