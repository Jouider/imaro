import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { initNativePush } from '@/lib/push-native'

/**
 * Mount in PortailLayout to initialise native push for the whole portail.
 * No-op on web — web push is handled by usePush (VAPID).
 */
export function useNativePush(): void {
  const navigate = useNavigate()

  useEffect(() => {
    void initNativePush(navigate)
    // Listeners are torn down at logout via unregisterNativePush().
    // No cleanup needed here — we want them alive for the full portail session.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
