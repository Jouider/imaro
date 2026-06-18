import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

type NavigateFn = (path: string) => void

// Paths that the app can handle as deep links.
const ALLOWED_PREFIXES = ['/v/', '/portail', '/login'] as const

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + '/') ||
      pathname.startsWith(p + '?'),
  )
}

function resolveRoute(url: string, navigate: NavigateFn): void {
  try {
    const { pathname, search } = new URL(url)

    // Payment gateway return — no dedicated route in the app, land on portail home.
    if (pathname.startsWith('/portail/paiement/retour')) {
      navigate('/portail')
      return
    }

    if (isAllowedPath(pathname)) {
      navigate(pathname + search)
    } else {
      navigate('/portail')
    }
  } catch {
    // Malformed URL — ignore.
  }
}

/**
 * Registers Universal Link / App Link listeners for https://imaro.ma deep links.
 *
 * - Cold start: reads `App.getLaunchUrl()` so a link that opens the app from
 *   scratch is handled immediately.
 * - Warm resume: `appUrlOpen` fires when the app is already running.
 *
 * No-op on web. Call once at app mount (App.tsx).
 */
export async function initDeepLinks(navigate: NavigateFn): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Cold-start link (app was not running when the URL was tapped).
  const launch = await CapApp.getLaunchUrl()
  if (launch?.url) {
    resolveRoute(launch.url, navigate)
  }

  // Warm-resume link (app already in foreground or background).
  await CapApp.addListener('appUrlOpen', (event) => {
    resolveRoute(event.url, navigate)
  })
}
