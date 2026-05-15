import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ClipboardEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'
import { requestOtp, verifyOtp } from '@/services/auth.service'
import { setStoredToken } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

// ─── OTP cooldown timer ───────────────────────────────────────────────────────

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

// ─── OTP 6-box input ─────────────────────────────────────────────────────────

type OtpBoxesProps = {
  value: string
  onChange: (v: string) => void
}

function OtpBoxes({ value, onChange }: OtpBoxesProps) {
  // Single ref array — avoids calling useRef inside a .map() callback
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
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
    onChange(pasted)
    focusBox(Math.min(pasted.length, 5))
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
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
          className={`
            h-12 w-12 rounded-lg border-2 bg-white text-center text-xl
            font-semibold text-[var(--primary)] transition-colors
            focus:border-[var(--primary)] focus:outline-none
            ${value[i] ? 'border-[var(--primary)]' : 'border-border'}
          `}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = 'phone' | 'otp'

export function PortailLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const cooldown = useCooldown()

  const [step, setStep] = useState<Step>('phone')
  /** Raw digit string for the local part (without +212) */
  const [digits, setDigits] = useState('')
  const [otp, setOtp] = useState('')

  /** Full E.164 phone number sent to the API */
  const fullPhone = `+212${digits}`

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

  // ── Resend OTP ──
  const resendMutation = useMutation({
    mutationFn: () => requestOtp(fullPhone),
    onSuccess: () => {
      setOtp('')
      cooldown.start()
      toast.success(t('auth.subtitle'))
    },
    onError: (err) => toast.error(extractError(err)),
  })

  // ── Verify OTP ──
  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(fullPhone, otp),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/portail', { replace: true })
    },
    onError: (err) => {
      toast.error(extractError(err))
      setOtp('')
    },
  })

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !verifyMutation.isPending) {
      verifyMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const phoneValid = /^[67]\d{8}$/.test(digits)

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-imaro-surface)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <Wordmark className="h-10 w-36" />
        <LanguageSwitcher />
      </div>

      {/* Main card */}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo + heading */}
          <div className="text-center">
            <Wordmark variant="stacked" className="mx-auto h-36 w-auto" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-[var(--primary)]">
              {t('portail.login.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('portail.login.subtitle')}
            </p>
          </div>

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                requestMutation.mutate()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base font-medium">
                  {t('portail.login.phone')}
                </Label>
                {/* +212 prefix + digit input */}
                <div className="flex overflow-hidden rounded-lg border border-border focus-within:ring-2 focus-within:ring-[var(--ring)]">
                  <span className="flex items-center border-e bg-muted px-4 text-sm font-semibold text-[var(--primary)]">
                    +212
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={t('portail.login.phonePlaceholder')}
                    value={digits}
                    onChange={(e) =>
                      setDigits(e.target.value.replace(/\D/g, '').slice(0, 9))
                    }
                    required
                    className="min-h-[48px] flex-1 bg-white px-4 text-base text-[var(--primary)] placeholder:text-muted-foreground focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex : 6XX XX XX XX ou 7XX XX XX XX
                </p>
              </div>

              <Button
                type="submit"
                className="h-12 w-full bg-[var(--accent)] text-base text-white hover:bg-[var(--color-imaro-accent-dark)]"
                disabled={requestMutation.isPending || !phoneValid}
              >
                {requestMutation.isPending ? (
                  t('portail.login.sending')
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <MessageCircle className="size-5" />
                    {t('portail.login.sendCode')}
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <div className="space-y-6">
              {/* OTP hint */}
              <p className="text-center text-sm text-muted-foreground">
                {t('portail.login.otpHint')}
              </p>

              {/* 6-box OTP input */}
              <OtpBoxes value={otp} onChange={setOtp} />

              {/* Verify button — auto-submits but also manual */}
              <Button
                className="h-12 w-full bg-[var(--accent)] text-base text-white hover:bg-[var(--color-imaro-accent-dark)]"
                disabled={otp.length !== 6 || verifyMutation.isPending}
                onClick={() => verifyMutation.mutate()}
              >
                {verifyMutation.isPending
                  ? t('portail.login.verifying')
                  : t('portail.login.verify')}
              </Button>

              {/* Resend + cooldown */}
              <div className="space-y-2 text-center">
                {cooldown.active ? (
                  <p className="text-sm text-muted-foreground">
                    {t('portail.login.resendIn', { s: cooldown.seconds })}
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-auto p-0 text-sm text-[var(--primary)] underline-offset-4 hover:underline"
                    disabled={resendMutation.isPending}
                    onClick={() => resendMutation.mutate()}
                  >
                    {t('portail.login.resend')}
                  </Button>
                )}

                {/* SMS fallback */}
                <p className="text-xs text-muted-foreground">
                  {t('portail.login.noCode')}{' '}
                  <button
                    type="button"
                    className="text-[var(--primary)] underline underline-offset-4"
                    onClick={() => {
                      /* TODO: POST /auth/request-otp?channel=sms */
                      toast.info('SMS fallback — à venir')
                    }}
                  >
                    {t('portail.login.smsFallback')}
                  </button>
                </p>

                {/* Change phone */}
                <Button
                  variant="ghost"
                  className="mt-1 h-auto p-0 text-xs text-muted-foreground"
                  onClick={() => {
                    setStep('phone')
                    setOtp('')
                  }}
                >
                  ← {t('portail.login.changePhone')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dev bypass — visible only in development, stripped from production build */}
      {import.meta.env.DEV && (
        <div className="border-t border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-center">
          <p className="mb-2 text-xs font-semibold text-amber-700">
            ⚙️ Dev mode — WhatsApp non configuré
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-400 text-amber-700 hover:bg-amber-100"
            onClick={() => {
              const mockSession = {
                token: 'dev-mock-token',
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
              }
              setStoredToken(mockSession.token)
              setSession(mockSession)
              void navigate('/portail', { replace: true })
            }}
          >
            Accès direct (dev)
          </Button>
        </div>
      )}

      {/* Footer */}
      <p className="py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Imaro · {t('app.tagline')}
      </p>
    </div>
  )
}
