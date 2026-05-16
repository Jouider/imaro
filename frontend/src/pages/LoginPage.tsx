import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'

import { requestOtp, verifyOtp } from '@/services/auth.service'
import { setStoredToken } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

type Step = 'phone' | 'otp'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  const requestMutation = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: () => {
      toast.success(t('auth.subtitle'))
      setStep('otp')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(phone, otp),
    onSuccess: ({ token, user, tenant }) => {
      setStoredToken(token)
      setSession({ token, user, tenant })
      void navigate('/', { replace: true })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="grid min-h-svh place-items-center bg-muted/30 px-6">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-1 flex justify-center">
            <Wordmark variant="stacked" className="h-32 w-auto" />
          </div>
          <CardTitle className="mt-2 font-display text-[var(--primary)]">
            {t('auth.title')}
          </CardTitle>
          <CardDescription>{t('auth.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                requestMutation.mutate()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t('auth.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder={t('auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"
                disabled={requestMutation.isPending || !phone}
              >
                {t('auth.requestOtp')}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                verifyMutation.mutate()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="otp">{t('auth.otp')}</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t('auth.otpPlaceholder')}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"
                disabled={verifyMutation.isPending || otp.length !== 6}
              >
                {t('auth.verifyOtp')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
              >
                {t('auth.back')}
              </Button>
            </form>
          )}
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/">← {t('nav.home')}</Link>
          </p>

          {/* ── Dev bypass — shown in DEV or when VITE_SHOW_DEV_BYPASS=true ── */}
          {(import.meta.env.DEV || !!import.meta.env.VITE_SHOW_DEV_BYPASS) && (
            <div className="border-t border-dashed border-amber-300 bg-amber-50 -mx-6 -mb-6 px-4 py-3 rounded-b-xl">
              <p className="mb-2 text-center text-xs font-semibold text-amber-700">
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
                      user: { id: 2, name: 'Ahmed Berrada', phone: '+212612000002', role: 'gestionnaire' as const },
                      tenant: { id: 1, name: 'Atlas Casablanca', subdomain: 'atlas', plan: 'standard' },
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
                    setStoredToken('dev-mock-token-manager')
                    setSession({
                      token: 'dev-mock-token-manager',
                      user: { id: 3, name: 'Sara Alaoui', phone: '+212612000003', role: 'manager' as const },
                      tenant: { id: 1, name: 'Atlas Casablanca', subdomain: 'atlas', plan: 'standard' },
                    })
                    void navigate('/gestionnaire/dashboard', { replace: true })
                  }}
                >
                  Manager
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function extractError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    if (data?.message) return data.message
  }
  return 'Erreur réseau'
}
