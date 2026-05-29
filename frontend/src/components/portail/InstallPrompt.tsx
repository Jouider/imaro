import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

const STORAGE_KEY = 'imaro.installPrompt.dismissedAt'
const COOLDOWN_DAYS = 14

/**
 * Toast-like banner inviting the user to install the PWA.
 * Shows after their second portail visit (tracked in localStorage).
 * Hidden if already installed, dismissed recently, or browser doesn't support it.
 */
export function InstallPrompt() {
  const { t } = useTranslation()
  const { canInstall, install, isStandalone } = useInstallPrompt()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isStandalone) return
    if (!canInstall) return
    const dismissedAt = localStorage.getItem(STORAGE_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt)
      if (elapsed < COOLDOWN_DAYS * 86400_000) return
    }
    // Show after a short delay so user gets the page first
    const timer = setTimeout(() => setOpen(true), 2500)
    return () => clearTimeout(timer)
  }, [canInstall, isStandalone])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setOpen(false)
  }

  async function handleInstall() {
    const result = await install()
    if (result !== 'unavailable') setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 mx-auto max-w-sm rounded-2xl border border-[var(--color-imaro-primary)]/15 bg-white p-3.5 shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-4 dark:bg-card">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-white">
          <Download className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--primary)]">
            {t('portail.installPrompt.title')}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t('portail.installPrompt.desc')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="h-8 bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]"
            >
              {t('portail.installPrompt.install')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="h-8 text-muted-foreground hover:text-[var(--primary)]"
            >
              {t('portail.installPrompt.later')}
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={dismiss}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--color-imaro-primary-tint)]"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
