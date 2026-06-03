import { api, type ApiEnvelope } from '@/lib/axios'

/**
 * Onboarding progress for the first-run setup wizard.
 *
 * The canonical state (`onboarding_completed_at`, `onboarding_step`) lives on
 * the tenant and arrives via /auth/me + /auth/login. These endpoints persist
 * progress so the syndic can resume on any device. Manager-only (backend 403s
 * otherwise). Backend: PRs #142–#145.
 */
export type OnboardingState = {
  completed: boolean
  step: number
  onboarding_completed_at: string | null
}

/** Persist the resume point as the syndic advances through the wizard. */
export async function setOnboardingStep(
  step: number,
): Promise<OnboardingState> {
  const res = await api.patch<ApiEnvelope<OnboardingState>>('/onboarding', {
    step,
  })
  return res.data.data
}

/** Mark onboarding finished (stamps onboarding_completed_at on the tenant). */
export async function completeOnboarding(): Promise<OnboardingState> {
  const res = await api.post<ApiEnvelope<OnboardingState>>(
    '/onboarding/complete',
    {},
  )
  return res.data.data
}
