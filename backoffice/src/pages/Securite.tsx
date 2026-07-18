import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getMembers,
  inviteMember,
  revokeMember,
  type SecurityMember,
} from '../lib/api'

function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('fr-FR') : 'Jamais'
}

export function Securite() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['security-members'],
    queryFn: getMembers,
  })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const refresh = () =>
    void qc.invalidateQueries({ queryKey: ['security-members'] })

  async function invite() {
    if (!name.trim() || !email.trim()) {
      toast.error('Nom et email requis')
      return
    }
    try {
      const temp = await inviteMember(name.trim(), email.trim())
      await navigator.clipboard.writeText(temp).catch(() => {})
      toast.success(`Membre invité — mot de passe temporaire copié : ${temp}`)
      setName('')
      setEmail('')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec de l’invitation'))
    }
  }

  async function revoke(m: SecurityMember) {
    if (!confirm(`Révoquer l’accès de ${m.name} ?`)) return
    try {
      await revokeMember(m.id)
      toast.success('Accès révoqué')
      refresh()
    } catch (e) {
      toast.error(apiError(e, 'Échec'))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sécurité du back-office</h1>

      {/* Inviter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Inviter un administrateur</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1"
            placeholder="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input flex-1"
            type="email"
            placeholder="email@imaro.ma"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            onClick={invite}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Inviter
          </button>
        </div>
      </div>

      {/* Membres */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Membre</th>
              <th className="px-4 py-2 font-medium">Dernière connexion</th>
              <th className="px-4 py-2 font-medium">2FA</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : (
              data.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.email}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {fmt(m.last_login_at)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.two_factor_enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {m.two_factor_enabled ? 'Activée' : 'Non activée'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.status === 'active' ? 'Actif' : 'Révoqué'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {m.status === 'active' && (
                      <button
                        onClick={() => revoke(m)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Révoquer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* À venir (backend) */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">À brancher côté backend</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-700">
          <li>
            <strong>2FA obligatoire (TOTP)</strong> — nécessite une librairie
            (Fortify ou google2fa) et les colonnes <code>two_factor_*</code>.
          </li>
          <li>
            <strong>Historique des impersonations</strong> — via le journal
            d’audit (Audit), avec bouton « terminer la session ».
          </li>
          <li>
            <strong>Restriction IP</strong> optionnelle sur l’accès back-office.
          </li>
        </ul>
      </div>
    </div>
  )
}
