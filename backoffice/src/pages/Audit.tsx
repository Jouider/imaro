import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getAdminAuditLogs, type AuditFilters } from '../lib/api'

const PAGE_SIZE = 25

const SEVERITY_STYLE: Record<string, string> = {
  info: 'bg-slate-100 text-slate-600',
  warning: 'bg-amber-100 text-amber-700',
  sensitive: 'bg-purple-100 text-purple-700',
  error: 'bg-red-100 text-red-700',
}

const CATEGORIES = [
  'auth',
  'facturation',
  'paiement',
  'system',
  'coproprietaire',
  'depense',
]

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Audit() {
  const [filters, setFilters] = useState<AuditFilters>({})

  const [page, setPage] = useState(1)

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-audit', filters],
    queryFn: () => getAdminAuditLogs(filters),
  })

  // Tout changement de filtre remet à la première page.
  useEffect(() => setPage(1), [filters])

  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => data.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [data, current],
  )

  const set = (patch: Partial<AuditFilters>) =>
    setFilters((f) => ({ ...f, ...patch }))

  function exportCsv() {
    if (data.length === 0) {
      toast.error('Rien à exporter')
      return
    }
    const header = [
      'date',
      'cabinet',
      'categorie',
      'action',
      'severite',
      'cible',
      'utilisateur',
      'ip',
    ]
    const rows = data.map((l) => [
      l.created_at,
      l.tenant?.name ?? '',
      l.category,
      l.action,
      l.severity,
      l.target_label ?? '',
      l.user_email ?? '',
      l.ip_address ?? '',
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Journal d'audit (global)</h1>
        <button
          onClick={exportCsv}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Exporter CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Rechercher (action, utilisateur, cabinet…)"
          value={filters.search ?? ''}
          onChange={(e) => set({ search: e.target.value })}
          className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={filters.category ?? ''}
          onChange={(e) => set({ category: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.severity ?? ''}
          onChange={(e) => set({ severity: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Toutes sévérités</option>
          <option value="info">Info</option>
          <option value="warning">Avertissement</option>
          <option value="sensitive">Sensible</option>
          <option value="error">Erreur</option>
        </select>
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => set({ from: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => set({ to: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Cabinet</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Sévérité</th>
              <th className="px-4 py-2 font-medium">Utilisateur</th>
              <th className="px-4 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucune entrée.
                </td>
              </tr>
            ) : (
              pageRows.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {fmtDateTime(l.created_at)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {l.tenant?.name ?? '— (global)'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800">{l.action}</div>
                    {l.target_label && (
                      <div className="text-xs text-slate-400">
                        {l.target_label}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        SEVERITY_STYLE[l.severity] ?? 'bg-slate-100'
                      }`}
                    >
                      {l.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {l.user_email ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-400">
                    {l.ip_address ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — masquée tant qu'il n'y a qu'une page. */}
      {!isLoading && data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, data.length)} sur{' '}
            {data.length}
            {data.length >= 500 && ' (500 max)'}
          </span>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={current === 1}
                aria-label="Page précédente"
                className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 tabular-nums">
                {current} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={current === pageCount}
                aria-label="Page suivante"
                className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
