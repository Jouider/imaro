import { useQuery } from '@tanstack/react-query'
import { getMetrics, type MetricPoint, type Metrics } from '../lib/api'

const dh = (v: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} DH`

function Stat({
  label,
  value,
  hint,
  delta,
}: {
  label: string
  value: number | string
  hint?: string
  delta?: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {delta !== undefined && (
          <span
            className={`text-xs font-semibold ${
              delta >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

/** Mini bar chart sans dépendance (barres verticales proportionnelles au max). */
function BarChart({
  title,
  points,
  format = (v) => String(v),
}: {
  title: string
  points: MetricPoint[]
  format?: (v: number) => string
}) {
  const max = Math.max(1, ...points.map((p) => p.value))
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="flex h-40 items-end gap-2">
        {points.map((p) => (
          <div
            key={p.label}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] font-medium text-slate-500">
              {format(p.value)}
            </span>
            <div
              className="w-full shrink-0 rounded-t bg-indigo-500/80"
              style={{ height: `${(p.value / max) * 82}%` }}
              title={`${p.label} — ${format(p.value)}`}
            />
            <span className="text-[10px] text-slate-400">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data, isLoading } = useQuery<Metrics>({
    queryKey: ['metrics'],
    queryFn: getMetrics,
  })

  if (isLoading) return <p className="text-slate-500">Chargement…</p>
  if (!data) return <p className="text-slate-500">Aucune donnée.</p>

  const mrrDelta =
    data.mrr !== undefined && data.mrr_precedent
      ? ((data.mrr - data.mrr_precedent) / data.mrr_precedent) * 100
      : undefined

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>

      {/* KPIs business */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat
          label="MRR"
          value={data.mrr !== undefined ? dh(data.mrr) : '—'}
          hint="vs mois précédent"
          delta={mrrDelta}
        />
        <Stat label="ARR" value={data.arr !== undefined ? dh(data.arr) : '—'} />
        <Stat
          label="Revenus du mois"
          value={data.revenus_mois !== undefined ? dh(data.revenus_mois) : '—'}
        />
        <Stat
          label="Churn"
          value={data.churn_pct !== undefined ? `${data.churn_pct}%` : '—'}
          hint="mensuel"
        />
        <Stat
          label="Conversion"
          value={
            data.conversion_pct !== undefined ? `${data.conversion_pct}%` : '—'
          }
          hint="leads → clients"
        />
      </div>

      {/* KPIs parc / clients */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Clients" value={data.clients.total} />
        <Stat label="Actifs" value={data.clients.actifs} />
        <Stat
          label="En essai"
          value={data.clients.essai}
          hint={`${data.essais_expirant_7j} expirent sous 7j`}
        />
        <Stat label="Suspendus" value={data.clients.suspendus} />
      </div>

      {/* Graphiques d'évolution */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.evolution_mrr && (
          <BarChart
            title="Évolution du MRR"
            points={data.evolution_mrr}
            format={dh}
          />
        )}
        {data.nouveaux_tenants && (
          <BarChart
            title="Nouveaux clients / mois"
            points={data.nouveaux_tenants}
          />
        )}
      </div>

      {/* Répartition + derniers clients */}
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
                <span className="capitalize text-slate-400">
                  {c.plan} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
