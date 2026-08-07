import { Capacitor } from '@capacitor/core'
import { env } from '@/lib/env'

/**
 * Public URL of a visitor pass (`/v/:token`) — the link encoded in the QR and
 * shared to the visitor (WhatsApp/SMS/native sheet).
 *
 * ⚠️ Must be a real web origin. In the native app `window.location.origin` is
 * `capacitor://localhost`, so a shared link built from it is dead when the
 * recipient opens it (KAN-72). On native we use the configured public web
 * origin; on the web we keep the current origin.
 */
export function visitorPassUrl(token: string): string {
  const origin = Capacitor.isNativePlatform()
    ? env.publicAppUrl
    : window.location.origin
  return `${origin}/v/${token}`
}
