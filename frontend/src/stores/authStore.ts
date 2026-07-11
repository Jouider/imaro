import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'super_admin'
  | 'manager'
  | 'gestionnaire'
  | 'agent_recouvrement'
  | 'conseil'
  | 'resident'
  /** Field staff (gardien/sécurité/ménage…). Logs in by phone + code; the
   *  lobby gardien flow lives at /gardien. (KAN-52 / KAN-106) */
  | 'personnel'

export type AuthUser = {
  id: number
  name: string
  phone: string
  role: UserRole
  /**
   * Grouped feature permissions for manager-created gestionnaires
   * (backend `app_permissions`, issue #119). Absent for managers / owners /
   * super-admins, who have unrestricted access.
   */
  app_permissions?: string[]
  /**
   * CNDP (loi 09-08) consent timestamp. `null`/absent until the user accepts
   * the data-protection consent on their profile (KAN-60, issue #230).
   */
  cndp_consent_at?: string | null
}

export type AuthTenant = {
  id: number
  name: string
  subdomain: string
  plan: string
  /**
   * First-run onboarding state (issue: onboarding wizard). `null` while the
   * setup wizard has not been completed; ISO timestamp once finished.
   */
  onboarding_completed_at?: string | null
  /** Resume point for the wizard (0-based step index). */
  onboarding_step?: number | null
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  tenant: AuthTenant | null
  setSession: (s: { token: string; user: AuthUser; tenant: AuthTenant }) => void
  /** Refresh user + tenant from /auth/me without rotating the token. */
  refreshIdentity: (s: { user: AuthUser; tenant: AuthTenant }) => void
  /** Merge a partial update into the current user (e.g. after consent). */
  patchUser: (partial: Partial<AuthUser>) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      setSession: ({ token, user, tenant }) => set({ token, user, tenant }),
      refreshIdentity: ({ user, tenant }) => set({ user, tenant }),
      patchUser: (partial) =>
        set((s) => (s.user ? { user: { ...s.user, ...partial } } : s)),
      clear: () => set({ token: null, user: null, tenant: null }),
    }),
    {
      name: 'imaro.auth',
      // The token is persisted separately in the secure token store (Keychain/
      // Keystore via Preferences on native) — never in this localStorage blob.
      partialize: (s) => ({ user: s.user, tenant: s.tenant }),
    },
  ),
)
