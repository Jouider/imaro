import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
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
  residentLogin,
  residentActivate,
} from '@/services/auth.service'
import { setStoredToken } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'gestionnaire' | 'resident'
type Step = 'role' | 'phone' | 'code' | 'activate'

// ─── Error helper ─────────────────────────────────────────────────────────────

function extractError(err: unknown): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    if (d?.message) return d.message
  }
  return 'Erreur réseau'
}

// ─── Left brand panel ─────────────────────────────────────────────────────────

const FEATURES = [
  { icon: MessageCircle, text: 'Connexion instantanée par WhatsApp' },
  { icon: Shield, text: 'Conforme à la loi 18-00 sur la copropriété' },
  { icon: Globe, text: 'Interface disponible en français et arabe' },
]

function BrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between p-10 h-full"
      style={{
        background: 'linear-gradient(160deg, #1a4f72 0%, #0f3550 100%)',
      }}
    >
      {/* Logo */}
      <Wordmark inverted className="h-11 w-auto" />

      {/* Tagline + features */}
      <div className="space-y-8">
        <div>
          <h2 className="text-[2rem] font-bold leading-tight text-white">
            La gestion de
            <br />
            copropriété
            <br />
            simplifiée.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Syndics, charges, assemblées et documents —<br />
            tout en un seul endroit.
          </p>
        </div>

        <div className="space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
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
        © {new Date().getFullYear()} Imaro · Gestion de Syndic au Maroc
      </p>
    </div>
  )
}

// ─── Role cards ───────────────────────────────────────────────────────────────

const ROLE_CARDS: {
  id: Role
  icon: typeof Building2
  title: string
  desc: string
}[] = [
  {
    id: 'gestionnaire',
    icon: Building2,
    title: 'Syndic / Gestionnaire',
    desc: 'Gérez vos résidences, budgets, travaux et copropriétaires',
  },
  {
    id: 'resident',
    icon: Users,
    title: 'Copropriétaire',
    desc: 'Consultez vos charges, signalez des incidents et suivez vos paiements',
  },
]

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls =
  'w-full min-h-[52px] rounded-xl border-2 border-border bg-white px-4 text-base text-[var(--color-imaro-primary)] placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-imaro-primary)]/10 dark:bg-card'

// ─── Main page ────────────────────────────────────────────────────────────────

export function LoginPage() {
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

  // resident fields
  const [digits, setDigits] = useState('')
  const [accessCode, setAccessCode] = useState('') // temp code from gestionnaire
  const [newCode, setNewCode] = useState('') // personal code (activation)
  const [newCodeConfirm, setNewCodeConfirm] = useState('')

  const fullPhone = `+212${digits}`
  const phoneValid = /^[67]\d{8}$/.test(digits)

  // ── Gestionnaire — email + password ──
  const loginEmailMutation = useMutation({
    mutationFn: () => loginWithEmail(email, password),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/gestionnaire/dashboard', { replace: true })
    },
    onError: (err) => toast.error(extractError(err)),
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
    onError: (err) => toast.error(extractError(err)),
  })

  // ── Resident — first-login activation ──
  const activateMutation = useMutation({
    mutationFn: () => residentActivate(fullPhone, accessCode, newCode),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/portail', { replace: true })
    },
    onError: (err) => toast.error(extractError(err)),
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
    } else {
      setStep('role')
      setRole(null)
      setDigits('')
    }
  }

  // ── Titles per step ──
  const title =
    step === 'role'
      ? 'Bienvenue sur Imaro'
      : step === 'activate'
        ? 'Créez votre code personnel'
        : step === 'code'
          ? "Code d'accès"
          : role === 'gestionnaire'
            ? 'Espace Syndic'
            : 'Espace Copropriétaire'

  const subtitle =
    step === 'role'
      ? 'Choisissez votre espace pour continuer'
      : step === 'activate'
        ? 'Définissez un code personnel de 6 caractères minimum'
        : step === 'code'
          ? `Entrez le code fourni par votre syndic pour +212 ${digits}`
          : role === 'gestionnaire'
            ? 'Connectez-vous avec vos identifiants'
            : 'Entrez votre numéro de téléphone marocain'

  return (
    <div className="flex min-h-svh bg-[#f4f7fa]">
      {/* ── Left brand panel (desktop) ── */}
      <div className="w-[400px] shrink-0 shadow-xl shadow-black/10">
        <BrandPanel />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex min-h-svh flex-1 flex-col bg-white">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          {/* Logo (mobile only — hidden on desktop since brand panel shows) */}
          <div className="lg:hidden">
            <Wordmark className="h-8 w-auto" />
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
                Retour
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
                          {card.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {card.desc}
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
                  Connexion sécurisée — syndics par email, copropriétaires par
                  code d'accès
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
                    Syndic / Gestionnaire
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={cn(inputCls, 'ps-10 pe-4')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
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
                    Identifiants fournis par l'équipe Imaro
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[var(--color-imaro-primary)] text-base text-white hover:bg-[#153f5c]"
                  disabled={loginEmailMutation.isPending || !email || !password}
                >
                  {loginEmailMutation.isPending ? 'Connexion…' : 'Se connecter'}
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
                    Copropriétaire
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <div className="flex overflow-hidden rounded-xl border-2 border-border transition-all focus-within:border-[var(--color-imaro-primary)] focus-within:ring-4 focus-within:ring-[var(--color-imaro-primary)]/10">
                    <span className="flex items-center border-e bg-[#f4f7fa] px-4 text-sm font-bold text-[var(--color-imaro-primary)]">
                      +212
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="6XX XX XX XX"
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
                    Ex : 6XX XX XX XX ou 7XX XX XX XX
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#E67E22] text-base text-white hover:bg-[#d35400]"
                  disabled={!phoneValid}
                >
                  Continuer
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
                    {' '}
                    · Copropriétaire
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-code">Code d'accès</Label>
                  <div className="relative">
                    <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      id="access-code"
                      type="text"
                      placeholder="Code fourni par votre syndic"
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
                    Ce code vous a été communiqué par votre gestionnaire via
                    WhatsApp.
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
                    ? 'Vérification…'
                    : 'Accéder à mon espace'}
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
                    toast.error('Les codes ne correspondent pas')
                    return
                  }
                  if (newCode.length < 6) {
                    toast.error('Code trop court (6 caractères minimum)')
                    return
                  }
                  activateMutation.mutate()
                }}
              >
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <MessageCircle className="mb-1 size-4 inline-block me-1.5 text-amber-600" />
                  Première connexion — choisissez un code personnel que vous
                  utiliserez à chaque connexion.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-code">Nouveau code</Label>
                  <input
                    id="new-code"
                    type="password"
                    placeholder="6 caractères minimum"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-code">Confirmer le code</Label>
                  <input
                    id="confirm-code"
                    type="password"
                    placeholder="Répétez votre code"
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
                  className="h-12 w-full bg-[var(--color-imaro-primary)] text-base text-white hover:bg-[#153f5c]"
                  disabled={activateMutation.isPending || newCode.length < 6}
                >
                  {activateMutation.isPending
                    ? 'Activation…'
                    : 'Confirmer et se connecter'}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* ── Dev bypass ── */}
        {(import.meta.env.DEV || !!import.meta.env.VITE_SHOW_DEV_BYPASS) && (
          <div className="shrink-0 border-t border-dashed border-amber-300 bg-amber-50 px-6 py-4">
            <p className="mb-3 text-center text-xs font-semibold text-amber-700">
              ⚙️ Dev mode — accès direct
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
