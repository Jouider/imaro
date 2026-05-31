import { api, type ApiEnvelope } from '@/lib/axios'
import type { AuthTenant, AuthUser } from '@/stores/authStore'

// ─── Shared session data ──────────────────────────────────────────────────────

type SessionData = { token: string; user: AuthUser; tenant: AuthTenant }

// ─── Gestionnaire / Admin login (email + password) ────────────────────────────

/**
 * Backend returns either a session (success) or, for a manager-created admin
 * logging in for the first time, a `first_login` signal — they must then set
 * their own password via {@link adminActivate} (mirrors the resident flow).
 */
export type LoginEmailResponse =
  | { status: 'success'; data: SessionData }
  | { status: 'first_login'; data: { email: string } }
  | { status: 'error'; message: string }

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<LoginEmailResponse> {
  const { data } = await api.post<LoginEmailResponse>('/auth/login', {
    email,
    password,
  })
  return data
}

/**
 * Called on an admin's first login — they replace their temporary password
 * (the one their manager handed them) with a personal one.
 */
export async function adminActivate(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<SessionData> {
  const { data } = await api.post<ApiEnvelope<SessionData>>('/auth/activate', {
    email,
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  })
  return data.data
}

// ─── Resident login (phone + code) ───────────────────────────────────────────

/** Backend returns either a session (success) or a first-login signal */
export type ResidentLoginResponse =
  | { status: 'success'; data: SessionData }
  | { status: 'first_login'; data: { phone: string } }
  | { status: 'error'; message: string }

export async function residentLogin(
  phone: string,
  code: string,
): Promise<ResidentLoginResponse> {
  const { data } = await api.post<ResidentLoginResponse>(
    '/auth/resident/login',
    { phone, code },
  )
  return data
}

/** Called on first login — resident sets their own personal code */
export async function residentActivate(
  phone: string,
  tempCode: string,
  newCode: string,
): Promise<SessionData> {
  const { data } = await api.post<ApiEnvelope<SessionData>>(
    '/auth/resident/activate',
    {
      phone,
      temp_code: tempCode,
      new_code: newCode,
      new_code_confirmation: newCode,
    },
  )
  return data.data
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export type MeResponse = ApiEnvelope<{ user: AuthUser; tenant: AuthTenant }>

export async function me() {
  const { data } = await api.get<MeResponse>('/auth/me')
  return data.data
}

export async function logout() {
  await api.post('/auth/logout')
}
