import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/lib/env'
import { getStoredToken, setStoredToken } from '@/lib/tokenStore'

// Re-exported so existing imports from '@/lib/axios' keep working; the token is
// now backed by secure native storage on the app (see tokenStore).
export { getStoredToken, setStoredToken }

export const api = axios.create({
  baseURL: env.apiBase,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  // For multipart uploads, drop the JSON default (and any hardcoded
  // `multipart/form-data`) so the browser sets `Content-Type` itself, *with*
  // the boundary. Forcing it manually omits the boundary and the backend
  // can't parse the files (KAN-96: `media.0: validation.file`).
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !import.meta.env.DEV) {
      setStoredToken(null)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export type ApiEnvelope<T> = {
  status: 'success' | 'error'
  message?: string
  data: T
  errors?: Record<string, string[]>
}
