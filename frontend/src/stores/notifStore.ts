import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotifType = 'paiement' | 'ticket' | 'assemblee' | 'retard' | 'info'

export type Notif = {
  id: string
  type: NotifType
  title: string
  message: string
  time: string // ISO date
  read: boolean
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const now = new Date()
const minsAgo = (m: number) =>
  new Date(now.getTime() - m * 60_000).toISOString()
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 3_600_000).toISOString()
const daysAgo = (d: number) =>
  new Date(now.getTime() - d * 86_400_000).toISOString()

const SEED_NOTIFS: Notif[] = [
  {
    id: 'n1',
    type: 'paiement',
    title: 'Paiement reçu',
    message: 'Youssef El Mansouri a réglé 1 500 MAD — Lot B3',
    time: minsAgo(12),
    read: false,
  },
  {
    id: 'n2',
    type: 'ticket',
    title: 'Nouveau ticket',
    message: "Fuite d'eau signalée au 3ème étage — Bât. A",
    time: minsAgo(45),
    read: false,
  },
  {
    id: 'n3',
    type: 'retard',
    title: 'Retard de paiement',
    message: 'Sara Alaoui — Lot C1 — échéance dépassée de 5 jours',
    time: hoursAgo(3),
    read: false,
  },
  {
    id: 'n4',
    type: 'assemblee',
    title: 'Assemblée programmée',
    message: 'AG ordinaire le 25 mai 2026 à 18h — Salle de réunion',
    time: hoursAgo(7),
    read: true,
  },
  {
    id: 'n5',
    type: 'info',
    title: 'Document ajouté',
    message: "PV AG 2025 disponible dans l'espace Documents",
    time: daysAgo(1),
    read: true,
  },
  {
    id: 'n6',
    type: 'paiement',
    title: 'Paiement reçu',
    message: 'Karim Benali a réglé 2 200 MAD — Lot A7',
    time: daysAgo(2),
    read: true,
  },
]

// ─── Store ───────────────────────────────────────────────────────────────────

type NotifState = {
  notifs: Notif[]
  markRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
  addNotif: (n: Omit<Notif, 'id' | 'read'>) => void
}

export const useNotifStore = create<NotifState>()(
  persist(
    (set) => ({
      notifs: SEED_NOTIFS,

      markRead: (id) =>
        set((s) => ({
          notifs: s.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllRead: () =>
        set((s) => ({
          notifs: s.notifs.map((n) => ({ ...n, read: true })),
        })),

      dismiss: (id) =>
        set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })),

      addNotif: (partial) =>
        set((s) => ({
          notifs: [
            {
              ...partial,
              id: `n${Date.now()}`,
              read: false,
            },
            ...s.notifs,
          ],
        })),
    }),
    { name: 'imaro.notifs' },
  ),
)
