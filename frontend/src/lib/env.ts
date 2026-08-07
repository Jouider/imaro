const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const appName = import.meta.env.VITE_APP_NAME ?? 'Imaro'

/**
 * Public web origin that serves the SPA and the public visitor-pass page
 * (`/v/:token`). On the web this equals `window.location.origin`, but in the
 * native app `window.location.origin` is `capacitor://localhost` — unusable in
 * a shared/QR link. Derived from the API host (api.imaro.ma → imaro.ma,
 * api-staging.imaro.ma → staging.imaro.ma) unless `VITE_PUBLIC_APP_URL` is set.
 */
function deriveWebOrigin(api: string): string {
  try {
    const u = new URL(api)
    const host = u.host
      .replace(/^api-staging\./, 'staging.')
      .replace(/^api\./, '')
    return `${u.protocol}//${host}`
  } catch {
    return 'https://imaro.ma'
  }
}

const publicAppUrl =
  import.meta.env.VITE_PUBLIC_APP_URL ?? deriveWebOrigin(apiBase)

export const env = {
  apiBase,
  appName,
  publicAppUrl,
  isDev: import.meta.env.DEV,
}
