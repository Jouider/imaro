import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getInvoices, markInvoicePaid, cancelInvoice, type Invoice } from '../lib/api'

const dh = (v: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} DH`

const STATUT_STYLE: Record<Invoice['statut'], string> = {
  payee: 'bg-green-100 text-green-700',
  envoyee: 'bg-blue-100 text-blue-700',
  impayee: 'bg-red-100 text-red-700',
  annulee: 'bg-slate-100 text-slate-500',
}
const STATUT_LABEL: Record<Invoice['statut'], string> = {
  payee: 'Payée',
  envoyee: 'Envoyée',
  impayee: 'Impayée',
  annulee: 'Annulée',
}

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}

export function Facturation() {
  const qc = useQueryClient()
  const [statut, setStatut] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['invoices', statut],
    queryFn: () => getInvoices(statut),
  })

  const refresh = () => void qc.invalidateQueries({ queryKey: ['invoices'] })
  const impayees = data.filter((i) => i.statut === 'impayee').length

  async function pay(i: Invoice) {
    try {
      await markInvoicePaid(i.id)
      toast.success('Facture marquée payée')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  async function cancel(i: Invoice) {
    if (!confirm(`Annuler la facture ${i.numero} ?`)) return
    try {
      await cancelInvoice(i.id)
      toast.success('Facture annulée')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Abonnements & facturation</h1>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="envoyee">Envoyées</option>
          <option value="payee">Payées</option>
          <option value="impayee">Impayées</option>
          <option value="annulee">Annulées</option>
        </select>
      </div>

      {impayees > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          ⚠ {impayees} facture{impayees > 1 ? 's' : ''} impayée
          {impayees > 1 ? 's' : ''} — relance recommandée.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Facture</th>
              <th className="px-4 py-2 font-medium">Cabinet</th>
              <th className="px-4 py-2 font-medium">Montant</th>
              <th className="px-4 py-2 font-medium">Période</th>
              <th className="px-4 py-2 font-medium">Échéance</th>
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
                  Aucune facture.
                </td>
              </tr>
            ) : (
              data.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">
                    {i.numero}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{i.tenant?.name ?? '—'}</td>
                  <td className="px-4 py-2 font-medium">
                    {dh(i.montant_dh)}
                    {i.remise_pct > 0 && (
                      <span className="ml-1 text-xs text-emerald-600">
                        −{i.remise_pct}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{i.periode_label ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{fmt(i.date_echeance)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLE[i.statut]}`}
                    >
                      {STATUT_LABEL[i.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2 text-xs">
                      {i.statut !== 'payee' && i.statut !== 'annulee' && (
                        <button
                          onClick={() => pay(i)}
                          className="rounded-md border border-green-200 px-2 py-1 text-green-700 hover:bg-green-50"
                        >
                          Marquer payée
                        </button>
                      )}
                      {i.statut !== 'annulee' && (
                        <button
                          onClick={() => cancel(i)}
                          className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-100"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        La génération de facture par cabinet et le changement de plan/remise se
        font depuis la fiche client (Clients).
      </p>
    </div>
  )
}
