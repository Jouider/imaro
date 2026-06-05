import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'

/**
 * Full-screen first-run setup. The GestionnaireGuard redirects a manager here
 * while their tenant onboarding is incomplete (issue #150). Mandatory until
 * finished — the only escape is logging out.
 */
export function OnboardingPage() {
  const { t } = useTranslation()
  const clear = useAuthStore((s) => s.clear)

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      setStoredToken(null)
      clear()
      window.location.href = '/login'
    },
  })

  return (
    <div className="relative flex min-h-svh flex-col bg-[#f4f7fa] dark:bg-background">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
        <Wordmark className="h-9 w-28" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[var(--color-imaro-danger)]"
          >
            <LogOut className="size-4 rtl:rotate-180" />
            {t('nav.logout')}
          </button>
        </div>
      </header>

      {/* Centered wizard */}
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2">
        <OnboardingWizard />
      </div>
    </div>
  )
}
