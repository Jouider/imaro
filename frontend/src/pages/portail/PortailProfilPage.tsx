import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Home as HomeIcon,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'
import { getProfile } from '@/services/portail.service'
import { ConfirmModal } from '@/components/shared'
import { usePush } from '@/hooks/usePush'
import { cn } from '@/lib/utils'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Profil copropriétaire — identité, préférences (thème, langue, notifications
 * push), et déconnexion avec confirmation modal.
 */
export function PortailProfilPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const { permission, isSubscribed, subscribe, unsubscribe } = usePush()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setStoredToken(null)
      clear()
      void navigate('/login', { replace: true })
    },
  })

  const { data: profile } = useQuery({
    queryKey: ['portail-profile'],
    queryFn: getProfile,
  })

  const name = profile?.name ?? user?.name ?? '—'
  const phone = user?.phone ?? '—'
  const email = profile?.email ?? '—'
  const initials = getInitials(name)
  const lot = profile?.lot ?? '—'
  const residence = profile?.residence ?? '—'
  const isDark = theme === 'dark'
  const pushSupported = permission !== 'unsupported'

  async function togglePush() {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Avatar + identity hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] p-5 text-white shadow-xl shadow-blue-500/20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/15 font-display text-2xl tracking-tight backdrop-blur-sm ring-1 ring-inset ring-white/20">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl tracking-tight">
              {name}
            </p>
            <p className="mt-0.5 truncate text-xs text-white/75">
              Lot {lot} · {residence}
            </p>
          </div>
        </div>
      </div>

      {/* Contact details */}
      <Section title={t('portail.profil.contact')}>
        <Row icon={<Phone className="size-[18px]" />} label={phone} />
        <Row icon={<Mail className="size-[18px]" />} label={email} />
        <Row
          icon={<HomeIcon className="size-[18px]" />}
          label={`${lot} · ${residence}`}
        />
      </Section>

      {/* Preferences */}
      <Section title={t('portail.profil.preferences')}>
        {/* Theme toggle */}
        <ToggleRow
          icon={
            isDark ? (
              <Moon className="size-[18px]" />
            ) : (
              <Sun className="size-[18px]" />
            )
          }
          label={t('portail.profil.darkMode')}
          checked={isDark}
          onCheckedChange={() => toggleTheme()}
        />

        {/* Push notifications */}
        <ToggleRow
          icon={<Bell className="size-[18px]" />}
          label={t('portail.push.title')}
          desc={
            pushSupported
              ? t('portail.push.desc')
              : t('portail.push.unsupported')
          }
          checked={isSubscribed}
          onCheckedChange={togglePush}
          disabled={!pushSupported}
        />
      </Section>

      {/* Account */}
      <Section title={t('portail.profil.account')}>
        <Row
          icon={<ShieldCheck className="size-[18px]" />}
          label={t('portail.profil.privacy')}
          trailing={<ChevronRight className="size-4 text-muted-foreground" />}
          clickable
        />
      </Section>

      {/* CNDP (loi 09-08) data-protection notice */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 dark:border-border dark:bg-card">
        <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-[var(--color-imaro-success)]" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {t('portail.profil.cndpNotice')}
        </p>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        size="lg"
        className="w-full justify-start gap-3 border-[var(--destructive)]/20 bg-red-50/40 text-[var(--destructive)] hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
        onClick={() => setLogoutOpen(true)}
        disabled={logoutMutation.isPending}
      >
        <LogOut className="size-5" />
        {logoutMutation.isPending
          ? t('actions.loading')
          : t('portail.profil.logout')}
      </Button>

      <ConfirmModal
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={t('portail.profil.logoutConfirmTitle')}
        description={t('portail.profil.logoutConfirmDesc')}
        confirmLabel={t('portail.profil.logout')}
        onConfirm={() => {
          setLogoutOpen(false)
          logoutMutation.mutate()
        }}
        isLoading={logoutMutation.isPending}
      />
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="divide-y divide-slate-200/60 rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_0_rgb(29_78_216_/_0.04)] dark:divide-border dark:border-border dark:bg-card">
        {children}
      </div>
    </section>
  )
}

function Row({
  icon,
  label,
  trailing,
  clickable = false,
}: {
  icon: React.ReactNode
  label: string
  trailing?: React.ReactNode
  clickable?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5',
        clickable &&
          'cursor-pointer hover:bg-[var(--color-imaro-primary-tint)]',
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-imaro-primary-tint)] text-[var(--primary)]">
        {icon}
      </span>
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      {trailing}
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  desc?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-imaro-primary-tint)] text-[var(--primary)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {desc && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {desc}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}
