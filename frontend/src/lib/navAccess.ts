import type { AppPermission } from '@/services/equipe.service'

/**
 * Sidebar / command-palette access control for manager-created gestionnaires.
 *
 * The backend returns a grouped `app_permissions` array on the user at login
 * (issue #119, 7 runtime slugs). A gestionnaire route is reachable if ANY of
 * the permissions listed for it is granted. Routes absent from the map are
 * always visible (dashboard, résidences, tickets, annonces, prestataires…).
 *
 * Source of truth = backend `user.app_permissions`. If the grouping changes,
 * this map is the single place to edit.
 */
export const ROUTE_PERMISSIONS: Record<string, AppPermission[]> = {
  // Finances group
  paiements: ['finances'],
  'autres-recettes': ['finances'],
  budgets: ['finances'],
  comptabilite: ['finances'],
  pointage: ['finances'],
  remboursements: ['finances'],
  emprunts: ['finances'],
  'travaux-exceptionnels': ['finances'],
  depenses: ['finances', 'depenses'],
  // Recouvrement group
  recouvrement: ['recouvrement'],
  // Copropriété group
  coproprietaires: ['coproprietaires'],
  occupants: ['coproprietaires'],
  // Assemblées group
  assemblees: ['assemblees'],
  // Documents group
  documents: ['documents'],
  annexes: ['documents'],
  // Équipe group
  utilisateurs: ['personnel'],
  personnel: ['personnel'],
  // Patrimoine (Annexe 9) — always visible, no permission needed
  // equipements: not gated
}

/** Permission slug for a route = its last path segment. */
export function routeSlug(to: string): string {
  return to.split('/').filter(Boolean).pop() ?? ''
}

/**
 * Whether the user may reach a gestionnaire route given their permissions.
 *
 * Fail-open by design: only restricts when `role === 'gestionnaire'` AND an
 * `app_permissions` array is present. Managers / owners / super-admins (no
 * array) keep full access, and any route not in {@link ROUTE_PERMISSIONS}
 * stays visible — so a permission gap can never empty the sidebar (the backend
 * still enforces 403s on the API).
 */
export function canAccessRoute(
  to: string,
  role: string | undefined,
  appPermissions: string[] | undefined,
): boolean {
  const gated = role === 'gestionnaire' && Array.isArray(appPermissions)
  if (!gated) return true
  const required = ROUTE_PERMISSIONS[routeSlug(to)]
  if (!required) return true
  return required.some((p) => appPermissions!.includes(p))
}
