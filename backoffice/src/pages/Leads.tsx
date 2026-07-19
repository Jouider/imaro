import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getLeads,
  createLead,
  updateLeadStatus,
  convertLead,
  type Lead,
  type LeadConvertResult,
} from '../lib/api'
import { CredentialsResult } from '../components/CredentialsResult'

const STATUTS = ['nouveau', 'contacte', 'demo_planifiee', 'gagne', 'perdu']
const SOURCES = ['site', 'salon', 'recommandation', 'appel', 'autre']

const STATUT_STYLE: Record<string, string> = {
  nouveau: 'bg-slate-100 text-slate-600',
  contacte: 'bg-blue-100 text-blue-700',
  demo_planifiee: 'bg-amber-100 text-amber-700',
  gagne: 'bg-green-100 text-green-700',
  perdu: 'bg-red-100 text-red-700',
}

export function Leads() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ cabinet_nom: '', contact_email: '', ville: '', source: 'site' })
  // Identifiants du responsable à afficher après conversion (KAN-138).
  const [credResult, setCredResult] = useState<LeadConvertResult | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads(),
  })

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ['leads'] })
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cabinet_nom.trim()) return
    try {
      await createLead(form)
      setForm({ cabinet_nom: '', contact_email: '', ville: '', source: 'site' })
      toast.success('Lead ajouté')
      invalidate()
    } catch {
      toast.error('Échec de l’ajout')
    }
  }

  async function changeStatut(l: Lead, statut: string) {
    await updateLeadStatus(l.id, statut)
    invalidate()
  }

  async function convertir(l: Lead) {
    try {
      const result = await convertLead(l.id)
      toast.success('Lead converti — identifiants envoyés au responsable')
      setCredResult(result)
      invalidate()
    } catch (e) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Échec',
      )
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Démos & leads</h1>

      <form onSubmit={create} className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input
          placeholder="Nom du cabinet *"
          value={form.cabinet_nom}
          onChange={(e) => setForm({ ...form, cabinet_nom: e.target.value })}
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Email contact"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Ville"
          value={form.ville}
          onChange={(e) => setForm({ ...form, ville: e.target.value })}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
          Ajouter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Cabinet</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            )}
            {data?.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{l.cabinet_nom}</div>
                  <div className="text-xs text-slate-400">{l.ville ?? '—'}</div>
                </td>
                <td className="px-4 py-2">
                  <div>{l.contact_nom ?? '—'}</div>
                  <div className="text-xs text-slate-400">{l.contact_email ?? ''}</div>
                </td>
                <td className="px-4 py-2 capitalize">{l.source}</td>
                <td className="px-4 py-2">
                  <select
                    value={l.statut}
                    onChange={(e) => changeStatut(l, e.target.value)}
                    disabled={!!l.converted_tenant}
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLE[l.statut] ?? ''}`}
                  >
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  {l.converted_tenant ? (
                    <span className="text-xs text-green-600">→ {l.converted_tenant.name}</span>
                  ) : (
                    <button onClick={() => convertir(l)} className="rounded bg-primary px-2 py-1 text-xs text-white">
                      Convertir en client
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Aucun lead.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {credResult && (
        <CredentialsResult
          owner={credResult.owner}
          tempPassword={credResult.temp_password}
          onClose={() => setCredResult(null)}
        />
      )}
    </div>
  )
}
