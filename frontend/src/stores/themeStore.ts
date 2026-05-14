import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeState = {
  theme: 'light' | 'dark'
  toggle: () => void
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        applyTheme(next)
        set({ theme: next })
      },
    }),
    {
      name: 'imaro.theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    },
  ),
)

// Apply theme on module load (before rehydration completes)
applyTheme(useThemeStore.getState().theme)
