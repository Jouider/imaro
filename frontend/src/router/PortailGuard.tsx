import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

type Props = { children: ReactNode }

/**
 * Protège les routes `/portail/*`.
 * Redirige vers /portail/login si pas de token ou rôle non-résident.
 */
export function PortailGuard({ children }: Props) {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()

  const isAuthorised = Boolean(token) && user?.role === 'resident'

  useEffect(() => {
    if (!isAuthorised) {
      // Un membre du personnel connecté est renvoyé vers son écran de scan,
      // pas vers le login (KAN-149 — il reste confiné à /gardien).
      const target =
        token && user?.role === 'personnel' ? '/gardien' : '/login'
      void navigate(target, { replace: true })
    }
  }, [isAuthorised, token, user, navigate])

  if (!isAuthorised) return null
  return <>{children}</>
}
