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
