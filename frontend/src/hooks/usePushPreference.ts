import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { usePush } from '@/hooks/usePush'
import { initNativePush, unregisterNativePush } from '@/lib/push-native'

type PushPreference = {
  /** Push is available on this platform (web: browser supports it). */
  supported: boolean
  /** Notifications are currently enabled for this device/user. */
  enabled: boolean
  /** A toggle request is in flight. */
  busy: boolean
  /** Turn notifications on/off. */
  toggle: (next: boolean) => Promise<void>
}

/**
 * Unified push-notification preference for the portail profile toggle.
 *
 * - **Native (Capacitor)**: reflects the OS permission. Turning it on requests
 *   permission + registers the device token; turning it off unregisters the
 *   device server-side so the backend stops targeting it. (iOS can't revoke the
 *   OS permission from inside the app — "off" simply stops delivery.)
 * - **Web**: delegates to {@link usePush} (VAPID subscription).
 *
 * Hooks are always called unconditionally; only the returned values differ.
 */
export function usePushPreference(): PushPreference {
  const web = usePush()
  const navigate = useNavigate()
  const isNative = Capacitor.isNativePlatform()

  const [nativeEnabled, setNativeEnabled] = useState(false)
  const [nativeBusy, setNativeBusy] = useState(false)

  useEffect(() => {
    if (!isNative) return
    let cancelled = false
    void PushNotifications.checkPermissions()
      .then((p) => {
        if (!cancelled) setNativeEnabled(p.receive === 'granted')
      })
      .catch(() => void 0)
    return () => {
      cancelled = true
    }
  }, [isNative])

  async function nativeToggle(next: boolean): Promise<void> {
    setNativeBusy(true)
    try {
      if (next) {
        await initNativePush((path) => navigate(path))
        const p = await PushNotifications.checkPermissions()
        setNativeEnabled(p.receive === 'granted')
      } else {
        await unregisterNativePush()
        setNativeEnabled(false)
      }
    } finally {
      setNativeBusy(false)
    }
  }

  if (isNative) {
    return {
      supported: true,
      enabled: nativeEnabled,
      busy: nativeBusy,
      toggle: nativeToggle,
    }
  }

  return {
    supported: web.permission !== 'unsupported',
    enabled: web.isSubscribed,
    busy: false,
    toggle: async (next: boolean) => {
      if (next) await web.subscribe()
      else await web.unsubscribe()
    },
  }
}
