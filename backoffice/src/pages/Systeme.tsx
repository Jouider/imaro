import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getHealth, getFailedJobs, retryFailedJob, type FailedJob } from '../lib/api'

const SERVICE_LABEL: Record<string, string> = {
  database: 'Base de données',
  redis: 'Redis',
  cache: 'Cache',
  storage: 'Stockage',
}
const INTEGRATION_LABEL: Record<string, string> = {
  whatsapp_twilio: 'WhatsApp / Twilio',
  email_brevo: 'E-mail (Brevo)',
  push_fcm: 'Push Android (FCM)',
  push_apns: 'Push iOS (APNs)',
  paiement_cmi: 'Paiement (CMI)',
}

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
    />
  )
}

export function Systeme() {
  const qc = useQueryClient()
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
  })
  const { data: jobs = [] } = useQuery({
    queryKey: ['failed-jobs'],
    queryFn: getFailedJobs,
  })

  async function retry(j: FailedJob) {
    try {
      await retryFailedJob(j.id)
      toast.success('Job relancé')
      void qc.invalidateQueries({ queryKey: ['failed-jobs'] })
    } catch (e) {
      toast.error(apiError(e, 'Relance impossible'))
    }
  }

  if (isLoading || !health)
    return <p className="text-slate-500">Chargement…</p>

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Système</h1>
        <p className="text-xs text-slate-400">
          {health.environment} · version {health.version}
        </p>
      </div>

      {/* Services + files */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Services</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(health.services).map(([k, ok]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="text-slate-600">{SERVICE_LABEL[k] ?? k}</span>
                <span className="flex items-center gap-2">
                  <Dot ok={ok} />
                  <span className={ok ? 'text-green-600' : 'text-red-600'}>
                    {ok ? 'OK' : 'KO'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Files (queue)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">En attente</p>
              <p className="text-2xl font-semibold">{health.queue.pending}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">En échec</p>
              <p
                className={`text-2xl font-semibold ${
                  health.queue.failed > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {health.queue.failed}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Dernière migration : {health.last_migration ?? '—'}
          </p>
        </div>
      </div>

      {/* Intégrations */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Intégrations</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(health.integrations).map(([k, ok]) => (
            <li key={k} className="flex items-center justify-between">
              <span className="text-slate-600">{INTEGRATION_LABEL[k] ?? k}</span>
              <span className="flex items-center gap-2">
                <Dot ok={ok} />
                <span className={ok ? 'text-green-600' : 'text-slate-400'}>
                  {ok ? 'Configurée' : 'Non configurée'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Jobs en échec */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          Jobs en échec
        </h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400">
                  Aucun job en échec 🎉
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="text-slate-700">{j.exception}</div>
                    <div className="text-xs text-slate-400">
                      {j.queue} · {j.failed_at ?? ''}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => retry(j)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                    >
                      Relancer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
