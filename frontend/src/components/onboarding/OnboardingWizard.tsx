import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Sparkles,
  UserPlus,
  Building2,
  LayoutGrid,
  PartyPopper,
  ArrowRight,
  ArrowLeft,
  Check,
  UserRound,
  Loader2,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import {
  storeResidence,
  storeImmeuble,
  storeLot,
} from '@/services/gestionnaire.service'
import {
  createAppUser,
  generatePassword,
  ROLE_PERMISSION_PRESETS,
} from '@/services/equipe.service'
import {
  setOnboardingStep,
  completeOnboarding,
} from '@/services/onboarding.service'
import { me } from '@/services/auth.service'
import { generateLots, type SimpleSequentialConfig } from '@/utils/lotGenerator'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'team', icon: UserPlus },
  { key: 'residence', icon: Building2 },
  { key: 'lots', icon: LayoutGrid },
  { key: 'done', icon: PartyPopper },
] as const

const LOT_TYPES = ['appartement', 'commerce', 'bureau', 'parking', 'villa']

/**
 * First-run setup wizard for the syndic. Walks owner from zero to a configured
 * residence: (optional) add a gestionnaire → create the residence → generate
 * its lots → land on the residence page to continue (copropriétaires…).
 *
 * Skippable at any point (a dashboard checklist tracks remaining steps). Each
 * step commits to the API as you go, so progress survives a mid-way exit.
 */
/**
 * First-run setup flow card for the syndic. Rendered full-page at
 * /gestionnaire/onboarding (the GestionnaireGuard redirects a manager here
 * while tenant.onboarding_completed_at is null — issue #150). Walks the owner
 * from zero to a configured residence: (optional) gestionnaire → résidence →
 * lots → finish, then lands on the residence page to continue.
 */
