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

  // Un membre du personnel connecté (gardien / agent de sécurité) est envoyé
  // directement à son écran de scan, quel que soit le support (KAN-149) — sinon
  // il retombait sur l'écran de login à la réouverture de l'app, comme si son
  // compte ne marchait pas. Le résident connecté va, lui, au portail.
  if (token && role === 'personnel') return <Navigate to="/gardien" replace />
  if (token && role === 'resident') return <Navigate to="/portail" replace />

  if (!isNative) return <HomePage />
  return <Navigate to="/login?role=resident" replace />
}
