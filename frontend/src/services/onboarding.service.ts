import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

/**
 * Onboarding progress for the first-run setup wizard.
 *
 * The canonical state (`onboarding_completed_at`, `onboarding_step`) lives on
 * the tenant and arrives via /auth/me. These endpoints persist progress so the
 * syndic can resume on any device. Backend: see brief — issue onboarding wizard.
 */
export type OnboardingState = {
  completed: boolean
  step: number
}

/** Persist the resume point as the syndic advances through the wizard. */
export async function setOnboardingStep(
  step: number,
): Promise<OnboardingState> {
  return withMock(
    async () => {
      const res = await api.patch<ApiEnvelope<OnboardingState>>(
        '/gestionnaire/onboarding',
        { step },
      )
      return res.data.data
    },
    { completed: false, step },
  )
}

/** Mark onboarding finished (stamps onboarding_completed_at on the tenant). */
export async function completeOnboarding(): Promise<OnboardingState> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<OnboardingState>>(
        '/gestionnaire/onboarding/complete',
        {},
      )
      return res.data.data
    },
    { completed: true, step: 99 },
  )
}