export function OnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const refreshIdentity = useAuthStore((s) => s.refreshIdentity)

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  // Step 0 — team
  const [teamMode, setTeamMode] = useState<'self' | 'team'>('self')
  const [gestName, setGestName] = useState('')
  const [gestEmail, setGestEmail] = useState('')
  const [gestPassword, setGestPassword] = useState('')

  // Step 1 — residence
  const [resName, setResName] = useState('')
  const [resAddress, setResAddress] = useState('')
  const [resCity, setResCity] = useState('')
  const [resEcheance, setResEcheance] = useState('1')

  // Step 2 — lots
  const [lotCount, setLotCount] = useState('10')
  const [lotStart, setLotStart] = useState('1')
  const [lotType, setLotType] = useState('appartement')

  // Created entities
  const [residenceId, setResidenceId] = useState<number | null>(null)
  const [immeubleId, setImmeubleId] = useState<number | null>(null)

  const firstName = user?.name?.split(' ')[0] ?? ''

  // ── Step 0 — optionally create a gestionnaire ──
  async function submitTeam() {
    // Self-manage, or the gestionnaire is already created → just advance.
    if (teamMode === 'self' || gestPassword) {
      void setOnboardingStep(1)
      setStep(1)
      return
    }
    if (!gestName.trim() || !gestEmail.trim()) {
      toast.error(t('onboarding.team.required'))
      return
    }
    setBusy(true)
    try {
      const pwd = generatePassword()
      await createAppUser({
        name: gestName.trim(),
        email: gestEmail.trim(),
        password: pwd,
        role: 'gestionnaire',
        permissions: ROLE_PERMISSION_PRESETS.gestionnaire,
        residence_ids: [],
      })
      // Surface the temp credentials so the syndic can share them; the
      // gestionnaire changes the password at first login.
      setGestPassword(pwd)
      toast.success(t('onboarding.team.created'))
    } catch {
      toast.error(t('onboarding.team.error'))
    } finally {
      setBusy(false)
    }
  }

  // ── Step 1 — create residence + a default building ──
  async function submitResidence() {
    if (!resName.trim() || !resAddress.trim() || !resCity.trim()) {
      toast.error(t('onboarding.residence.required'))
      return
    }
    setBusy(true)
    try {
      const res = await storeResidence({
        name: resName.trim(),
        address: resAddress.trim(),
        city: resCity.trim(),
        mode_cotisation: 'tantieme',
        jour_echeance: Number(resEcheance) || 1,
      })
      const imm = await storeImmeuble(res.id, {
        nom: t('onboarding.lots.defaultBuilding'),
      })
      setResidenceId(res.id)
      setImmeubleId(imm.id)
      void setOnboardingStep(2)
      setStep(2)
    } catch {
      toast.error(t('onboarding.residence.error'))
    } finally {
      setBusy(false)
    }
  }

  // ── Step 2 — generate lots into the default building ──
  const lotConfig: SimpleSequentialConfig = {
    template: 'simple_sequential',
    totalLots: Math.min(Math.max(Number(lotCount) || 0, 0), 500),
    startingNumber: Number(lotStart) || 1,
    type: lotType,
    tantieme: 1,
  }
  const preview = generateLots(lotConfig)

  async function submitLots() {
    if (residenceId == null || immeubleId == null) return
    if (preview.length === 0) {
      toast.error(t('onboarding.lots.required'))
      return
    }
    setBusy(true)
    try {
      await Promise.all(
        preview.map((l) =>
          storeLot(residenceId, {
            numero: l.numero,
            type: l.type,
            etage: l.etage,
            superficie: 0,
            tantieme: l.tantieme,
            immeuble_id: immeubleId,
          }),
        ),
      )
      void setOnboardingStep(3)
      setStep(3)
    } catch {
      toast.error(t('onboarding.lots.error'))
    } finally {
      setBusy(false)
    }
  }

  // ── Step 3 — finish ──
  async function finish() {
    setBusy(true)
    try {
      await completeOnboarding()
      // Refresh the tenant so onboarding_completed_at lands in the store and
      // the dashboard checklist disappears without a manual reload.
      const data = await me()
      refreshIdentity(data)
    } catch {
      /* non-blocking — checklist still reflects real data on next /me */
    }
    setBusy(false)
    void navigate(
      residenceId != null
        ? `/gestionnaire/residences/${residenceId}`
        : '/gestionnaire/dashboard',
    )
  }

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div>
        {/* Header — navy gradient + progress */}
        <div className="bg-gradient-imaro-dark relative overflow-hidden px-6 pb-5 pt-6 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[var(--accent)]/25 blur-3xl"
          />
          <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="size-3.5 text-[var(--color-imaro-accent-light)]" />
            {t('onboarding.eyebrow')}
          </div>
          <h2 className="relative mt-2 font-display text-2xl leading-tight">
            {step === 0
              ? t('onboarding.welcomeTitle', { name: firstName })
              : t(`onboarding.${STEPS[step].key}.title`)}
          </h2>

          {/* Stepper */}
          <div className="relative mt-5 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset transition-colors',
                    i < step
                      ? 'bg-[var(--color-imaro-success)] text-white ring-transparent'
                      : i === step
                        ? 'bg-white text-[var(--color-imaro-primary-dark)] ring-transparent'
                        : 'bg-white/10 text-white/60 ring-white/20',
                  )}
                >
                  {i < step ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 rounded-full transition-colors',
                      i < step
                        ? 'bg-[var(--color-imaro-success)]'
                        : 'bg-white/15',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-6">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('onboarding.team.intro')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={teamMode === 'self'}
                  icon={<UserRound className="size-5" />}
                  title={t('onboarding.team.selfTitle')}
                  desc={t('onboarding.team.selfDesc')}
                  onClick={() => setTeamMode('self')}
                />
                <ChoiceCard
                  active={teamMode === 'team'}
                  icon={<UserPlus className="size-5" />}
                  title={t('onboarding.team.addTitle')}
                  desc={t('onboarding.team.addDesc')}
                  onClick={() => setTeamMode('team')}
                />
              </div>
              {teamMode === 'team' && !gestPassword && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <Field label={t('onboarding.team.name')}>
                    <Input
                      value={gestName}
                      onChange={(e) => setGestName(e.target.value)}
                      placeholder={t('onboarding.team.namePlaceholder')}
                    />
                  </Field>
                  <Field label={t('onboarding.team.email')}>
                    <Input
                      type="email"
                      value={gestEmail}
                      onChange={(e) => setGestEmail(e.target.value)}
                      placeholder="gestionnaire@cabinet.ma"
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    {t('onboarding.team.hint')}
                  </p>
                </div>
              )}

              {/* Temp credentials to share with the new gestionnaire */}
              {gestPassword && (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    <Check className="size-4" strokeWidth={3} />
                    {t('onboarding.team.credentialsTitle')}
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 font-mono text-sm dark:bg-card">
                    <span className="truncate text-muted-foreground">
                      {gestEmail}
                    </span>
                    <span className="font-semibold text-[var(--primary)]">
                      {gestPassword}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `${gestEmail} · ${gestPassword}`,
                      )
                      toast.success(t('onboarding.team.copied'))
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <Copy className="size-3.5" />
                    {t('onboarding.team.copy')}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {t('onboarding.team.credentialsHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('onboarding.residence.intro')}
              </p>
              <Field label={t('onboarding.residence.name')}>
                <Input
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder={t('onboarding.residence.namePlaceholder')}
                  autoFocus
                />
              </Field>
              <Field label={t('onboarding.residence.address')}>
                <Input
                  value={resAddress}
                  onChange={(e) => setResAddress(e.target.value)}
                  placeholder="123 Bd Mohammed V"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('onboarding.residence.city')}>
                  <Input
                    value={resCity}
                    onChange={(e) => setResCity(e.target.value)}
                    placeholder="Casablanca"
                  />
                </Field>
                <Field label={t('onboarding.residence.echeance')}>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={resEcheance}
                    onChange={(e) => setResEcheance(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('onboarding.lots.intro')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('onboarding.lots.count')}>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={lotCount}
                    onChange={(e) => setLotCount(e.target.value)}
                  />
                </Field>
                <Field label={t('onboarding.lots.start')}>
                  <Input
                    type="number"
                    min={1}
                    value={lotStart}
                    onChange={(e) => setLotStart(e.target.value)}
                  />
                </Field>
              </div>
              <Field label={t('onboarding.lots.type')}>
                <Select value={lotType} onValueChange={setLotType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOT_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`onboarding.lots.types.${tp}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Live preview */}
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('onboarding.lots.preview', { count: preview.length })}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.slice(0, 10).map((l) => (
                    <span
                      key={l.numero}
                      className="rounded-md bg-[var(--color-imaro-primary)]/[0.06] px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
                    >
                      {l.numero}
                    </span>
                  ))}
                  {preview.length > 10 && (
                    <span className="px-1 text-xs text-muted-foreground">
                      +{preview.length - 10}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('onboarding.lots.advancedHint')}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-4 text-center">
              <div className="bg-gradient-imaro mx-auto flex size-16 items-center justify-center rounded-2xl text-white shadow-lg">
                <PartyPopper className="size-8" />
              </div>
              <h3 className="mt-5 font-display text-2xl text-[var(--primary)]">
                {t('onboarding.done.heading', { name: resName })}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {t('onboarding.done.body', { count: preview.length })}
              </p>
              <div className="mx-auto mt-6 max-w-xs space-y-2 text-start">
                {['copros', 'banque', 'budget'].map((k) => (
                  <div
                    key={k}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <ArrowRight className="size-3.5 text-[var(--accent)] rtl:rotate-180" />
                    {t(`onboarding.done.next.${k}`)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {step > 0 && step < 3 ? (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
            >
              <ArrowLeft className="me-1.5 size-4 rtl:rotate-180" />
              {t('onboarding.back')}
            </Button>
          ) : (
            <span />
          )}

          {step === 0 && (
            <Button
              onClick={submitTeam}
              disabled={busy}
              className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            >
              {busy && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {t('onboarding.continue')}
              <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
          )}
          {step === 1 && (
            <Button
              onClick={submitResidence}
              disabled={busy}
              className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            >
              {busy && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {t('onboarding.continue')}
              <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={submitLots}
              disabled={busy}
              className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            >
              {busy && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {t('onboarding.lots.generate', { count: preview.length })}
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={finish}
              disabled={busy}
              className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            >
              {busy && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {t('onboarding.done.cta')}
              <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Small building blocks ──────────────────────────────────────────────────

function ChoiceCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border-2 p-4 text-start transition-all',
        active
          ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)]/[0.04] shadow-sm'
          : 'border-border hover:border-[var(--color-imaro-primary)]/30',
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          active
            ? 'bg-gradient-imaro text-white'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="font-semibold text-foreground">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">
        {desc}
      </span>
    </button>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
