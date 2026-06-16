import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Fingerprint } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'
import { isNative } from '@/lib/native'
import { authenticateBiometric } from '@/lib/biometric'
import { useBiometricStore } from '@/stores/biometricStore'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'

/**
 * Locks the wrapped content behind a biometric check on app launch when the
 * user has enabled it. Web is never locked. Falls back to the access code
 * (logout → login) if biometry fails or is cancelled.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const clear = useAuthStore((s) => s.clear)
  const enabled = useBiometricStore((s) => s.enabled)
  const unlocked = useBiometricStore((s) => s.unlocked)
  const setUnlocked = useBiometricStore((s) => s.setUnlocked)
  const [prompting, setPrompting] = useState(false)

  const locked = isNative && enabled && !!token && !unlocked

  const tryUnlock = useCallback(async () => {
    if (prompting) return
    setPrompting(true)
    const ok = await authenticateBiometric(t('portail.biometric.reason'))
    setPrompting(false)
    if (ok) setUnlocked(true)
  }, [prompting, setUnlocked, t])

  useEffect(() => {
    if (!locked) return
    // Defer so the prompt's setState doesn't run synchronously in the effect.
    const id = setTimeout(() => void tryUnlock(), 0)
    return () => clearTimeout(id)
    // Run the prompt once when entering the locked state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked])

  if (!locked) return <>{children}</>

  const useCode = () => {
    setStoredToken(null)
    clear()
    void navigate('/login?role=resident', { replace: true })
  }

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-8 bg-[var(--color-imaro-surface)] px-6 dark:bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Wordmark variant="stacked" className="h-20 w-auto" />

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]">
          <Fingerprint className="size-8" />
        </div>
        <p className="text-lg font-semibold text-foreground">
          {t('portail.biometric.lockTitle')}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t('portail.biometric.lockSubtitle')}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button
          size="lg"
          className="h-12 w-full bg-gradient-imaro text-white"
          onClick={() => void tryUnlock()}
          disabled={prompting}
        >
          {prompting ? t('actions.loading') : t('portail.biometric.unlock')}
        </Button>
        <Button variant="ghost" className="w-full" onClick={useCode}>
          {t('portail.biometric.useCode')}
        </Button>
      </div>
    </div>
  )
}
