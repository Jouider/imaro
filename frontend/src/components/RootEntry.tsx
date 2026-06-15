import { Navigate } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { isNative } from '@/lib/native'
import { useAuthStore } from '@/stores/authStore'

/**
 * Entry at `/`.
 * - Native owners app → boot straight to the Owner (résident) login, or to the
 *   portail if already signed in. There is no marketing site inside the app.
 * - Web → the marketing landing page.
 */
export function RootEntry() {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.user?.role)

  if (!isNative) return <HomePage />
  if (token && role === 'resident') return <Navigate to="/portail" replace />
  return <Navigate to="/login?role=resident" replace />
}
