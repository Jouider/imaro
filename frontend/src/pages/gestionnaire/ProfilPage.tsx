import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
import { Separator } from '@/components/ui/separator'
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
  const navigate = useNavigate()
  const { user, tenant, clear } = useAuthStore()
  const { logoUrl, setLogoUrl } = useSettingsStore()
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Edit mode ──
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(user?.name ?? '')
  const [editPhone, setEditPhone] = useState(user?.phone ?? '')

  const handleSaveProfile = () => {
    toast.success('Profil mis à jour avec succès')
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
      toast.error('Le logo ne doit pas dépasser 2 Mo')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogoUrl(reader.result as string)
      toast.success('Logo mis à jour — visible dans la barre de navigation')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    toast.success('Logo supprimé')
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
  const planLabel = tenant?.plan
    ? tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1).toLowerCase()
    : 'Standard'

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      {/* ── 1. Page header ── */}
      <h1 className="text-2xl font-bold" style={{ color: '#1B4F72' }}>
        Mon Profil
      </h1>

      {/* ── 2. Hero card ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-start gap-5">
          {/* Avatar with edit button */}
          <div className="relative shrink-0">
            <div
              className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #2980b9, #1b4f72)',
              }}
            >
              {initials}
            </div>
            <button
              onClick={() => setEditMode((prev) => !prev)}
              aria-label="Modifier le profil"
              className={cn(
                'absolute bottom-0 end-0 flex size-6 items-center justify-center rounded-full border bg-white shadow-sm transition-colors hover:bg-gray-50 dark:bg-card dark:border-border dark:hover:bg-muted',
                editMode && 'border-[#1B4F72]',
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
                style={{ background: '#1B4F72' }}
              >
                {user?.role === 'manager' ? 'Manager' : 'Gestionnaire'}
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
                <Label htmlFor="edit-name">Nom complet</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Téléphone</Label>
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
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                <X className="me-1.5 size-3.5" />
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Logo du syndic ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-1">
          <ImagePlus className="size-4 shrink-0" style={{ color: '#1B4F72' }} />
          <h2 className="text-base font-semibold text-foreground">
            Logo du Syndic
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Affiché dans la barre de navigation. PNG ou JPG, 2 Mo max.
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
                alt="Logo syndic"
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
              {logoUrl ? 'Changer le logo' : 'Importer un logo'}
            </Button>
            {logoUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={handleRemoveLogo}
              >
                <Trash2 className="me-1.5 size-3.5" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Syndic & Abonnement (was 3) ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="size-4 shrink-0" style={{ color: '#1B4F72' }} />
          <h2 className="text-base font-semibold text-foreground">
            Syndic & Abonnement
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold">
              {planLabel}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Société</span>
            <span className="text-sm font-medium text-foreground">
              {tenant?.name ?? '—'}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <a
            href="#"
            className="text-sm font-medium"
            style={{ color: '#E67E22' }}
            onClick={(e) => {
              e.preventDefault()
              toast.info('Fonctionnalité bientôt disponible')
            }}
          >
            Passer au Pro →
          </a>
        </div>
      </div>

      {/* ── 4. Préférences de notification ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="size-4 shrink-0" style={{ color: '#1B4F72' }} />
          <h2 className="text-base font-semibold text-foreground">
            Préférences de Notification
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Choisissez les alertes WhatsApp que vous souhaitez recevoir
        </p>

        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-muted/40 mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Activer les notifications WhatsApp
            </p>
          </div>
          <Switch
            checked={notifMaster}
            onCheckedChange={setNotifMaster}
            aria-label="Activer les notifications WhatsApp"
          />
        </div>

        {/* Child toggles */}
        <div className="space-y-3">
          {[
            {
              id: 'notif-paiement',
              label: 'Nouveau paiement reçu',
              description: 'Un copropriétaire effectue un paiement',
              checked: notifPaiement,
              onChange: setNotifPaiement,
            },
            {
              id: 'notif-ticket',
              label: "Nouveau ticket d'incident",
              description: 'Un résident signale un incident',
              checked: notifTicket,
              onChange: setNotifTicket,
            },
            {
              id: 'notif-assemblee',
              label: 'Assemblée programmée',
              description: 'Une assemblée générale est planifiée',
              checked: notifAssemblee,
              onChange: setNotifAssemblee,
            },
            {
              id: 'notif-retard',
              label: 'Retard de paiement',
              description: "Un copropriétaire dépasse la date d'échéance",
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
          Apparence
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mode sombre</span>
          <ThemeToggle />
        </div>
      </div>

      {/* ── 6. Données personnelles ── */}
      <div className="rounded-2xl bg-white shadow-sm p-6 dark:bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="size-4 shrink-0" style={{ color: '#1B4F72' }} />
          <h2 className="text-base font-semibold text-foreground">
            Mes Données Personnelles
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Vos droits conformément à la{' '}
          <span className="font-medium">
            loi 09-08 relative à la protection des données personnelles
          </span>
        </p>

        <div className="space-y-3">
          {/* Droit d'accès */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-muted/40">
            <p className="text-sm font-semibold text-foreground mb-0.5">
              Droit d'accès (Article 7)
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Demandez une copie de toutes vos données. L'export sera disponible
              sous 48h.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.info(
                  'Demande enregistrée. Vous recevrez votre export sous 48h.',
                )
              }
            >
              Demander l'export
            </Button>
          </div>

          {/* Droit de rectification */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  Droit de rectification (Article 8)
                </p>
                <p className="text-xs text-muted-foreground">
                  Modifiez vos informations personnelles dans la section
                  ci-dessus.
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
              Droit de suppression (Article 8)
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Demandez la suppression de votre compte. Un administrateur
              examinera votre demande.
            </p>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                toast.error(
                  'Cette action est irréversible. Contactez support@imaro.ma',
                )
              }
            >
              Supprimer mon compte
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground border-t pt-4 dark:border-border">
          Certaines données comptables peuvent être conservées 10 ans
          conformément aux obligations légales marocaines.
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
        {logoutMutation.isPending ? 'Déconnexion…' : 'Se déconnecter'}
      </Button>
    </div>
  )
}
