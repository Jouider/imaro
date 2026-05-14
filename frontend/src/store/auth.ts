import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'super_admin'
  | 'manager'
  | 'gestionnaire'
  | 'agent_recouvrement'
  | 'conseil'
  | 'resident'

export type AuthUser = {
  id: number
  name: string
  phone: string
  role: UserRole
  permissions?: string[]
}

export type AuthTenant = {
  id: number
  name: string
  subdomain: string
  plan: string
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  tenant: AuthTenant | null
  setSession: (s: { token: string; user: AuthUser; tenant: AuthTenant }) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      setSession: ({ token, user, tenant }) => set({ token, user, tenant }),
      clear: () => set({ token: null, user: null, tenant: null }),
    }),
    { name: 'imaro.auth' },
  ),
)
