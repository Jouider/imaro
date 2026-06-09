import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global residence scope (KAN-47).
 *
 * A single selected residence that filters data across every gestionnaire
 * section. `null` means "all residences". Persisted so the choice survives
 * navigation and reloads. Pages read `residenceId` and filter their data; the
 * selector lives in the sidebar (see GestionnaireLayout).
 */
type ResidenceState = {
  /** Selected residence id, or `null` for all residences. */
  residenceId: number | null
  setResidenceId: (id: number | null) => void
}

export const useResidenceStore = create<ResidenceState>()(
  persist(
    (set) => ({
      residenceId: null,
      setResidenceId: (id) => set({ residenceId: id }),
    }),
    { name: 'imaro.residence' },
  ),
)
