import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lock, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { resetPasswordWithToken } from '@/services/auth.service'
import { cn } from '@/lib/utils'

const inputCls =
  'w-full min-h-[52px] rounded-xl border-2 border-border bg-white px-4 ps-10 pe-4 text-base text-[var(--color-imaro-primary)] placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-imaro-primary)]/10 dark:bg-card'

/**
 * Landing page for the email reset link: /reset-password?token=…&email=…
 * Sets a new password via the token, then sends the user back to login.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => resetPasswordWithToken(token, email, pwd),
    onSuccess: () => {
      toast.success(t('auth.forgot.resetDone'))
      void navigate('/login?role=gestionnaire', { replace: true })
    },
    onError: () => toast.error(t('auth.forgot.linkInvalid')),
  })

  const tokenMissing = !token || !email

  return (
    <div className="flex min-h-svh flex-col bg-[#f4f7fa]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <Link to="/">
          <Wordmark className="h-10 w-32" />
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm dark:bg-card">
          {tokenMissing ? (
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-[var(--color-imaro-danger)]">
                <ShieldAlert className="size-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-[var(--color-imaro-primary)]">
                {t('auth.forgot.linkInvalid')}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t('auth.forgot.linkInvalidBody')}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/login?role=gestionnaire">
                  <ArrowLeft className="me-1.5 size-4 rtl:rotate-180" />
                  {t('auth.forgot.backToLogin')}
                </Link>
              </Button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (pwd !== confirm) {
                  toast.error(t('auth.admin.mismatch'))
                  return
                }
                if (pwd.length < 8) {
                  toast.error(t('auth.admin.tooShort'))
                  return
                }
                mutation.mutate()
              }}
            >
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-imaro-primary)]">
                  {t('auth.forgot.resetTitle')}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t('auth.forgot.resetSubtitle', { email })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="np">{t('auth.admin.newPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="np"
                    type="password"
                    placeholder={t('auth.admin.newPasswordPlaceholder')}
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp">{t('auth.admin.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="cp"
                    type="password"
                    placeholder={t('auth.admin.confirmPasswordPlaceholder')}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className={cn(
                      inputCls,
                      confirm &&
                        pwd !== confirm &&
                        'border-red-400 focus:border-red-400 focus:ring-red-100',
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full bg-gradient-imaro text-base text-white shadow-sm hover:brightness-110"
                disabled={mutation.isPending || pwd.length < 8}
              >
                {mutation.isPending && (
                  <Loader2 className="me-1.5 size-4 animate-spin" />
                )}
                {t('auth.forgot.resetSubmit')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
