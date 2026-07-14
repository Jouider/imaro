import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  searchUsers,
  resetUserPassword,
  toggleUserActive,
  forceUserLogout,
  type AdminUser,
} from '../lib/api'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  manager: 'Syndic (owner)',
  gestionnaire: 'Gestionnaire',
  conseil: 'Conseil',
  resident: 'Copropriétaire',
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Jamais'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

export function Users() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => searchUsers(search),
  })

  const refresh = () =>
    void qc.invalidateQueries({ queryKey: ['admin-users'] })

  async function reset(u: AdminUser) {
    try {
      const temp = await resetUserPassword(u.id)
      await navigator.clipboard.writeText(temp).catch(() => {})
      toast.success(`Mot de passe temporaire copié : ${temp}`)
    } catch (e) {
      toast.error(apiError(e, 'Échec de la réinitialisation'))
    }
  }

  async function toggle(u: AdminUser) {
    try {
      await toggleUserActive(u.id, u.status !== 'active')
      toast.success(u.status === 'active' ? 'Compte désactivé' : 'Compte activé')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  async function logout(u: AdminUser) {
    try {
      await forceUserLogout(u.id)
      toast.success('Sessions révoquées')
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Utilisateurs (tous cabinets)</h1>

      <input
        placeholder="Rechercher par nom, email, téléphone ou cabinet…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Rôle</th>
              <th className="px-4 py-2 font-medium">Cabinet</th>
              <th className="px-4 py-2 font-medium">Dernière connexion</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              data.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {u.name}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    <div>{u.email ?? '—'}</div>
                    <div className="text-xs text-slate-400">{u.phone ?? '—'}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.tenant?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {fmtDate(u.last_login_at)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => reset(u)}
                        className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-100"
                      >
                        Réinit. MDP
                      </button>
                      <button
                        onClick={() => toggle(u)}
                        className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-100"
                      >
                        {u.status === 'active' ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => logout(u)}
                        className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-100"
                      >
                        Déconnecter
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Toute action est tracée dans le journal d'audit. Aucun secret n'est
        affiché ; le mot de passe temporaire n'apparaît qu'une fois à la
        réinitialisation.
      </p>
    </div>
  )
}
