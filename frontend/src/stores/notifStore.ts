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

// ─── Store ─────────────────────────────────────────────────────────────────
// Notifications are real, not seeded: they arrive via native push
// (`push-native.ts` → addNotif) and controller events. Previously the store
// shipped with 6 mock notifications, which surfaced as phantom "unread" badges
// on real devices even when nothing had happened (KAN-133 follow-up).

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
      notifs: [],

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
    {
      name: 'imaro.notifs',
      // v0 shipped 6 mock notifications persisted on-device. Bump the version so
      // existing installs (which already cached the seed) are wiped to an empty
      // list on upgrade — otherwise the phantom "unread" badges survive.
      version: 1,
      migrate: (persisted, version) => {
        if (version < 1) return { notifs: [] } as Partial<NotifState>
        return persisted as Partial<NotifState>
      },
    },
  ),
)
