import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Building2,
  Bell,
  Shield,
  LogOut,
  Pencil,
  Check,
  X,
  ImagePlus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// ─── ProfilPage ───────────────────────────────────────────────────────────────

export function ProfilPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, tenant, clear } = useAuthStore()
  const { logoUrl, setLogoUrl } = useSettingsStore()
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Edit mode ──
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(user?.name ?? '')
  const [editPhone, setEditPhone] = useState(user?.phone ?? '')

  const handleSaveProfile = () => {
    toast.success(t('gestionnaire.profil.toastSaved'))
    setEditMode(false)
  }

  const handleCancelEdit = () => {
    setEditName(user?.name ?? '')
    setEditPhone(user?.phone ?? '')
    setEditMode(false)
  }

  // ── Logo upload ──
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('gestionnaire.profil.logoTooBig'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogoUrl(reader.result as string)
      toast.success(t('gestionnaire.profil.logoUpdated'))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    toast.success(t('gestionnaire.profil.logoRemoved'))
  }

  // ── Notification toggles ──
  const [notifMaster, setNotifMaster] = useState(true)
  const [notifPaiement, setNotifPaiement] = useState(true)
  const [notifTicket, setNotifTicket] = useState(true)
  const [notifAssemblee, setNotifAssemblee] = useState(true)
  const [notifRetard, setNotifRetard] = useState(true)

  // ── Logout mutation ──
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setStoredToken(null)
      clear()
      void navigate('/login', { replace: true })
    },
  })

  const initials = user ? getInitials(user.name) : 'G'

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      {/* ── 1. Page header ── */}
      <h1
        className="text-2xl font-bold"
        style={{ color: 'var(--color-imaro-primary)' }}
      >
        {t('gestionnaire.profil.title')}
      </h1>

      {/* ── 2. Hero card ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-start gap-5">
          {/* Avatar with edit button */}
          <div className="relative shrink-0">
            <div
              className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-imaro-primary-light), var(--color-imaro-primary))',
              }}
            >
              {initials}
            </div>
            <button
              onClick={() => setEditMode((prev) => !prev)}
              aria-label={t('gestionnaire.profil.editAria')}
              className={cn(
                'absolute bottom-0 end-0 flex size-6 items-center justify-center rounded-full border bg-white shadow-sm transition-colors hover:bg-gray-50 dark:bg-card dark:border-border dark:hover:bg-muted',
                editMode && 'border-[var(--color-imaro-primary)]',
              )}
            >
              <Pencil className="size-3 text-gray-500" />
            </button>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-foreground leading-tight">
              {user?.name ?? '—'}
            </p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Badge
                className="text-xs font-semibold text-white"
                style={{ background: 'var(--color-imaro-primary)' }}
              >
                {user?.role === 'manager'
                  ? t('gestionnaire.profil.roleManager')
                  : t('gestionnaire.profil.roleGestionnaire')}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {user?.phone ?? '—'}
            </p>
            {tenant && (
              <p className="text-sm text-muted-foreground">{tenant.name}</p>
            )}
          </div>
        </div>

        {/* Inline edit form */}
        {editMode && (
          <div className="mt-5 space-y-4 border-t pt-5 dark:border-border">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">
                  {t('gestionnaire.profil.fullName')}
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('gestionnaire.profil.namePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">{t('common.phone')}</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+212 6XX XX XX XX"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveProfile}>
                <Check className="me-1.5 size-3.5" />
                {t('actions.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                <X className="me-1.5 size-3.5" />
                {t('actions.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Logo du syndic ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-1">
          <ImagePlus
            className="size-4 shrink-0"
            style={{ color: 'var(--color-imaro-primary)' }}
          />
          <h2 className="text-base font-semibold text-foreground">
            {t('gestionnaire.profil.logoSection')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t('gestionnaire.profil.logoHint')}
        </p>

        <div className="flex items-center gap-5">
          {/* Preview */}
          <div
            className={cn(
              'flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed',
              logoUrl ? 'border-transparent' : 'border-border bg-muted/30',
            )}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={t('gestionnaire.profil.logoAlt')}
                className="size-full rounded-xl object-contain"
              />
            ) : (
              <Building2 className="size-6 text-muted-foreground/40" />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
            >
              <ImagePlus className="me-1.5 size-3.5" />
              {logoUrl
                ? t('gestionnaire.profil.changeLogo')
                : t('gestionnaire.profil.importLogo')}
            </Button>
            {logoUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={handleRemoveLogo}
              >
                <Trash2 className="me-1.5 size-3.5" />
                {t('actions.delete')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Préférences de notification ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Bell
            className="size-4 shrink-0"
            style={{ color: 'var(--color-imaro-primary)' }}
          />
          <h2 className="text-base font-semibold text-foreground">
            {t('gestionnaire.profil.notifSection')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t('gestionnaire.profil.notifHint')}
        </p>

        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-muted/40 mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('gestionnaire.profil.notifMaster')}
            </p>
          </div>
          <Switch
            checked={notifMaster}
            onCheckedChange={setNotifMaster}
            aria-label={t('gestionnaire.profil.notifMaster')}
          />
        </div>

        {/* Child toggles */}
        <div className="space-y-3">
          {[
            {
              id: 'notif-paiement',
              label: t('gestionnaire.profil.notifPaiementLabel'),
              description: t('gestionnaire.profil.notifPaiementDesc'),
              checked: notifPaiement,
              onChange: setNotifPaiement,
            },
            {
              id: 'notif-ticket',
              label: t('gestionnaire.profil.notifTicketLabel'),
              description: t('gestionnaire.profil.notifTicketDesc'),
              checked: notifTicket,
              onChange: setNotifTicket,
            },
            {
              id: 'notif-assemblee',
              label: t('gestionnaire.profil.notifAssembleeLabel'),
              description: t('gestionnaire.profil.notifAssembleeDesc'),
              checked: notifAssemblee,
              onChange: setNotifAssemblee,
            },
            {
              id: 'notif-retard',
              label: t('gestionnaire.profil.notifRetardLabel'),
              description: t('gestionnaire.profil.notifRetardDesc'),
              checked: notifRetard,
              onChange: setNotifRetard,
            },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={item.id}
                  className={cn(
                    'text-sm font-medium',
                    !notifMaster && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {item.label}
                </Label>
                <p
                  className={cn(
                    'text-xs text-muted-foreground mt-0.5',
                    !notifMaster && 'opacity-50',
                  )}
                >
                  {item.description}
                </p>
              </div>
              <Switch
                id={item.id}
                checked={item.checked}
                onCheckedChange={item.onChange}
                disabled={!notifMaster}
                aria-label={item.label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Apparence ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t('gestionnaire.profil.appearance')}
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('gestionnaire.profil.darkMode')}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* ── 6. Données personnelles ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Shield
            className="size-4 shrink-0"
            style={{ color: 'var(--color-imaro-primary)' }}
          />
          <h2 className="text-base font-semibold text-foreground">
            {t('gestionnaire.profil.dataSection')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t('gestionnaire.profil.dataRightsPre')}
          <span className="font-medium">
            {t('gestionnaire.profil.dataLaw')}
          </span>
        </p>

        <div className="space-y-3">
          {/* Droit d'accès */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-muted/40">
            <p className="text-sm font-semibold text-foreground mb-0.5">
              {t('gestionnaire.profil.accessTitle')}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t('gestionnaire.profil.accessDesc')}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.info(t('gestionnaire.profil.exportRequested'))
              }
            >
              {t('gestionnaire.profil.requestExport')}
            </Button>
          </div>

          {/* Droit de rectification */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  {t('gestionnaire.profil.rectifTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('gestionnaire.profil.rectifDesc')}
                </p>
              </div>
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="size-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Droit de suppression */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-muted/40">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-0.5">
              {t('gestionnaire.profil.deleteTitle')}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t('gestionnaire.profil.deleteDesc')}
            </p>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => toast.error(t('gestionnaire.profil.deleteWarn'))}
            >
              {t('gestionnaire.profil.deleteAccount')}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground border-t pt-4 dark:border-border">
          {t('gestionnaire.profil.retentionNote')}
        </p>
      </div>

      {/* ── 7. Logout ── */}
      <Button
        variant="outline"
        className="w-full h-12 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        <LogOut className="me-2 size-4" />
        {logoutMutation.isPending
          ? t('gestionnaire.profil.loggingOut')
          : t('gestionnaire.profil.logout')}
      </Button>
    </div>
  )
}
