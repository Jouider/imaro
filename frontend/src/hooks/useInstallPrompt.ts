import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Result = {
  /** Whether the PWA can currently be installed (browser sent beforeinstallprompt). */
  canInstall: boolean
  /** Trigger the native install prompt. Resolves to user choice. */
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  /** Whether the app is already running in standalone (installed) mode. */
  isStandalone: boolean
}

/**
 * Captures the browser's `beforeinstallprompt` event and exposes a method
 * to trigger the native install dialog later (e.g. on user CTA click).
 *
 * Usage:
 *   const { canInstall, install } = useInstallPrompt()
 *   if (canInstall) <button onClick={install}>Installer</button>
 */
export function useInstallPrompt(): Result {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  // Compute initial standalone synchronously to avoid set-state-in-effect lint
  const initialStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches
  }, [])
  const [isStandalone, setIsStandalone] = useState(initialStandalone)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', onChange)

    const onBefore = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome
  }

  return {
    canInstall: deferredPrompt !== null && !isStandalone,
    install,
    isStandalone,
  }
}
