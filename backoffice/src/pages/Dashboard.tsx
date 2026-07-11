import { useQuery } from '@tanstack/react-query'
import { api, type Metrics } from '../lib/api'

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => (await api.get<{ data: Metrics }>('/admin/metrics')).data.data,
  })

  if (isLoading) return <p className="text-slate-500">Chargement…</p>
  if (!data) return <p className="text-slate-500">Aucune donnée.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Clients" value={data.clients.total} />
        <Stat label="Actifs" value={data.clients.actifs} />
        <Stat label="En essai" value={data.clients.essai} hint={`${data.essais_expirant_7j} expirent sous 7j`} />
        <Stat label="Suspendus" value={data.clients.suspendus} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Résidences" value={data.parc.residences} />
        <Stat label="Lots" value={data.parc.lots} />
        <Stat label="Utilisateurs" value={data.parc.utilisateurs} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Répartition par plan</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(data.par_plan).map(([plan, nb]) => (
              <li key={plan} className="flex justify-between">
                <span className="capitalize text-slate-600">{plan}</span>
                <span className="font-medium">{nb}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Derniers clients</h2>
          <ul className="space-y-1 text-sm">
            {data.derniers_clients.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="text-slate-600">{c.name}</span>
                <span className="text-slate-400 capitalize">{c.plan} · {c.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
