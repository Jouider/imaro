import { useCallback, useEffect, useState } from 'react'

/**
 * Chrome / Edge / Samsung Internet fire `beforeinstallprompt` when the
 * site qualifies for PWA install. We capture the event and expose a
 * `promptInstall()` that the gardien can trigger from a banner.
 *
 * iOS Safari does NOT fire this event — we just don't show the banner there.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'imaro.gardien.installDismissed'

export function useInstallPromptGardien(): {
  available: boolean
  promptInstall: () => Promise<void>
  dismiss: () => void
} {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setEvt(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!evt) return
    await evt.prompt()
    const res = await evt.userChoice
    if (res.outcome === 'accepted' || res.outcome === 'dismissed') {
      setEvt(null)
    }
  }, [evt])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ignore
    }
  }, [])

  return { available: !!evt && !dismissed, promptInstall, dismiss }
}
