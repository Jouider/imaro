import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type BiometricState = {
  /** User opted in to biometric unlock (persisted). */
  enabled: boolean
  /** Unlocked for the current app session (in-memory, resets on each launch). */
  unlocked: boolean
  /** The post-login enable prompt was already shown (persisted). */
  promptDismissed: boolean
  setEnabled: (v: boolean) => void
  setUnlocked: (v: boolean) => void
  dismissPrompt: () => void
}

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      enabled: false,
      unlocked: false,
      promptDismissed: false,
      setEnabled: (v) => set({ enabled: v }),
      setUnlocked: (v) => set({ unlocked: v }),
      dismissPrompt: () => set({ promptDismissed: true }),
    }),
    {
      name: 'imaro.biometric',
      // `unlocked` must start false every launch → persist only the preferences.
      partialize: (s) => ({
        enabled: s.enabled,
        promptDismissed: s.promptDismissed,
      }),
    },
  ),
)
