import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api, type ClientOverview } from '../lib/api'

const STATUT_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
}

function mad(n: number) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n)
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex justify-between py-0.5">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </li>
  )
}

export function ClientDetail() {
  const { id } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', id],
    queryFn: async () =>
      (await api.get<{ data: { overview: ClientOverview } }>(`/admin/tenants/${id}/overview`)).data.data.overview,
    enabled: !!id,
  })

  if (isLoading) return <p className="text-slate-500">Chargement…</p>
  if (isError || !data) return <p className="text-slate-500">Client introuvable.</p>

  const { tenant, usagers, gestionnaires, parc, reclamations, finances, engagement, abonnement } = data

  return (
    <div className="space-y-5">
      <div>
        <Link to="/clients" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft className="size-4" /> Clients
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{tenant.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLE[tenant.status] ?? ''}`}>{tenant.status}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tenant.plan_label}</span>
          <span className="text-sm text-slate-400">{tenant.subdomain}.imaro.ma</span>
        </div>
      </div>

      {/* Ligne KPIs principaux */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="Usagers">
          <Stat label="Total" value={usagers.total} hint={`${usagers.actifs_30j} actifs (30j)`} />
        </Card>
        <Card title="Gestionnaires">
          <Stat label="Comptes" value={gestionnaires.total} hint={`${gestionnaires.personnel_terrain} personnel terrain`} />
        </Card>
        <Card title="Réclamations">
          <Stat
            label="Ouvertes"
            value={reclamations.par_statut.ouvert + reclamations.par_statut.en_cours}
            hint={`${reclamations.urgents_ouverts} urgentes · ${reclamations.total} au total`}
          />
        </Card>
        <Card title="Recouvrement">
          <Stat
            label="Taux"
            value={finances.taux_recouvrement !== null ? `${finances.taux_recouvrement}%` : '—'}
            hint={finances.exercice_actif ? `exercice ${finances.exercice_actif}` : 'aucun exercice actif'}
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Usagers par rôle */}
        <Card title="Répartition des usagers">
          <ul className="text-sm">
            <Row label="Managers" value={usagers.par_role.manager ?? 0} />
            <Row label="Gestionnaires" value={usagers.par_role.gestionnaire ?? 0} />
            <Row label="Conseil syndical" value={usagers.par_role.conseil ?? 0} />
            <Row label="Résidents" value={usagers.par_role.resident ?? 0} />
            {(usagers.par_role.agent_recouvrement ?? 0) > 0 && (
              <Row label="Agents recouvrement" value={usagers.par_role.agent_recouvrement} />
            )}
          </ul>
        </Card>

        {/* Parc */}
        <Card title="Parc immobilier">
          <ul className="text-sm">
            <Row label="Résidences" value={parc.residences} />
            <Row label="Lots" value={parc.lots} />
            <Row label="Copropriétaires" value={parc.coproprietaires} />
            <Row label="Occupants" value={parc.occupants} />
            <Row label="Exercices actifs" value={parc.exercices_actifs} />
          </ul>
        </Card>

        {/* Finances */}
        <Card title="Finances (exercice actif)">
          <ul className="text-sm">
            <Row label="Appels de fonds" value={mad(finances.appels_total_mad)} />
            <Row label="Encaissé" value={mad(finances.encaisse_mad)} />
            <Row label="Impayés" value={<span className="text-red-600">{mad(finances.impayes_mad)}</span>} />
            <Row
              label="Taux de recouvrement"
              value={finances.taux_recouvrement !== null ? `${finances.taux_recouvrement}%` : '—'}
            />
          </ul>
        </Card>

        {/* Réclamations détail */}
        <Card title="Réclamations (SLA)">
          <ul className="text-sm">
            <Row label="Ouvertes" value={reclamations.par_statut.ouvert} />
            <Row label="En cours" value={reclamations.par_statut.en_cours} />
            <Row label="Résolues" value={reclamations.par_statut.resolu} />
            <Row label="Closes" value={reclamations.par_statut.clos} />
            <Row
              label="Délai résolution moyen"
              value={reclamations.delai_resolution_moyen_h !== null ? `${reclamations.delai_resolution_moyen_h} h` : '—'}
            />
            <Row
              label="Satisfaction"
              value={reclamations.satisfaction_moyenne !== null ? `${Number(reclamations.satisfaction_moyenne).toFixed(1)}/5` : '—'}
            />
          </ul>
        </Card>

        {/* Engagement */}
        <Card title="Engagement">
          <ul className="text-sm">
            <Row
              label="Dernière activité"
              value={
                engagement.derniere_activite
                  ? new Date(engagement.derniere_activite).toLocaleDateString('fr-FR')
                  : 'jamais'
              }
            />
            <Row label="Connexions (7j)" value={engagement.logins_7j} />
            <Row label="Notifications WhatsApp (30j)" value={engagement.notifications_30j.whatsapp} />
            <Row label="SMS (30j)" value={engagement.notifications_30j.sms} />
            <Row label="Email (30j)" value={engagement.notifications_30j.email} />
            {engagement.notifications_30j.echecs > 0 && (
              <Row label="Échecs d'envoi" value={<span className="text-red-600">{engagement.notifications_30j.echecs}</span>} />
            )}
          </ul>
        </Card>

        {/* Abonnement + quotas */}
        <Card title={`Abonnement — ${abonnement.plan_label}`}>
          <div className="space-y-3">
            {abonnement.quotas.map((q) => (
              <div key={q.ressource}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-600">{q.ressource}</span>
                  <span className={q.over ? 'font-semibold text-red-600' : 'text-slate-500'}>
                    {q.used}
                    {q.limit !== null ? ` / ${q.limit}` : ' / ∞'}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${q.over ? 'bg-red-500' : q.warn ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(q.pct ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
