import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'

/**
 * Portail copropriétaire — tableau de bord (placeholder).
 * Sera remplacé par le vrai portail avec finances / réclamations / profil.
 */
export function PortailDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setStoredToken(null)
      clear()
      void navigate('/portail/login', { replace: true })
    },
  })

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-imaro-surface)]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <Wordmark className="h-10 w-36" />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="me-1.5 size-4" />
            {t('nav.logout')}
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-[var(--primary)]/10 p-6">
          <Wordmark variant="stacked" className="mx-auto h-24 w-auto" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[var(--primary)]">
          {t('portail.dashboard.welcome', { name: user?.name ?? '…' })}
        </h1>
        <p className="text-muted-foreground">
          {t('portail.dashboard.subtitle')}
        </p>
        <p className="mt-4 max-w-xs text-sm text-muted-foreground">
          🚧 Le portail complet (finances, réclamations, profil) est en cours de
          développement.
        </p>
      </main>
    </div>
  )
}
