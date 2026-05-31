import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import {
  Building2,
  Users,
  MessageCircle,
  ArrowLeft,
  ChevronRight,
  Shield,
  Globe,
  Mail,
  Lock,
  KeyRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'
import {
  loginWithEmail,
  adminActivate,
  residentLogin,
  residentActivate,
} from '@/services/auth.service'
import { setStoredToken } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'gestionnaire' | 'resident'
type Step = 'role' | 'phone' | 'code' | 'activate' | 'admin-activate'

// ─── Error helper ─────────────────────────────────────────────────────────────

function extractError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    if (d?.message) return d.message
  }
  return fallback
}

// ─── Left brand panel ─────────────────────────────────────────────────────────

function BrandPanel() {
  const { t } = useTranslation()
  const features = [
    { icon: MessageCircle, text: t('auth.brand.feature1') },
    { icon: Shield, text: t('auth.brand.feature2') },
    { icon: Globe, text: t('auth.brand.feature3') },
  ]

  return (
    <div
      className="hidden lg:flex flex-col justify-between p-10 h-full"
      style={{
        background:
          'linear-gradient(160deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)',
      }}
    >
      {/* Logo */}
      <Wordmark inverted className="h-11 w-auto" />

      {/* Tagline + features */}
      <div className="space-y-8">
        <div>
          <h2 className="text-[2rem] font-bold leading-tight text-white">
            {t('auth.brand.taglineLine1')}
            <br />
            {t('auth.brand.taglineLine2')}
            <br />
            {t('auth.brand.taglineLine3')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {t('auth.brand.subtitle')}
          </p>
        </div>

        <div className="space-y-3">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon className="size-4 text-[#E67E22]" />
              </div>
              <span className="text-sm text-white/75">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/25">
        {t('auth.brand.footer', { year: new Date().getFullYear() })}
      </p>
    </div>
  )
}

// ─── Role cards (config — labels via t() at render) ──────────────────────────

const ROLE_CARDS: {
  id: Role
  icon: typeof Building2
  titleKey: string
  descKey: string
}[] = [
  {
    id: 'gestionnaire',
    icon: Building2,
    titleKey: 'auth.role.gestionnaireTitle',
    descKey: 'auth.role.gestionnaireDesc',
  },
  {
    id: 'resident',
    icon: Users,
    titleKey: 'auth.role.residentTitle',
    descKey: 'auth.role.residentDesc',
  },
]

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls =
  'w-full min-h-[52px] rounded-xl border-2 border-border bg-white px-4 text-base text-[var(--color-imaro-primary)] placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-imaro-primary)]/10 dark:bg-card'

// ─── Main page ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useAuthStore((s) => s.setSession)

  const paramRole = searchParams.get('role') as Role | null
  const validParamRole =
    paramRole === 'gestionnaire' || paramRole === 'resident' ? paramRole : null

  const [role, setRole] = useState<Role | null>(validParamRole)
  const [step, setStep] = useState<Step>(validParamRole ? 'phone' : 'role')

  // gestionnaire fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // admin first-login — personal password
  const [adminPwd, setAdminPwd] = useState('')
  const [adminPwdConfirm, setAdminPwdConfirm] = useState('')

  // resident fields
  const [digits, setDigits] = useState('')
  const [accessCode, setAccessCode] = useState('') // temp code from gestionnaire
  const [newCode, setNewCode] = useState('') // personal code (activation)
  const [newCodeConfirm, setNewCodeConfirm] = useState('')

  const fullPhone = `+212${digits}`
  const phoneValid = /^[67]\d{8}$/.test(digits)

  // ── Gestionnaire / Admin — email + password ──
  const loginEmailMutation = useMutation({
    mutationFn: () => loginWithEmail(email, password),
    onSuccess: (res) => {
      if (res.status === 'success') {
        setStoredToken(res.data.token)
        setSession(res.data)
        void navigate('/gestionnaire/dashboard', { replace: true })
      } else if (res.status === 'first_login') {
        // Manager-created admin must set their own password
        setStep('admin-activate')
      }
    },
    onError: (err) => toast.error(extractError(err, t('auth.networkError'))),
  })

  // ── Admin — first-login activation ──
  const adminActivateMutation = useMutation({
    mutationFn: () => adminActivate(email, password, adminPwd),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/gestionnaire/dashboard', { replace: true })
    },
    onError: (err) => toast.error(extractError(err, t('auth.networkError'))),
  })

  // ── Resident — phone + code ──
  const residentLoginMutation = useMutation({
    mutationFn: () => residentLogin(fullPhone, accessCode),
    onSuccess: (res) => {
      if (res.status === 'success') {
        setStoredToken(res.data.token)
        setSession(res.data)
        void navigate('/portail', { replace: true })
      } else if (res.status === 'first_login') {
        // Resident must set their own personal code
        setStep('activate')
      }
    },
    onError: (err) => toast.error(extractError(err, t('auth.networkError'))),
  })

  // ── Resident — first-login activation ──
  const activateMutation = useMutation({
    mutationFn: () => residentActivate(fullPhone, accessCode, newCode),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/portail', { replace: true })
    },
    onError: (err) => toast.error(extractError(err, t('auth.networkError'))),
  })

  function pickRole(r: Role) {
    setRole(r)
    setStep('phone')
  }

  function goBack() {
    if (step === 'code') {
      setStep('phone')
      setAccessCode('')
    } else if (step === 'activate') {
      setStep('code')
      setNewCode('')
      setNewCodeConfirm('')
    } else if (step === 'admin-activate') {
      setStep('phone')
      setPassword('')
      setAdminPwd('')
      setAdminPwdConfirm('')
    } else {
      setStep('role')
      setRole(null)
      setDigits('')
    }
  }

  // ── Titles per step ──
  const title =
    step === 'role'
      ? t('auth.role.welcomeTitle')
      : step === 'admin-activate'
        ? t('auth.admin.activateTitle')
        : step === 'activate'
          ? t('auth.resident.activateTitle')
          : step === 'code'
            ? t('auth.resident.codeTitle')
            : role === 'gestionnaire'
              ? t('auth.gestionnaire.title')
              : t('auth.resident.title')

  const subtitle =
    step === 'role'
      ? t('auth.role.welcomeSubtitle')
      : step === 'admin-activate'
        ? t('auth.admin.activateSubtitle')
        : step === 'activate'
          ? t('auth.resident.activateSubtitle')
          : step === 'code'
            ? t('auth.resident.codeSubtitle', { digits })
            : role === 'gestionnaire'
              ? t('auth.gestionnaire.subtitle')
              : t('auth.resident.subtitle')

  return (
    <div className="flex min-h-svh bg-[#f4f7fa]">
      {/* ── Left brand panel (desktop only) ── */}
      <div className="hidden w-[400px] shrink-0 shadow-xl shadow-black/10 lg:block">
        <BrandPanel />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex min-h-svh flex-1 flex-col bg-white">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          {/* Logo (mobile only — hidden on desktop since brand panel shows) */}
          <div className="lg:hidden">
            <Wordmark className="h-10 w-32" />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Back button */}
            {step !== 'role' && (
              <button
                type="button"
                onClick={goBack}
                className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                {t('auth.back')}
              </button>
            )}

            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--color-imaro-primary)]">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {/* ── Step: Role selection ── */}
            {step === 'role' && (
              <div className="space-y-3">
                {ROLE_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => pickRole(card.id)}
                    className={cn(
                      'group w-full rounded-xl border-2 p-5 text-left',
                      'transition-all duration-150',
                      'border-transparent bg-[#f4f7fa]',
                      'hover:border-[var(--color-imaro-primary)] hover:bg-white hover:shadow-md',
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-xl',
                          'bg-[var(--color-imaro-primary)]/8 transition-colors',
                          'group-hover:bg-[var(--color-imaro-primary)]',
                        )}
                      >
                        <card.icon
                          className={cn(
                            'size-6 transition-colors',
                            'text-[var(--color-imaro-primary)] group-hover:text-white',
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          {t(card.titleKey)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t(card.descKey)}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          'size-5 shrink-0 transition-colors',
                          'text-muted-foreground/30 group-hover:text-[var(--color-imaro-primary)]',
                        )}
                      />
                    </div>
                  </button>
                ))}

                <p className="pt-3 text-center text-xs text-muted-foreground">
                  {t('auth.role.footnote')}
                </p>
              </div>
            )}

            {/* ── Step: Phone (resident) or Email+Password (gestionnaire) ── */}
            {/* ── Gestionnaire: email + password ── */}
            {step === 'phone' && role === 'gestionnaire' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  loginEmailMutation.mutate()
                }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--color-imaro-primary)]/5 px-3 py-1 text-xs font-medium text-[var(--color-imaro-primary)]">
                    <Building2 className="size-3.5" />
                    {t('auth.role.gestionnaireTitle')}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.gestionnaire.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      placeholder={t('auth.gestionnaire.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={cn(inputCls, 'ps-10 pe-4')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t('auth.gestionnaire.password')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={cn(inputCls, 'ps-10 pe-4')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.gestionnaire.passwordHint')}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-gradient-imaro text-base text-white shadow-sm hover:brightness-110"
                  disabled={loginEmailMutation.isPending || !email || !password}
                >
                  {loginEmailMutation.isPending
                    ? t('auth.gestionnaire.submitting')
                    : t('auth.gestionnaire.submit')}
                </Button>
              </form>
            )}

            {/* ── Resident: enter phone ── */}
            {step === 'phone' && role === 'resident' && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  setStep('code')
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--color-imaro-primary)]/5 px-3 py-1 text-xs font-medium text-[var(--color-imaro-primary)]">
                    <Users className="size-3.5" />
                    {t('auth.role.residentTitle')}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.resident.phoneLabel')}</Label>
                  <div className="flex overflow-hidden rounded-xl border-2 border-border transition-all focus-within:border-[var(--color-imaro-primary)] focus-within:ring-4 focus-within:ring-[var(--color-imaro-primary)]/10">
                    <span className="flex items-center border-e bg-[#f4f7fa] px-4 text-sm font-bold text-[var(--color-imaro-primary)]">
                      +212
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder={t('auth.resident.phonePlaceholder')}
                      value={digits}
                      onChange={(e) =>
                        setDigits(e.target.value.replace(/\D/g, '').slice(0, 9))
                      }
                      required
                      dir="ltr"
                      className="min-h-[52px] flex-1 bg-white px-4 text-base text-[var(--color-imaro-primary)] placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.resident.phoneHint')}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#E67E22] text-base text-white hover:bg-[#d35400]"
                  disabled={!phoneValid}
                >
                  {t('auth.resident.continue')}
                </Button>
              </form>
            )}

            {/* ── Resident: enter access code (from gestionnaire) ── */}
            {step === 'code' && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  residentLoginMutation.mutate()
                }}
              >
                <div className="rounded-xl bg-[var(--color-imaro-primary)]/5 px-4 py-3 text-sm text-[var(--color-imaro-primary)]">
                  <span className="font-semibold">+212 {digits}</span>
                  <span className="text-[var(--color-imaro-primary)]/60">
                    {' · '}
                    {t('auth.role.residentTitle')}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-code">
                    {t('auth.resident.codeLabel')}
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="access-code"
                      type="text"
                      placeholder={t('auth.resident.codePlaceholder')}
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.trim())}
                      required
                      autoComplete="off"
                      className={cn(
                        inputCls,
                        'ps-10 pe-4 font-mono tracking-wider',
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.resident.codeHint')}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#E67E22] text-base text-white hover:bg-[#d35400]"
                  disabled={
                    residentLoginMutation.isPending || accessCode.length < 6
                  }
                >
                  {residentLoginMutation.isPending
                    ? t('auth.resident.codeVerifying')
                    : t('auth.resident.codeSubmit')}
                </Button>
              </form>
            )}

            {/* ── Resident: first-login — set personal code ── */}
            {step === 'activate' && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (newCode !== newCodeConfirm) {
                    toast.error(t('auth.resident.codesMismatch'))
                    return
                  }
                  if (newCode.length < 6) {
                    toast.error(t('auth.resident.codeTooShort'))
                    return
                  }
                  activateMutation.mutate()
                }}
              >
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <MessageCircle className="mb-1 size-4 inline-block me-1.5 text-amber-600" />
                  {t('auth.resident.activateHint')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-code">{t('auth.resident.newCode')}</Label>
                  <input
                    id="new-code"
                    type="password"
                    placeholder={t('auth.resident.newCodePlaceholder')}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-code">
                    {t('auth.resident.confirmCode')}
                  </Label>
                  <input
                    id="confirm-code"
                    type="password"
                    placeholder={t('auth.resident.confirmCodePlaceholder')}
                    value={newCodeConfirm}
                    onChange={(e) => setNewCodeConfirm(e.target.value)}
                    required
                    className={cn(
                      inputCls,
                      newCodeConfirm &&
                        newCode !== newCodeConfirm &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100',
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-gradient-imaro text-base text-white shadow-sm hover:brightness-110"
                  disabled={activateMutation.isPending || newCode.length < 6}
                >
                  {activateMutation.isPending
                    ? t('auth.resident.activating')
                    : t('auth.resident.activateSubmit')}
                </Button>
              </form>
            )}

            {/* ── Admin: first-login — set personal password ── */}
            {step === 'admin-activate' && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (adminPwd !== adminPwdConfirm) {
                    toast.error(t('auth.admin.mismatch'))
                    return
                  }
                  if (adminPwd.length < 8) {
                    toast.error(t('auth.admin.tooShort'))
                    return
                  }
                  adminActivateMutation.mutate()
                }}
              >
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <Shield className="mb-1 size-4 inline-block me-1.5 text-amber-600" />
                  {t('auth.admin.activateHint')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-new-pwd">
                    {t('auth.admin.newPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="admin-new-pwd"
                      type="password"
                      placeholder={t('auth.admin.newPasswordPlaceholder')}
                      value={adminPwd}
                      onChange={(e) => setAdminPwd(e.target.value)}
                      required
                      className={cn(inputCls, 'ps-10 pe-4')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-confirm-pwd">
                    {t('auth.admin.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="admin-confirm-pwd"
                      type="password"
                      placeholder={t('auth.admin.confirmPasswordPlaceholder')}
                      value={adminPwdConfirm}
                      onChange={(e) => setAdminPwdConfirm(e.target.value)}
                      required
                      className={cn(
                        inputCls,
                        'ps-10 pe-4',
                        adminPwdConfirm &&
                          adminPwd !== adminPwdConfirm &&
                          'border-red-400 focus:border-red-400 focus:ring-red-100',
                      )}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-gradient-imaro text-base text-white shadow-sm hover:brightness-110"
                  disabled={
                    adminActivateMutation.isPending || adminPwd.length < 8
                  }
                >
                  {adminActivateMutation.isPending
                    ? t('auth.admin.activating')
                    : t('auth.admin.activateSubmit')}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* ── Dev bypass ── */}
        {(import.meta.env.DEV || !!import.meta.env.VITE_SHOW_DEV_BYPASS) && (
          <div className="shrink-0 border-t border-dashed border-amber-300 bg-amber-50 px-6 py-4">
            <p className="mb-3 text-center text-xs font-semibold text-amber-700">
              ⚙️ {t('auth.devBypass')}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  setStoredToken('dev-mock-token-gestionnaire')
                  setSession({
                    token: 'dev-mock-token-gestionnaire',
                    user: {
                      id: 2,
                      name: 'Ahmed Berrada',
                      phone: '+212612000002',
                      role: 'gestionnaire' as const,
                    },
                    tenant: {
                      id: 1,
                      name: 'Atlas Casablanca',
                      subdomain: 'atlas',
                      plan: 'standard',
                    },
                  })
                  void navigate('/gestionnaire/dashboard', { replace: true })
                }}
              >
                Gestionnaire
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  setStoredToken('dev-mock-token-resident')
                  setSession({
                    token: 'dev-mock-token-resident',
                    user: {
                      id: 1,
                      name: 'Youssef El Mansouri',
                      phone: '+212612345678',
                      role: 'resident' as const,
                    },
                    tenant: {
                      id: 1,
                      name: 'Résidence Al Blanca',
                      subdomain: 'blanca',
                      plan: 'standard',
                    },
                  })
                  void navigate('/portail', { replace: true })
                }}
              >
                Copropriétaire
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
