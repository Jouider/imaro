import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'fr'

  const toggle = () => {
    void i18n.changeLanguage(current === 'fr' ? 'ar' : 'fr')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={t('language.switch')}
    >
      {current === 'fr' ? t('language.ar') : t('language.fr')}
    </Button>
  )
}
