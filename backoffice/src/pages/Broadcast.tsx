import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getBroadcasts,
  sendBroadcast,
  type BroadcastInput,
  type BroadcastTarget,
} from '../lib/api'

const EMPTY: BroadcastInput = {
  title: '',
  message: '',
  target: 'all',
  target_value: null,
  channels: ['app', 'email'],
  scheduled_at: null,
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TARGET_LABEL: Record<BroadcastTarget, string> = {
  all: 'Tous les cabinets',
  plan: 'Par plan',
  tenant: 'Un cabinet',
}

export function Broadcast() {
  const qc = useQueryClient()
  const [form, setForm] = useState<BroadcastInput>(EMPTY)

  const { data: history = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: getBroadcasts,
  })

  const set = (patch: Partial<BroadcastInput>) =>
    setForm((f) => ({ ...f, ...patch }))

  const toggleChannel = (ch: string) =>
    set({
      channels: form.channels.includes(ch)
        ? form.channels.filter((c) => c !== ch)
        : [...form.channels, ch],
    })

  const mutation = useMutation({
    mutationFn: () =>
      sendBroadcast({
        ...form,
        target_value: form.target === 'all' ? null : form.target_value || null,
      }),
    onSuccess: () => {
      toast.success(
        form.scheduled_at ? 'Diffusion programmée' : 'Diffusion envoyée',
      )
      setForm(EMPTY)
      void qc.invalidateQueries({ queryKey: ['broadcasts'] })
    },
    onError: (e) =>
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Échec de la diffusion',
      ),
  })

  const canSend =
    form.title.trim() !== '' &&
    form.message.trim() !== '' &&
    form.channels.length > 0 &&
    (form.target === 'all' || (form.target_value ?? '').trim() !== '')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Diffusion aux cabinets</h1>

      {/* Composer */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Titre</label>
          <input
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ex. Maintenance planifiée"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => set({ message: e.target.value })}
            rows={4}
            placeholder="Votre message…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Cible</label>
            <select
              value={form.target}
              onChange={(e) =>
                set({
                  target: e.target.value as BroadcastTarget,
                  target_value: null,
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Tous les cabinets</option>
              <option value="plan">Par plan</option>
              <option value="tenant">Un cabinet précis</option>
            </select>
          </div>

          {form.target === 'plan' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Plan</label>
              <select
                value={form.target_value ?? ''}
                onChange={(e) => set({ target_value: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Choisir…</option>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          )}

          {form.target === 'tenant' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                ID / nom du cabinet
              </label>
              <input
                value={form.target_value ?? ''}
                onChange={(e) => set({ target_value: e.target.value })}
                placeholder="Ex. 1 ou Gest Syndic SARL"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Canaux</label>
            <div className="flex gap-4 pt-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.channels.includes('app')}
                  onChange={() => toggleChannel('app')}
                />
                Bannière in-app
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.channels.includes('email')}
                  onChange={() => toggleChannel('email')}
                />
                Email
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Programmer (optionnel)
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_at ?? ''}
              onChange={(e) => set({ scheduled_at: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSend || mutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {form.scheduled_at ? 'Programmer' : 'Diffuser maintenant'}
          </button>
        </div>
      </div>

      {/* Historique */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Historique des diffusions</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Titre</th>
                <th className="px-4 py-2 font-medium">Cible</th>
                <th className="px-4 py-2 font-medium">Canaux</th>
                <th className="px-4 py-2 font-medium">Envoyée</th>
                <th className="px-4 py-2 font-medium">Lecture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Aucune diffusion.
                  </td>
                </tr>
              ) : (
                history.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {b.title}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {TARGET_LABEL[b.target]}
                      {b.target_value ? ` · ${b.target_value}` : ''}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {b.channels.join(', ')}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {b.sent_at
                        ? fmtDate(b.sent_at)
                        : `Programmée ${fmtDate(b.scheduled_at)}`}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {b.recipients_count > 0
                        ? `${b.read_count}/${b.recipients_count}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
