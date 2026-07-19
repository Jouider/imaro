import { useState } from 'react'
import { toast } from 'sonner'

/**
 * Affiche les identifiants du responsable après création d'un cabinet /
 * conversion d'un lead (KAN-138). Le mot de passe temporaire est envoyé par
 * email ; on l'affiche aussi ici avec un bouton copier pour le partage manuel.
 */
export function CredentialsResult({
  owner,
  tempPassword,
  onClose,
}: {
  owner: { name: string; email: string }
  tempPassword: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copie impossible')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold">Identifiants du responsable</h2>
        <p className="mt-2 text-sm text-slate-500">
          Un email de bienvenue a été envoyé à <strong>{owner.email}</strong>.
          Vous pouvez aussi communiquer le mot de passe temporaire ci-dessous.
          À la première connexion, le responsable choisira son propre mot de
          passe puis activera la double authentification.
        </p>

        <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Responsable</dt>
            <dd className="font-medium text-slate-800">{owner.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Identifiant</dt>
            <dd className="font-medium text-slate-800">{owner.email}</dd>
          </div>
        </dl>

        <label className="mt-3 block text-xs font-medium text-slate-600">
          Mot de passe temporaire
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            value={tempPassword}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            onClick={copy}
            className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            {copied ? '✓ Copié' : 'Copier'}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
