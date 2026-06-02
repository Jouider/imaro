import { api } from '@/lib/axios'

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

export type DemoRequestInput = {
  name: string
  cabinet: string
  email: string
  phone: string
  message?: string
}

/**
 * Sales-led signup: a prospective syndic requests a demo. Stored as a lead /
 * emailed to the team — no instant account is provisioned.
 * Backend: POST /demo-requests (public, rate-limited). See brief.
 */
export async function requestDemo(input: DemoRequestInput): Promise<void> {
  await withMock(async () => {
    await api.post('/demo-requests', input)
  }, undefined)
}
