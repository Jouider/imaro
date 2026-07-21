import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPlans, savePlan, deletePlan, type Plan, type PlanInput } from '../lib/api'

const dh = (v: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} DH`

const EMPTY: PlanInput = {
  slug: '',
  name: '',
  price_dh: 0,
  period: 'mensuel',
  quota_residences: null,
  quota_lots: null,
  quota_users: null,
  features: [],
  is_active: true,
  ordre: 0,
}

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

const q = (v: number | null) => (v === null ? '∞' : String(v))

export function Plans() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  })
  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<PlanInput>(EMPTY)

  const refresh = () => void qc.invalidateQueries({ queryKey: ['plans'] })

  function openCreate() {
    setForm(EMPTY)
    setEditing(null)
    setCreating(true)
  }

  function openEdit(p: Plan) {
    const { id: _id, ...rest } = p
    void _id
    setForm(rest)
    setEditing(p)
    setCreating(true)
  }

  async function save() {
    if (!form.slug.trim() || !form.name.trim()) {
      toast.error('Slug et nom requis')
      return
    }
    try {
      await savePlan(form, editing?.id)
      toast.success(editing ? 'Plan mis à jour' : 'Plan créé')
      setCreating(false)
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  async function remove(p: Plan) {
    if (!confirm(`Supprimer le plan « ${p.name} » ?`)) return
    try {
      await deletePlan(p.id)
      toast.success('Plan supprimé')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  const numOrNull = (v: string) => (v === '' ? null : Number(v))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Plans & tarifs</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          Nouveau plan
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Tarif</th>
              <th className="px-4 py-2 font-medium">Résidences</th>
              <th className="px-4 py-2 font-medium">Lots</th>
              <th className="px-4 py-2 font-medium">Utilisateurs</th>
              <th className="px-4 py-2 font-medium">Fonctionnalités</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : (
              data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.slug}</div>
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {dh(p.price_dh)}
                    <span className="text-xs text-slate-400"> /{p.period === 'mensuel' ? 'mois' : 'an'}</span>
                  </td>
                  <td className="px-4 py-2 tabular-nums">{q(p.quota_residences)}</td>
                  <td className="px-4 py-2 tabular-nums">{q(p.quota_lots)}</td>
                  <td className="px-4 py-2 tabular-nums">{q(p.quota_users)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {(p.features ?? []).length} incluses
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-100"
                      >
                        Éditer
                      </button>
                      <button
                        onClick={() => remove(p)}
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

      {creating && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">
              {editing ? 'Modifier le plan' : 'Nouveau plan'}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug">
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Nom">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Tarif (DH)">
                <input
                  type="number"
                  value={form.price_dh}
                  onChange={(e) => setForm({ ...form, price_dh: Number(e.target.value) })}
                  className="input"
                />
              </Field>
              <Field label="Période">
                <select
                  value={form.period}
                  onChange={(e) =>
                    setForm({ ...form, period: e.target.value as PlanInput['period'] })
                  }
                  className="input"
                >
                  <option value="mensuel">Mensuel</option>
                  <option value="annuel">Annuel</option>
                </select>
              </Field>
              <Field label="Quota résidences (vide = ∞)">
                <input
                  type="number"
                  value={form.quota_residences ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, quota_residences: numOrNull(e.target.value) })
                  }
                  className="input"
                />
              </Field>
              <Field label="Quota lots (vide = ∞)">
                <input
                  type="number"
                  value={form.quota_lots ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, quota_lots: numOrNull(e.target.value) })
                  }
                  className="input"
                />
              </Field>
              <Field label="Quota utilisateurs (vide = ∞)">
                <input
                  type="number"
                  value={form.quota_users ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, quota_users: numOrNull(e.target.value) })
                  }
                  className="input"
                />
              </Field>
              <Field label="Actif">
                <select
                  value={form.is_active ? '1' : '0'}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.value === '1' })
                  }
                  className="input"
                >
                  <option value="1">Oui</option>
                  <option value="0">Non</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:brightness-110"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}
