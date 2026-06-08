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
  Phone,
  MailCheck,
  Sparkles,
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
  requestPasswordResetEmail,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from '@/services/auth.service'
import { DemoRequestDialog } from '@/components/auth/DemoRequestDialog'
import { setStoredToken } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'gestionnaire' | 'resident'
type Step =
  | 'role'
  | 'phone'
  | 'code'
  | 'activate'
  | 'admin-activate'
  | 'forgot'
  | 'forgot-otp'

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
      className="relative hidden h-full flex-col justify-between overflow-hidden p-10 lg:flex"
      style={{
        background:
          'linear-gradient(160deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)',
      }}
    >
      {/* Atmospheric grid (masked) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 40% 30%, black, transparent)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 40% 30%, black, transparent)',
        }}
      />
      {/* Breathing aurora blobs */}
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#3b62d4]/40 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute -left-20 bottom-10 size-64 rounded-full bg-[var(--accent)]/25 blur-3xl"
        style={{ animationDelay: '4s' }}
      />

      {/* Logo */}
      <Wordmark inverted className="relative h-11 w-auto" />

      {/* Tagline + features */}
      <div className="relative space-y-8">
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

      <p className="relative text-xs text-white/25">
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

  // forgot password
  const [forgotMethod, setForgotMethod] = useState<'email' | 'otp'>('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotPhone, setForgotPhone] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [resetPwd, setResetPwd] = useState('')
  const [resetPwdConfirm, setResetPwdConfirm] = useState('')

  // demo request ("create account" → sales-led)
  const [demoOpen, setDemoOpen] = useState(false)

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
        void navigate(
          res.data.user.role === 'gardien'
            ? '/gardien'
            : '/gestionnaire/dashboard',
          { replace: true },
        )
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

  // ── Forgot password — request reset (email link or phone OTP) ──
  const forgotMutation = useMutation({
    mutationFn: async () => {
      if (forgotMethod === 'email') {
        await requestPasswordResetEmail(forgotEmail.trim())
      } else {
        await requestPasswordResetOtp(`+212${forgotPhone}`)
      }
    },
    onSuccess: () => {
      if (forgotMethod === 'email') setForgotSent(true)
      else setStep('forgot-otp')
    },
    onError: (err) => toast.error(extractError(err, t('auth.networkError'))),
  })

  // ── Forgot password — verify OTP + set new password ──
  const resetOtpMutation = useMutation({
    mutationFn: () =>
      resetPasswordWithOtp(`+212${forgotPhone}`, resetCode, resetPwd),
    onSuccess: () => {
      toast.success(t('auth.forgot.resetDone'))
      setResetCode('')
      setResetPwd('')
      setResetPwdConfirm('')
      setForgotSent(false)
      setStep('phone')
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
    } else if (step === 'forgot') {
      setStep('phone')
      setForgotSent(false)
    } else if (step === 'forgot-otp') {
      setStep('forgot')
      setResetCode('')
      setResetPwd('')
      setResetPwdConfirm('')
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
      : step === 'forgot'
        ? t('auth.forgot.title')
        : step === 'forgot-otp'
          ? t('auth.forgot.otpTitle')
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
      : step === 'forgot'
        ? t('auth.forgot.subtitle')
        : step === 'forgot-otp'
          ? t('auth.forgot.otpSubtitle', { phone: forgotPhone })
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
      <div className="flex min-h-svh flex-1 flex-col bg-white dark:bg-background">
        {/* Top bar */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
          {/* Mobile: logo · Desktop: back-to-site link */}
          <Wordmark className="h-9 w-28 lg:hidden" />
          <a
            href="/"
            className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[var(--color-imaro-primary)] lg:inline-flex"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t('auth.backToSite')}
          </a>
          <LanguageSwitcher />
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 sm:px-10">
          <div className="w-full max-w-[400px]">
            {/* Back button */}
            {step !== 'role' && (
              <button
                type="button"
                onClick={goBack}
                className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" />
                {t('auth.back')}
              </button>
            )}

            {/* Heading */}
            <div className="mb-8 text-center">
              <h1 className="font-display text-[2rem] leading-[1.15] tracking-tight text-[var(--color-imaro-primary)]">
                {title}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
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
                      'group w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-start',
                      'transition-all duration-200',
                      'hover:-translate-y-0.5 hover:border-[var(--color-imaro-primary)]/30 hover:shadow-[0_12px_28px_-12px_rgb(0_18_68_/_0.25)]',
                      'dark:border-border dark:bg-card',
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-imaro flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20 transition-transform group-hover:scale-105">
                        <card.icon className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          {t(card.titleKey)}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                          {t(card.descKey)}
                        </p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-imaro-primary)] rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </div>
                  </button>
                ))}

                <p className="pt-3 text-center text-xs text-muted-foreground">
                  {t('auth.role.footnote')}
                </p>

                {/* Create account → sales-led demo request */}
                <div className="mt-2 rounded-xl border border-dashed border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary)]/[0.03] px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('auth.demo.noAccount')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-imaro-primary)] hover:underline"
                  >
                    <Sparkles className="size-3.5 text-[var(--accent)]" />
                    {t('auth.demo.cta')}
                  </button>
                </div>
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {t('auth.gestionnaire.passwordHint')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMethod('email')
                        setForgotEmail(email)
                        setForgotSent(false)
                        setStep('forgot')
                      }}
                      className="shrink-0 text-xs font-medium text-[var(--color-imaro-primary-light)] hover:underline"
                    >
                      {t('auth.forgot.link')}
                    </button>
                  </div>
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

            {/* ── Forgot password: request reset (email link or OTP) ── */}
            {step === 'forgot' &&
              (forgotSent ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <MailCheck className="size-6" />
                  </div>
                  <h2 className="mt-4 font-semibold text-foreground">
                    {t('auth.forgot.emailSentTitle')}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t('auth.forgot.emailSentBody', { email: forgotEmail })}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5"
                    onClick={() => {
                      setForgotSent(false)
                      setStep('phone')
                    }}
                  >
                    {t('auth.forgot.backToLogin')}
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    forgotMutation.mutate()
                  }}
                >
                  {/* Method toggle */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f4f7fa] p-1 dark:bg-muted">
                    {(['email', 'otp'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForgotMethod(m)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
                          forgotMethod === m
                            ? 'bg-white text-[var(--color-imaro-primary)] shadow-sm dark:bg-card'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {m === 'email' ? (
                          <Mail className="size-4" />
                        ) : (
                          <Phone className="size-4" />
                        )}
                        {t(`auth.forgot.method.${m}`)}
                      </button>
                    ))}
                  </div>

                  {forgotMethod === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">
                        {t('auth.gestionnaire.email')}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          id="forgot-email"
                          type="email"
                          placeholder={t('auth.gestionnaire.emailPlaceholder')}
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className={cn(inputCls, 'ps-10 pe-4')}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="forgot-phone">
                        {t('auth.resident.phoneLabel')}
                      </Label>
                      <div className="flex overflow-hidden rounded-xl border-2 border-border transition-all focus-within:border-[var(--color-imaro-primary)] focus-within:ring-4 focus-within:ring-[var(--color-imaro-primary)]/10">
                        <span className="flex items-center border-e bg-[#f4f7fa] px-4 text-sm font-bold text-[var(--color-imaro-primary)]">
                          +212
                        </span>
                        <input
                          id="forgot-phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="6XX XX XX XX"
                          value={forgotPhone}
                          onChange={(e) =>
                            setForgotPhone(
                              e.target.value.replace(/\D/g, '').slice(0, 9),
                            )
                          }
                          required
                          dir="ltr"
                          className="min-h-[52px] flex-1 bg-white px-4 text-base text-[var(--color-imaro-primary)] placeholder:text-muted-foreground/50 focus:outline-none dark:bg-card"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full bg-gradient-imaro text-base text-white shadow-sm hover:brightness-110"
                    disabled={
                      forgotMutation.isPending ||
                      (forgotMethod === 'email'
                        ? !forgotEmail
                        : forgotPhone.length < 9)
                    }
                  >
                    {forgotMutation.isPending
                      ? t('auth.forgot.sending')
                      : t('auth.forgot.submit')}
                  </Button>
                </form>
              ))}

            {/* ── Forgot password: verify OTP + set new password ── */}
            {step === 'forgot-otp' && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (resetPwd !== resetPwdConfirm) {
                    toast.error(t('auth.admin.mismatch'))
                    return
                  }
                  if (resetPwd.length < 8) {
                    toast.error(t('auth.admin.tooShort'))
                    return
                  }
                  resetOtpMutation.mutate()
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="reset-code">{t('auth.forgot.code')}</Label>
                  <div className="relative">
                    <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="123456"
                      value={resetCode}
                      onChange={(e) =>
                        setResetCode(
                          e.target.value.replace(/\D/g, '').slice(0, 6),
                        )
                      }
                      required
                      className={cn(
                        inputCls,
                        'ps-10 pe-4 font-mono tracking-widest',
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-pwd">
                    {t('auth.admin.newPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="reset-pwd"
                      type="password"
                      placeholder={t('auth.admin.newPasswordPlaceholder')}
                      value={resetPwd}
                      onChange={(e) => setResetPwd(e.target.value)}
                      required
                      className={cn(inputCls, 'ps-10 pe-4')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-pwd-confirm">
                    {t('auth.admin.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="reset-pwd-confirm"
                      type="password"
                      placeholder={t('auth.admin.confirmPasswordPlaceholder')}
                      value={resetPwdConfirm}
                      onChange={(e) => setResetPwdConfirm(e.target.value)}
                      required
                      className={cn(
                        inputCls,
                        'ps-10 pe-4',
                        resetPwdConfirm &&
                          resetPwd !== resetPwdConfirm &&
                          'border-red-400 focus:border-red-400 focus:ring-red-100',
                      )}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full bg-gradient-imaro text-base text-white shadow-sm hover:brightness-110"
                  disabled={resetOtpMutation.isPending || resetPwd.length < 8}
                >
                  {resetOtpMutation.isPending
                    ? t('auth.forgot.resetting')
                    : t('auth.forgot.resetSubmit')}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Demo request ("create account" → sales-led) */}
        <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />

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
                {t('common.coproprietaire')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
