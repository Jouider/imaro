import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Persisted UI settings scoped to the gestionnaire tenant.
 * logoUrl: base64 data URL uploaded by the syndic on their profile page.
 */
type SettingsState = {
  logoUrl: string | null
  setLogoUrl: (url: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      logoUrl: null,
      setLogoUrl: (url) => set({ logoUrl: url }),
    }),
    { name: 'imaro.settings' },
  ),
)
