import { Capacitor } from '@capacitor/core'
import {
  PushNotifications,
  type Token,
  type ActionPerformed,
  type PushNotificationSchema,
} from '@capacitor/push-notifications'
import { api } from '@/lib/axios'
import { useNotifStore } from '@/stores/notifStore'
import type { NotifType } from '@/stores/notifStore'

/** Route paths sent by the backend in push payload `data.route`. */
const VALID_ROUTES = [
  '/portail',
  '/portail/finances',
  '/portail/reclamations',
  '/portail/visiteurs',
  '/portail/profil',
] as const

type NavigateFn = (path: string) => void

let listenersAttached = false
/** Last device token received — needed to unregister it server-side at logout. */
let lastToken: string | null = null

/**
 * Request permission, register for push, send the device token to the backend,
 * and wire up foreground + tap listeners. Safe to call multiple times — listeners
 * are attached only once per app session.
 */
export async function initNativePush(navigate: NavigateFn): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const { receive } = await PushNotifications.requestPermissions()
  if (receive !== 'granted') return

  // Attach listeners BEFORE register() so the `registration` event (which can
  // fire as soon as the OS returns a token) is never missed — otherwise the
  // token never reaches the backend and the device gets no pushes.
  if (!listenersAttached) {
    listenersAttached = true

    // Device token ready — register with the backend.
    await PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        lastToken = token.value
        const platform = Capacitor.getPlatform() as 'ios' | 'android'
        try {
          await api.post('/portail/push/register-device', {
            token: token.value,
            platform,
          })
        } catch {
          // Non-fatal: push will still arrive, but backend won't target this device.
        }
      },
    )

    // Registration error — log only, don't crash the app.
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push-native] registration error', err)
    })

    // Foreground notification — surface in the in-app notification store.
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notif: PushNotificationSchema) => {
        useNotifStore.getState().addNotif({
          type: (notif.data?.type as NotifType) ?? 'info',
          title: notif.title ?? '',
          message: notif.body ?? '',
          time: new Date().toISOString(),
        })
      },
    )

    // Notification tap — route to the relevant screen.
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        const route: string = action.notification.data?.route ?? '/portail'
        const safe = VALID_ROUTES.includes(
          route as (typeof VALID_ROUTES)[number],
        )
          ? route
          : '/portail'
        navigate(safe)
      },
    )
  }

  // Now that the listeners are in place, ask the OS for a token.
  await PushNotifications.register()
}

/**
 * Remove this device's push token from the backend. Call at logout so the
 * backend stops sending pushes to a signed-out device.
 */
export async function unregisterNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    // The backend keys the token off the request body (api.md), so we must send
    // the token we registered with — a bodyless DELETE leaves a stale device.
    await api.delete('/portail/push/register-device', {
      data: lastToken ? { token: lastToken } : undefined,
    })
  } catch {
    // Best-effort — don't block logout.
  }
  // Reset so the next login re-registers cleanly.
  listenersAttached = false
  lastToken = null
  await PushNotifications.removeAllListeners()
}
