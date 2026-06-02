import { create } from 'zustand'

/**
 * Session-only UI state for the first-run onboarding wizard.
 *
 * Not persisted: the canonical "is onboarding done" lives on the tenant
 * (`onboarding_completed_at`, via /auth/me). This just coordinates opening the
 * modal between the layout (auto-open on first run) and the dashboard checklist
 * ("Reprendre la configuration"), and remembers an in-session dismissal so we
 * don't re-pop the wizard on every navigation.
 */
type OnboardingUiState = {
  open: boolean
  /** Dismissed during this session — suppresses the auto-open. */
  dismissed: boolean
  openWizard: () => void
  closeWizard: () => void
}

export const useOnboardingStore = create<OnboardingUiState>((set) => ({
  open: false,
  dismissed: false,
  openWizard: () => set({ open: true }),
  closeWizard: () => set({ open: false, dismissed: true }),
}))
