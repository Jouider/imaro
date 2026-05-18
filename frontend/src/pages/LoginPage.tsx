import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ClipboardEvent,
} from 'react'
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
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'
import { requestOtp, verifyOtp, loginWithEmail } from '@/services/auth.service'
import { setStoredToken } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'gestionnaire' | 'resident'
type Step = 'role' | 'phone' | 'otp'

// ─── OTP cooldown ─────────────────────────────────────────────────────────────

const OTP_COOLDOWN = 60

function useCooldown() {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = () => {
    setSeconds(OTP_COOLDOWN)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    },
    [],
  )

  return { seconds, start, active: seconds > 0 }
}

// ─── OTP 6-box input ──────────────────────────────────────────────────────────

type OtpBoxesProps = { value: string; onChange: (v: string) => void }

function OtpBoxes({ value, onChange }: OtpBoxesProps) {
  const refsEl = useRef<(HTMLInputElement | null)[]>([])

  function focusBox(index: number) {
    refsEl.current[Math.max(0, Math.min(5, index))]?.focus()
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[index] = digit
    const next = chars.join('').slice(0, 6)
    onChange(next)
    if (digit) focusBox(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[index]) {
        const chars = value.split('')
        chars[index] = ''
        onChange(chars.join(''))
      } else {
        focusBox(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight') {
      focusBox(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    focusBox(Math.min(pasted.length, 5))
  }

  return (
    <div className="flex justify-center gap-2.5" dir="ltr">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refsEl.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Chiffre ${i + 1}`}
          className={cn(
            'h-12 w-12 rounded-xl border-2 bg-white text-center text-xl font-semibold',
            'text-[#1B4F72] transition-all focus:outline-none',
            value[i]
              ? 'border-[#1B4F72] shadow-sm'
              : 'border-border focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20',
          )}
        />
      ))}
    </div>
  )
}

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
      style={{ background: 'linear-gradient(160deg, #1a4f72 0%, #0f3550 100%)' }}
    >
      {/* Logo */}
      <Wordmark inverted className="h-11 w-auto" />

      {/* Tagline + features */}
      <div className="space-y-8">
        <div>
          <h2 className="text-[2rem] font-bold leading-tight text-white">
            La gestion de<br />copropriété<br />simplifiée.
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

const ROLE_CARDS: { id: Role; icon: typeof Building2; title: string; desc: string }[] = [
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

// ─── Main page ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useAuthStore((s) => s.setSession)
  const cooldown = useCooldown()

  // Support ?role=gestionnaire or ?role=resident to skip role step
  const paramRole = searchParams.get('role') as Role | null
  const validParamRole =
    paramRole === 'gestionnaire' || paramRole === 'resident' ? paramRole : null

  const [role, setRole] = useState<Role | null>(validParamRole)
  const [step, setStep] = useState<Step>(validParamRole ? 'phone' : 'role')
  const [digits, setDigits] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fullPhone = `+212${digits}`
  const phoneValid = /^[67]\d{8}$/.test(digits)

  // ── Request OTP ──
  const requestMutation = useMutation({
    mutationFn: () => requestOtp(fullPhone),
    onSuccess: () => {
      setStep('otp')
      setOtp('')
      cooldown.start()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  // ── Verify OTP ──
  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(fullPhone, otp),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate(
        role === 'gestionnaire' ? '/gestionnaire/dashboard' : '/portail',
        { replace: true },
      )
    },
    onError: (err) => {
      toast.error(extractError(err))
      setOtp('')
    },
  })

  // ── Email+password login (gestionnaire) ──
  const loginEmailMutation = useMutation({
    mutationFn: () => loginWithEmail(email, password),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/gestionnaire/dashboard', { replace: true })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  // Auto-submit on complete OTP
  useEffect(() => {
    if (otp.length === 6 && !verifyMutation.isPending) {
      verifyMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  function pickRole(r: Role) {
    setRole(r)
    setStep('phone')
  }

  function goBack() {
    if (step === 'otp') {
      setStep('phone')
      setOtp('')
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
      : step === 'phone'
        ? role === 'gestionnaire'
          ? 'Espace Syndic'
          : 'Espace Copropriétaire'
        : 'Code de vérification'

  const subtitle =
    step === 'role'
      ? 'Choisissez votre espace pour continuer'
      : step === 'phone'
        ? role === 'gestionnaire'
          ? 'Connectez-vous avec vos identifiants'
          : 'Entrez votre numéro de téléphone marocain'
        : `Code envoyé via WhatsApp au +212 ${digits}`

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
              <h1 className="text-2xl font-bold text-[#1B4F72]">{title}</h1>
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
                      'hover:border-[#1B4F72] hover:bg-white hover:shadow-md',
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-xl',
                          'bg-[#1B4F72]/8 transition-colors',
                          'group-hover:bg-[#1B4F72]',
                        )}
                      >
                        <card.icon
                          className={cn(
                            'size-6 transition-colors',
                            'text-[#1B4F72] group-hover:text-white',
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{card.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{card.desc}</p>
                      </div>
                      <ChevronRight
                        className={cn(
                          'size-5 shrink-0 transition-colors',
                          'text-muted-foreground/30 group-hover:text-[#1B4F72]',
                        )}
                      />
                    </div>
                  </button>
                ))}

                <p className="pt-3 text-center text-xs text-muted-foreground">
                  Connexion sécurisée par code WhatsApp — sans mot de passe
                </p>
              </div>
            )}

            {/* ── Step: Phone (resident) or Email+Password (gestionnaire) ── */}
            {step === 'phone' && role === 'gestionnaire' && (
              <form onSubmit={(e) => { e.preventDefault(); loginEmailMutation.mutate() }} className="space-y-5">
                {/* Role badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-[#1B4F72]/5 px-3 py-1 text-xs font-medium text-[#1B4F72]">
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
                      className="w-full min-h-[52px] rounded-xl border-2 border-border bg-white ps-10 pe-4 text-base text-[#1B4F72] placeholder:text-muted-foreground/50 transition-all focus:border-[#1B4F72] focus:outline-none focus:ring-4 focus:ring-[#1B4F72]/10 dark:bg-card"
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
                      className="w-full min-h-[52px] rounded-xl border-2 border-border bg-white ps-10 pe-4 text-base text-[#1B4F72] placeholder:text-muted-foreground/50 transition-all focus:border-[#1B4F72] focus:outline-none focus:ring-4 focus:ring-[#1B4F72]/10 dark:bg-card"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Identifiants fournis par l'équipe Imaro
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#1B4F72] text-base text-white hover:bg-[#153f5c]"
                  disabled={loginEmailMutation.isPending || !email || !password}
                >
                  {loginEmailMutation.isPending ? 'Connexion…' : 'Se connecter'}
                </Button>
              </form>
            )}

            {step === 'phone' && role === 'resident' && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  requestMutation.mutate()
                }}
              >
                {/* Role badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-[#1B4F72]/5 px-3 py-1 text-xs font-medium text-[#1B4F72]">
                    <Users className="size-3.5" />
                    Copropriétaire
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-medium">
                    Numéro de téléphone
                  </Label>
                  <div className="flex overflow-hidden rounded-xl border-2 border-border transition-all focus-within:border-[#1B4F72] focus-within:ring-4 focus-within:ring-[#1B4F72]/10">
                    <span className="flex items-center border-e bg-[#f4f7fa] px-4 text-sm font-bold text-[#1B4F72]">
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
                      className="min-h-[52px] flex-1 bg-white px-4 text-base text-[#1B4F72] placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ex : 6XX XX XX XX ou 7XX XX XX XX
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#E67E22] text-base text-white hover:bg-[#d35400]"
                  disabled={requestMutation.isPending || !phoneValid}
                >
                  {requestMutation.isPending ? (
                    'Envoi en cours…'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <MessageCircle className="size-5" />
                      Recevoir le code WhatsApp
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* ── Step: OTP ── */}
            {step === 'otp' && (
              <div className="space-y-6">
                {/* WhatsApp icon hint */}
                <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm text-green-700">
                  <MessageCircle className="size-4 shrink-0" />
                  <span>
                    Code envoyé sur WhatsApp à <span className="font-semibold">+212 {digits}</span>
                  </span>
                </div>

                <OtpBoxes value={otp} onChange={setOtp} />

                <Button
                  className="h-12 w-full bg-[#E67E22] text-base text-white hover:bg-[#d35400]"
                  disabled={otp.length !== 6 || verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate()}
                >
                  {verifyMutation.isPending ? 'Vérification…' : 'Accéder à mon espace'}
                </Button>

                <div className="space-y-2 text-center">
                  {cooldown.active ? (
                    <p className="text-sm text-muted-foreground">
                      Renvoyer dans{' '}
                      <span className="font-semibold tabular-nums text-[#1B4F72]">
                        {cooldown.seconds}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-[#1B4F72] underline-offset-4 hover:underline"
                      disabled={requestMutation.isPending}
                      onClick={() => requestMutation.mutate()}
                    >
                      Renvoyer le code
                    </button>
                  )}
                </div>
              </div>
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
