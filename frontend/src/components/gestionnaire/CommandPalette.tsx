import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { canAccessRoute } from '@/lib/navAccess'
import {
  LayoutDashboard,
  Sparkles,
  Building2,
  Users,
  UserSquare,
  Wrench,
  Upload,
  Wallet,
  Receipt,
  PiggyBank,
  AlertTriangle,
  Landmark,
  TrendingUp,
  Undo2,
  Calculator,
  Hammer,
  Banknote,
  Drill,
  Calendar,
  FileText,
  History,
  Megaphone,
  Ticket,
  User,
  Plus,
  ShieldCheck,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

type Entry = {
  /** Stable key for the item */
  key: string
  /** Display label */
  label: string
  /** Optional subtitle */
  hint?: string
  icon: LucideIcon
  /** Either a route to navigate to, or a callback */
  to?: string
  onSelect?: () => void
  /** Optional keyboard shortcut hint */
  shortcut?: string
  /** Group filter */
  group: 'nav' | 'actions'
}

/**
 * Command palette — Cmd+K / Ctrl+K trigger.
 * Fuzzy navigation across the 28 gestionnaire pages + quick actions
 * (new ticket, new payment, run IA audit, etc.).
 */
export function CommandPalette() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)

  // Bind Cmd+K / Ctrl+K globally
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ENTRIES: Entry[] = [
    // Navigation — 28 pages
    {
      key: 'nav-dashboard',
      group: 'nav',
      label: t('gestionnaire.nav.dashboard'),
      icon: LayoutDashboard,
      to: '/gestionnaire/dashboard',
    },
    {
      key: 'nav-ia',
      group: 'nav',
      label: t('gestionnaire.nav.ia'),
      icon: Sparkles,
      to: '/gestionnaire/ia',
      hint: 'Audit · OCR · Budget',
    },
    {
      key: 'nav-residences',
      group: 'nav',
      label: t('gestionnaire.nav.residences'),
      icon: Building2,
      to: '/gestionnaire/residences',
    },
    {
      key: 'nav-coproprietaires',
      group: 'nav',
      label: t('gestionnaire.nav.coproprietaires'),
      icon: Users,
      to: '/gestionnaire/coproprietaires',
    },
    {
      key: 'nav-occupants',
      group: 'nav',
      label: t('gestionnaire.nav.occupants'),
      icon: UserSquare,
      to: '/gestionnaire/occupants',
    },
    {
      key: 'nav-prestataires',
      group: 'nav',
      label: t('gestionnaire.nav.prestataires'),
      icon: Wrench,
      to: '/gestionnaire/prestataires',
    },
    {
      key: 'nav-imports',
      group: 'nav',
      label: t('gestionnaire.nav.imports'),
      icon: Upload,
      to: '/gestionnaire/imports',
    },
    {
      key: 'nav-paiements',
      group: 'nav',
      label: t('gestionnaire.nav.paiements'),
      icon: Wallet,
      to: '/gestionnaire/paiements',
    },
    {
      key: 'nav-depenses',
      group: 'nav',
      label: t('gestionnaire.nav.depenses'),
      icon: Receipt,
      to: '/gestionnaire/depenses',
    },
    {
      key: 'nav-budgets',
      group: 'nav',
      label: t('gestionnaire.nav.budgets'),
      icon: PiggyBank,
      to: '/gestionnaire/budgets',
    },
    {
      key: 'nav-recouvrement',
      group: 'nav',
      label: t('gestionnaire.nav.recouvrement'),
      icon: AlertTriangle,
      to: '/gestionnaire/recouvrement',
    },
    {
      key: 'nav-pointage',
      group: 'nav',
      label: t('gestionnaire.nav.pointage'),
      icon: Landmark,
      to: '/gestionnaire/pointage',
    },
    {
      key: 'nav-autres-recettes',
      group: 'nav',
      label: t('gestionnaire.nav.autresRecettes'),
      icon: TrendingUp,
      to: '/gestionnaire/autres-recettes',
    },
    {
      key: 'nav-remboursements',
      group: 'nav',
      label: t('gestionnaire.nav.remboursements'),
      icon: Undo2,
      to: '/gestionnaire/remboursements',
    },
    {
      key: 'nav-comptabilite',
      group: 'nav',
      label: t('gestionnaire.nav.comptabilite'),
      icon: Calculator,
      to: '/gestionnaire/comptabilite',
    },
    {
      key: 'nav-equipements',
      group: 'nav',
      label: t('gestionnaire.nav.equipements'),
      icon: Hammer,
      to: '/gestionnaire/equipements',
    },
    {
      key: 'nav-emprunts',
      group: 'nav',
      label: t('gestionnaire.nav.emprunts'),
      icon: Banknote,
      to: '/gestionnaire/emprunts',
    },
    {
      key: 'nav-travaux',
      group: 'nav',
      label: t('gestionnaire.nav.travauxExceptionnels'),
      icon: Drill,
      to: '/gestionnaire/travaux-exceptionnels',
    },
    {
      key: 'nav-conformite',
      group: 'nav',
      label: t('gestionnaire.nav.conformite'),
      icon: ShieldCheck,
      to: '/gestionnaire/conformite',
    },
    {
      key: 'nav-annexes',
      group: 'nav',
      label: t('gestionnaire.nav.annexes'),
      icon: FileText,
      to: '/gestionnaire/annexes',
    },
    {
      key: 'nav-audit',
      group: 'nav',
      label: t('gestionnaire.nav.audit'),
      icon: History,
      to: '/gestionnaire/audit',
    },
    {
      key: 'nav-assemblees',
      group: 'nav',
      label: t('gestionnaire.nav.assemblees'),
      icon: Calendar,
      to: '/gestionnaire/assemblees',
    },
    {
      key: 'nav-annonces',
      group: 'nav',
      label: t('gestionnaire.nav.annonces'),
      icon: Megaphone,
      to: '/gestionnaire/annonces',
    },
    {
      key: 'nav-tickets',
      group: 'nav',
      label: t('gestionnaire.nav.tickets'),
      icon: Ticket,
      to: '/gestionnaire/tickets',
    },
    {
      key: 'nav-documents',
      group: 'nav',
      label: t('gestionnaire.nav.documents'),
      icon: FileText,
      to: '/gestionnaire/documents',
    },
    {
      key: 'nav-profil',
      group: 'nav',
      label: t('gestionnaire.nav.profil'),
      icon: User,
      to: '/gestionnaire/profil',
    },

    // Quick actions
    {
      key: 'action-new-ticket',
      group: 'actions',
      label: t('gestionnaire.cmdk.newTicket'),
      icon: Ticket,
      to: '/gestionnaire/tickets',
      shortcut: 'T',
    },
    {
      key: 'action-new-payment',
      group: 'actions',
      label: t('gestionnaire.cmdk.recordPayment'),
      icon: CircleDollarSign,
      to: '/gestionnaire/paiements',
      shortcut: 'P',
    },
    {
      key: 'action-run-audit',
      group: 'actions',
      label: t('gestionnaire.cmdk.runAudit'),
      icon: Sparkles,
      to: '/gestionnaire/ia',
      shortcut: 'I',
    },
    {
      key: 'action-new-annexe',
      group: 'actions',
      label: t('gestionnaire.cmdk.generateAnnexe'),
      icon: FileText,
      to: '/gestionnaire/annexes',
      shortcut: 'A',
    },
    {
      key: 'action-import',
      group: 'actions',
      label: t('gestionnaire.cmdk.import'),
      icon: Plus,
      to: '/gestionnaire/imports',
    },
  ]

  function runEntry(entry: Entry) {
    setOpen(false)
    if (entry.onSelect) entry.onSelect()
    else if (entry.to) navigate(entry.to)
  }

  // Hide entries the gestionnaire can't reach (same permission rules as the
  // sidebar). Entries without a route are always shown.
  const canShow = (e: Entry) =>
    !e.to || canAccessRoute(e.to, user?.role, user?.app_permissions)
  const navEntries = ENTRIES.filter((e) => e.group === 'nav' && canShow(e))
  const actionEntries = ENTRIES.filter(
    (e) => e.group === 'actions' && canShow(e),
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('gestionnaire.cmdk.title')}
      description={t('gestionnaire.cmdk.description')}
    >
      <CommandInput placeholder={t('gestionnaire.cmdk.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('gestionnaire.cmdk.empty')}</CommandEmpty>

        <CommandGroup heading={t('gestionnaire.cmdk.actionsHeading')}>
          {actionEntries.map((entry) => (
            <CommandItem
              key={entry.key}
              value={`${entry.label} ${entry.hint ?? ''}`}
              onSelect={() => runEntry(entry)}
            >
              <entry.icon className="size-4 text-[var(--primary)]" />
              <span>{entry.label}</span>
              {entry.shortcut && (
                <CommandShortcut>{entry.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('gestionnaire.cmdk.navHeading')}>
          {navEntries.map((entry) => (
            <CommandItem
              key={entry.key}
              value={`${entry.label} ${entry.hint ?? ''}`}
              onSelect={() => runEntry(entry)}
            >
              <entry.icon className="size-4 text-muted-foreground" />
              <div className="flex flex-1 items-center justify-between gap-2">
                <span>{entry.label}</span>
                {entry.hint && (
                  <span className="text-xs text-muted-foreground">
                    {entry.hint}
                  </span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
