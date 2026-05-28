import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

type Props = { children: ReactNode }

/**
 * Protège les routes `/manager/*`.
 * Redirige vers /login si pas de token ou rôle ≠ `manager`.
 */
export function ManagerGuard({ children }: Props) {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()

  const isAuthorised = Boolean(token) && user?.role === 'manager'

  useEffect(() => {
    if (!isAuthorised) {
      void navigate('/login', { replace: true })
    }
  }, [isAuthorised, navigate])

  if (!isAuthorised) return null
  return <>{children}</>
}
