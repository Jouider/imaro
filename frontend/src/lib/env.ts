const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const appName = import.meta.env.VITE_APP_NAME ?? 'SyndikPro'

export const env = {
  apiBase,
  appName,
  isDev: import.meta.env.DEV,
}
