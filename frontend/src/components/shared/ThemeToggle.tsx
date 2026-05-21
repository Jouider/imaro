import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/themeStore'

/**
 * Small icon-button that toggles between light and dark mode.
 * Shows Sun when in dark mode (click to go light), Moon when in light mode (click to go dark).
 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, toggle } = useThemeStore()

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggle}
      title={t('portail.profil.darkMode')}
      className="h-10 w-10"
    >
      {theme === 'dark' ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
      <span className="sr-only">{t('portail.profil.darkMode')}</span>
    </Button>
  )
}
