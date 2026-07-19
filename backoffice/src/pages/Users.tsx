import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  searchUsers,
  resetUserPassword,
  toggleUserActive,
  forceUserLogout,
  createAdminUser,
  deleteAdminUser,
  getTenants,
  type AdminUser,
} from '../lib/api'

const ROLES = ['manager', 'gestionnaire', 'agent_recouvrement', 'conseil']

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
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

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

  async function remove() {
    if (!deleteTarget) return
    try {
      await deleteAdminUser(deleteTarget.id)
      toast.success('Utilisateur supprimé')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Suppression impossible'))
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilisateurs (tous cabinets)</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          + Nouvel utilisateur
        </button>
      </div>

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
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                      >
                        Supprimer
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

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold">
              Supprimer l'utilisateur ?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) sera
              supprimé (réversible) et ses sessions révoquées.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={remove}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-all'],
    queryFn: () => getTenants(),
  })
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'gestionnaire',
    tenant_id: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)

  const valid =
    form.name.trim() &&
    /.+@.+\..+/.test(form.email) &&
    form.password.length >= 8 &&
    form.tenant_id

  async function submit() {
    setSaving(true)
    try {
      await createAdminUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        tenant_id: Number(form.tenant_id),
        phone: form.phone || undefined,
      })
      toast.success('Utilisateur créé')
      onCreated()
    } catch (e) {
      toast.error(apiError(e, 'Création impossible'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold">Nouvel utilisateur</h2>
        <div className="mt-4 space-y-3">
          <input
            placeholder="Nom complet"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Mot de passe temporaire (min. 8)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </select>
            <select
              value={form.tenant_id}
              onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Cabinet…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="Téléphone (opt.)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!valid || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? '…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
