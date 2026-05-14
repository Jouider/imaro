import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function PortailProfilPage() {
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

  const name = user?.name ?? '—'
  const phone = user?.phone ?? '—'
  const initials = getInitials(name)

  // TODO: lot and residence will come from real API
  const lot = 'A-102'
  const residence = 'Résidence Al Blanca'

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
        {t('portail.profil.title')}
      </h1>

      {/* Profile section */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-imaro-primary)] text-white text-xl font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold truncate">{name}</p>
            <p className="text-sm text-muted-foreground">{phone}</p>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lot</span>
            <span className="font-medium">{lot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Résidence</span>
            <span className="font-medium truncate max-w-[60%] text-right">
              {residence}
            </span>
          </div>
        </div>
      </div>

      {/* Apparence section */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-3">
          {t('portail.profil.apparence')}
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('portail.profil.darkMode')}</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-base"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        {logoutMutation.isPending
          ? t('actions.loading')
          : t('portail.profil.logout')}
      </Button>
    </div>
  )
}
