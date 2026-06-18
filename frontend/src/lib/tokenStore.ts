import { Preferences } from '@capacitor/preferences'
import { isNative } from '@/lib/native'

/**
 * Auth token storage.
 *
 * - Web: localStorage (unchanged).
 * - Native: Capacitor Preferences (OS-backed UserDefaults / SharedPreferences),
 *   so the Sanctum token never lives in the WebView's localStorage.
 *
 * An in-memory cache backs the synchronous {@link getStoredToken} used by the
 * axios interceptor; on native it's hydrated from Preferences at startup via
 * {@link hydrateToken} before the app makes any authenticated request.
 */
const KEY = 'imaro.token'

let cache: string | null = isNative ? null : localStorage.getItem(KEY)

/** Synchronous read for the axios request interceptor. */
export function getStoredToken(): string | null {
  return cache
}

export function setStoredToken(token: string | null): void {
  cache = token
  if (isNative) {
    if (token) void Preferences.set({ key: KEY, value: token })
    else void Preferences.remove({ key: KEY })
  } else if (token) {
    localStorage.setItem(KEY, token)
  } else {
    localStorage.removeItem(KEY)
  }
}

/**
 * Load the persisted token into the in-memory cache. On native this reads the
 * secure store; on web it re-reads localStorage. Call once before first render.
 */
export async function hydrateToken(): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key: KEY })
    if (value) {
      cache = value
    } else {
      // One-time migration: move a token left in the old WebView localStorage
      // into the secure store, then drop the insecure copy.
      const legacy = localStorage.getItem(KEY)
      if (legacy) {
        cache = legacy
        await Preferences.set({ key: KEY, value: legacy })
        localStorage.removeItem(KEY)
      } else {
        cache = null
      }
    }
  } else {
    cache = localStorage.getItem(KEY)
  }
  return cache
}
