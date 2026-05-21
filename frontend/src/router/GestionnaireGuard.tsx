import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

type Props = { children: ReactNode }

/**
 * Protects routes at `/gestionnaire/*`.
 * Redirects to /login when there is no token or the role is not gestionnaire / manager.
 */
export function GestionnaireGuard({ children }: Props) {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()

  const isAuthorised =
    Boolean(token) &&
    (user?.role === 'gestionnaire' || user?.role === 'manager')

  useEffect(() => {
    if (!isAuthorised) {
      void navigate('/login', { replace: true })
    }
  }, [isAuthorised, navigate])

  if (!isAuthorised) return null
  return <>{children}</>
}
