import { useEffect, useMemo, useState } from 'react'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

type Result = {
  /** Browser's current Notification permission state. */
  permission: PermissionState
  /** Subscription state — true if we have an active push subscription. */
  isSubscribed: boolean
  /** Ask the user for permission AND subscribe to push (one-shot). */
  subscribe: () => Promise<boolean>
  /** Remove subscription locally (best-effort). */
  unsubscribe: () => Promise<void>
}

const VAPID_PUBLIC_KEY =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_PUSH_VAPID_PUBLIC_KEY) ||
  ''

/**
 * Web Push subscription hook.
 * Returns null/false when push API isn't supported (e.g. iOS Safari < 16.4
 * without Add to Home Screen). The opt-in toggle is rendered conditionally.
 *
 * Backend endpoint to POST subscription (Mouad → Abdellah ticket) :
 *   POST /api/portail/push/subscribe  { endpoint, keys: { p256dh, auth } }
 *   DELETE /api/portail/push/subscribe  (current user)
 */
export function usePush(): Result {
  // Initial state derived synchronously to avoid set-state-in-effect lint
  const initialPermission = useMemo<PermissionState>(() => {
    if (typeof window === 'undefined') return 'default'
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return 'unsupported'
    }
    return Notification.permission as PermissionState
  }, [])
  const [permission, setPermission] =
    useState<PermissionState>(initialPermission)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (permission === 'unsupported') return
    let cancelled = false
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub)
      })
      .catch(() => void 0)
    return () => {
      cancelled = true
    }
  }, [permission])

  async function subscribe(): Promise<boolean> {
    if (permission === 'unsupported') return false
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[usePush] VITE_PUSH_VAPID_PUBLIC_KEY not set')
    }
    try {
      const p = await Notification.requestPermission()
      setPermission(p as PermissionState)
      if (p !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const subscribeOpts: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      }
      if (VAPID_PUBLIC_KEY) {
        subscribeOpts.applicationServerKey = urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY,
        ).buffer as ArrayBuffer
      }
      await reg.pushManager.subscribe(subscribeOpts)

      // TODO: POST `sub.toJSON()` to backend (Abdellah endpoint).
      // For now we just mark as subscribed locally.
      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('[usePush] subscribe failed:', err)
      return false
    }
  }

  async function unsubscribe(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('[usePush] unsubscribe failed:', err)
    }
  }

  return { permission, isSubscribed, subscribe, unsubscribe }
}

// VAPID key decoder
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}
