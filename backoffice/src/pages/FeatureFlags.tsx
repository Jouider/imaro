import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getFeatureFlags,
  updateFeatureFlag,
  PLANS,
  type FeatureFlag,
} from '../lib/api'

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  business: 'Business',
  premium: 'Premium',
}

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

export function FeatureFlags() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: getFeatureFlags,
  })

  async function toggle(flag: FeatureFlag, plan: string) {
    const next = flag.enabled_plans.includes(plan)
      ? flag.enabled_plans.filter((p) => p !== plan)
      : [...flag.enabled_plans, plan]
    // Optimistic update
    qc.setQueryData<FeatureFlag[]>(['feature-flags'], (old) =>
      (old ?? []).map((f) =>
        f.key === flag.key ? { ...f, enabled_plans: next } : f,
      ),
    )
    try {
      await updateFeatureFlag(flag.key, next)
      toast.success('Droit mis à jour')
    } catch (e) {
      toast.error(apiError(e, 'Échec — annulé'))
      void qc.invalidateQueries({ queryKey: ['feature-flags'] })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Fonctionnalités (feature flags)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Activez chaque fonctionnalité par plan. Les cabinets héritent des droits
          de leur plan ; des exceptions par cabinet se gèrent sur leur fiche.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Fonctionnalité</th>
              {PLANS.map((p) => (
                <th key={p} className="px-4 py-2 text-center font-medium">
                  {PLAN_LABEL[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={PLANS.length + 1}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Chargement…
                </td>
              </tr>
            ) : (
              data.map((flag) => (
                <tr key={flag.key} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{flag.label}</div>
                    <div className="text-xs text-slate-400">
                      {flag.description}
                    </div>
                  </td>
                  {PLANS.map((plan) => {
                    const on = flag.enabled_plans.includes(plan)
                    return (
                      <td key={plan} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggle(flag, plan)}
                          role="switch"
                          aria-checked={on}
                          aria-label={`${flag.label} — ${PLAN_LABEL[plan]}`}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            on ? 'bg-primary' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                              on ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Le front principal lira ces droits (via les entitlements du tenant) pour
        remplacer le flag en dur <code>AI_FEATURES_ENABLED</code> (KAN-111) une
        fois l’exposition backend en place.
      </p>
    </div>
  )
}
