import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Contact, Clock, AlertTriangle } from 'lucide-react'
import { getHealth, getLeads, getMetrics } from '../lib/api'

type Notif = {
  id: string
  icon: typeof Contact
  label: string
  detail: string
  to: string
  tone: 'info' | 'warning' | 'alert'
}

const TONE: Record<Notif['tone'], string> = {
  info: 'bg-blue-50 text-blue-600',
  warning: 'bg-amber-50 text-amber-600',
  alert: 'bg-red-50 text-red-600',
}

/**
 * Cloche de notifications du back-office. Agrège des signaux réels issus des
 * endpoints existants — pas de nouvel appel dédié :
 *   - demandes de démo non traitées (leads « nouveau ») ;
 *   - essais qui expirent sous 7 jours ;
 *   - tâches de file en échec.
 * Chaque entrée est cliquable et renvoie vers la page concernée.
 */
export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Rafraîchi périodiquement pour que la cloche reste vivante sans action.
  const opts = { staleTime: 60_000, refetchInterval: 120_000 } as const
  const { data: leads } = useQuery({ queryKey: ['leads'], queryFn: getLeads, ...opts })
  const { data: metrics } = useQuery({ queryKey: ['metrics'], queryFn: getMetrics, ...opts })
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth, ...opts })

  // Ferme le panneau au clic extérieur.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const notifs: Notif[] = []

  const nouveauxLeads = leads?.filter((l) => l.statut === 'nouveau').length ?? 0
  if (nouveauxLeads > 0) {
    notifs.push({
      id: 'leads',
      icon: Contact,
      label: `${nouveauxLeads} demande${nouveauxLeads > 1 ? 's' : ''} de démo`,
      detail: 'À traiter dans le pipeline commercial',
      to: '/leads',
      tone: 'info',
    })
  }

  const essais = metrics?.essais_expirant_7j ?? 0
  if (essais > 0) {
    notifs.push({
      id: 'essais',
      icon: Clock,
      label: `${essais} essai${essais > 1 ? 's' : ''} expire${essais > 1 ? 'nt' : ''} bientôt`,
      detail: 'Sous 7 jours — relancer le client',
      to: '/clients',
      tone: 'warning',
    })
  }

  const echecs = health?.queue.failed ?? 0
  if (echecs > 0) {
    notifs.push({
      id: 'jobs',
      icon: AlertTriangle,
      label: `${echecs} tâche${echecs > 1 ? 's' : ''} en échec`,
      detail: 'File de traitement — à rejouer',
      to: '/systeme',
      tone: 'alert',
    })
  }

  const total = notifs.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${total ? ` (${total})` : ''}`}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="size-5" />
        {total > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
          </div>
          {total === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Rien à signaler pour le moment.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifs.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      setOpen(false)
                      navigate(n.to)
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className={`mt-0.5 rounded-lg p-2 ${TONE[n.tone]}`}>
                      <n.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">
                        {n.label}
                      </span>
                      <span className="block text-xs text-slate-500">{n.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
