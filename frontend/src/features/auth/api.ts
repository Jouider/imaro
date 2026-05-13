import { api, type ApiEnvelope } from '@/api/client'
import type { AuthTenant, AuthUser } from '@/store/auth'

export type RequestOtpResponse = ApiEnvelope<{ expires_in: number }>
export type VerifyOtpResponse = ApiEnvelope<{
  token: string
  user: AuthUser
  tenant: AuthTenant
}>
export type MeResponse = ApiEnvelope<{
  user: AuthUser
  tenant: AuthTenant
}>

export async function requestOtp(phone: string) {
  const { data } = await api.post<RequestOtpResponse>('/auth/request-otp', {
    phone,
  })
  return data.data
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', {
    phone,
    otp,
  })
  return data.data
}

export async function me() {
  const { data } = await api.get<MeResponse>('/auth/me')
  return data.data
}

export async function logout() {
  await api.post('/auth/logout')
}
