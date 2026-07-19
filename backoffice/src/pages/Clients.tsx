import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTenants,
  createTenant,
  deleteTenant,
  tenantAction,
  impersonateTenant,
  type Tenant,
} from '../lib/api'

const STATUT_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
}

const PLANS = ['starter', 'growth', 'pro', 'business', 'large', 'enterprise']

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

export function Clients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search, status],
    queryFn: () =>
      getTenants({ search: search || undefined, status: status || undefined }),
  })

  const refresh = () => void qc.invalidateQueries({ queryKey: ['tenants'] })

  async function act(
    t: Tenant,
    action: 'suspend' | 'activate' | 'extend-trial',
    body?: Record<string, unknown>,
  ) {
    try {
      await tenantAction(t.id, action, body)
      toast.success('Action effectuée')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  async function impersonate(t: Tenant) {
    try {
      const res = await impersonateTenant(t.id)
      const url = `https://${res.tenant.subdomain}.imaro.ma/gestionnaire?impersonate=${res.token}`
      window.open(url, '_blank')
      toast.success('Session de dépannage ouverte (30 min)')
    } catch (e) {
      toast.error(apiError(e, 'Impossible d’ouvrir la session'))
    }
  }

  async function remove() {
    if (!deleteTarget) return
    try {
      await deleteTenant(deleteTarget.id)
      toast.success('Cabinet supprimé')
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
        <h1 className="text-xl font-semibold">Clients (cabinets syndic)</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          + Nouveau cabinet
        </button>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="active">Actifs</option>
          <option value="trial">Essai</option>
          <option value="suspended">Suspendus</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Cabinet</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Résidences</th>
              <th className="px-4 py-2">Users</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            )}
            {data?.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <Link
                    to={`/clients/${t.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t.name}
                  </Link>
                  <div className="text-xs text-slate-400">
                    {t.subdomain}.imaro.ma
                  </div>
                </td>
                <td className="px-4 py-2 capitalize">{t.plan}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLE[t.status] ?? ''}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2">{t.nb_residences}</td>
                <td className="px-4 py-2">{t.nb_users}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1.5 text-xs">
                    {t.status === 'suspended' ? (
                      <button
                        onClick={() => act(t, 'activate')}
                        className="rounded bg-green-600 px-2 py-1 text-white"
                      >
                        Activer
                      </button>
                    ) : (
                      <button
                        onClick={() => act(t, 'suspend')}
                        className="rounded bg-red-600 px-2 py-1 text-white"
                      >
                        Suspendre
                      </button>
                    )}
                    <button
                      onClick={() => act(t, 'extend-trial', { jours: 14 })}
                      className="rounded border px-2 py-1"
                    >
                      +14j essai
                    </button>
                    <button
                      onClick={() => impersonate(t)}
                      className="rounded bg-primary px-2 py-1 text-white"
                    >
                      Dépanner
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Aucun client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateTenantModal
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
            <h2 className="text-base font-semibold">Supprimer le cabinet ?</h2>
            <p className="mt-2 text-sm text-slate-500">
              <strong>{deleteTarget.name}</strong> sera supprimé (réversible).
              Les sessions de ses utilisateurs seront révoquées.
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

function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subdomain: '',
    plan: 'starter',
    phone: '',
  })
  const [saving, setSaving] = useState(false)

  const valid =
    form.name.trim() &&
    /.+@.+\..+/.test(form.email) &&
    /^[a-z0-9-]+$/.test(form.subdomain)

  async function submit() {
    setSaving(true)
    try {
      await createTenant({
        name: form.name,
        email: form.email,
        subdomain: form.subdomain,
        plan: form.plan,
        phone: form.phone || undefined,
      })
      toast.success('Cabinet créé')
      onCreated()
    } catch (e) {
      toast.error(apiError(e, 'Création impossible'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold">Nouveau cabinet</h2>
        <div className="mt-4 space-y-3">
          <Field label="Nom du cabinet">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Gest Syndic SARL"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@cabinet.ma"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Sous-domaine (a-z, 0-9, -)">
            <div className="flex items-center gap-1">
              <input
                value={form.subdomain}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subdomain: e.target.value.toLowerCase(),
                  })
                }
                placeholder="gestsyndic"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <span className="whitespace-nowrap text-xs text-slate-400">
                .imaro.ma
              </span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Téléphone (opt.)">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+2125…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
          </div>
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  )
}
