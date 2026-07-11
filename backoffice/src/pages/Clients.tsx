import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, type Tenant } from '../lib/api'

const STATUT_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
}

export function Clients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search, status],
    queryFn: async () =>
      (
        await api.get<{ data: { tenants: Tenant[] } }>('/admin/tenants', {
          params: { search: search || undefined, status: status || undefined },
        })
      ).data.data.tenants,
  })

  async function act(t: Tenant, action: string, body?: unknown) {
    try {
      await api.post(`/admin/tenants/${t.id}/${action}`, body)
      toast.success('Action effectuée')
      void qc.invalidateQueries({ queryKey: ['tenants'] })
    } catch (e) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Échec',
      )
    }
  }

  async function impersonate(t: Tenant) {
    try {
      const res = await api.post(`/admin/tenants/${t.id}/impersonate`)
      const url = `https://${t.subdomain}.imaro.ma/gestionnaire?impersonate=${res.data.data.token}`
      window.open(url, '_blank')
      toast.success('Session de dépannage ouverte (30 min)')
    } catch (e) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Impossible d’ouvrir la session',
      )
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Clients (cabinets syndic)</h1>

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
                  <Link to={`/clients/${t.id}`} className="font-medium text-primary hover:underline">
                    {t.name}
                  </Link>
                  <div className="text-xs text-slate-400">{t.subdomain}.imaro.ma</div>
                </td>
                <td className="px-4 py-2 capitalize">{t.plan}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLE[t.status] ?? ''}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2">{t.nb_residences}</td>
                <td className="px-4 py-2">{t.nb_users}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1.5 text-xs">
                    {t.status === 'suspended' ? (
                      <button onClick={() => act(t, 'activate')} className="rounded bg-green-600 px-2 py-1 text-white">
                        Activer
                      </button>
                    ) : (
                      <button onClick={() => act(t, 'suspend')} className="rounded bg-red-600 px-2 py-1 text-white">
                        Suspendre
                      </button>
                    )}
                    <button onClick={() => act(t, 'extend-trial', { jours: 14 })} className="rounded border px-2 py-1">
                      +14j essai
                    </button>
                    <button onClick={() => impersonate(t)} className="rounded bg-primary px-2 py-1 text-white">
                      Dépanner
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
    </div>
  )
}
