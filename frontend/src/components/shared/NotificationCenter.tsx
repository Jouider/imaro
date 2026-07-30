import { useTranslation } from 'react-i18next'
import {
  Bell,
  BanknoteIcon,
  TicketIcon,
  CalendarCheck,
  AlertCircle,
  Info,
  CheckCheck,
  X,
} from 'lucide-react'
import { useNotifStore, type NotifType } from '@/stores/notifStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

function notifIcon(type: NotifType) {
  const base = 'size-8 rounded-full flex items-center justify-center shrink-0'
  switch (type) {
    case 'paiement':
      return (
        <div className={cn(base, 'bg-green-100 dark:bg-green-900/30')}>
          <BanknoteIcon className="size-4 text-green-600 dark:text-green-400" />
        </div>
      )
    case 'ticket':
      return (
        <div className={cn(base, 'bg-blue-100 dark:bg-blue-900/30')}>
          <TicketIcon className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
      )
    case 'assemblee':
      return (
        <div className={cn(base, 'bg-purple-100 dark:bg-purple-900/30')}>
          <CalendarCheck className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
      )
    case 'retard':
      return (
        <div className={cn(base, 'bg-red-100 dark:bg-red-900/30')}>
          <AlertCircle className="size-4 text-red-500 dark:text-red-400" />
        </div>
      )
    default:
      return (
        <div className={cn(base, 'bg-gray-100 dark:bg-muted')}>
          <Info className="size-4 text-muted-foreground" />
        </div>
      )
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

type NotificationCenterProps = {
  /** Classes for the trigger button — lets each shell match its own top bar. */
  triggerClassName?: string
  /** Size class for the bell icon (e.g. "size-[18px]" or "size-[22px]"). */
  iconClassName?: string
}

/**
 * Notification bell + dropdown panel, wired to the real notification store.
 * The badge and list reflect actual notifications (native push + app events) —
 * it shows nothing when there is nothing. Shared by the gestionnaire top bar
 * and the resident portail header.
 */
export function NotificationCenter({
  triggerClassName,
  iconClassName = 'size-[18px]',
}: NotificationCenterProps) {
  const { t } = useTranslation()
  const { notifs, markRead, markAllRead, dismiss } = useNotifStore()
  const unreadCount = notifs.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('common.notifications', { defaultValue: 'Notifications' })}${
            unreadCount > 0 ? ` (${unreadCount})` : ''
          }`}
          className={cn(
            'relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none',
            triggerClassName,
          )}
        >
          <Bell className={iconClassName} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#E67E22] text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-2rem))] p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-[var(--color-imaro-primary)]" />
            <span className="text-sm font-semibold text-foreground">
              {t('common.notifications', { defaultValue: 'Notifications' })}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#E67E22] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-[var(--color-imaro-primary)] hover:underline"
            >
              <CheckCheck className="size-3.5" />
              {t('common.markAllRead', { defaultValue: 'Tout lire' })}
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {t('common.noNotifications', {
                  defaultValue: 'Aucune notification',
                })}
              </p>
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'group flex items-start gap-3 px-4 py-3 transition-colors',
                  'border-b last:border-0',
                  !n.read
                    ? 'bg-[var(--color-imaro-primary)]/[0.03] dark:bg-[var(--color-imaro-primary)]/10'
                    : 'hover:bg-muted/40',
                )}
                onClick={() => markRead(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && markRead(n.id)}
              >
                {notifIcon(n.type)}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm leading-tight',
                        !n.read
                          ? 'font-semibold text-foreground'
                          : 'font-medium text-foreground/80',
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#E67E22]" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    {timeAgo(n.time)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismiss(n.id)
                  }}
                  aria-label={t('common.delete', { defaultValue: 'Supprimer' })}
                  className="mt-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground group-hover:flex"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifs.length > 0 && (
          <div className="border-t px-4 py-2.5">
            <p className="text-center text-xs text-muted-foreground">
              {notifs.length}{' '}
              {t('common.notificationsTotal', {
                count: notifs.length,
                defaultValue: `notification${notifs.length > 1 ? 's' : ''} au total`,
              })}
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
