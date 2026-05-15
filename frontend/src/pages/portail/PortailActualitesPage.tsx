import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarDays, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAnnonces, getAssembleesPortail, type Annonce, type AssembleePortail } from '@/services/portail.service'
import { cn } from '@/lib/utils'

type Tab = 'annonces' | 'assemblees'

const STATUT_STYLES: Record<string, string> = {
  convoquee: 'bg-blue-100 text-blue-800',
  tenue: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-700',
}

export function PortailActualitesPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('annonces')

  const { data: annonces = [], isLoading: loadingAnnonces } = useQuery({
    queryKey: ['portail-annonces'],
    queryFn: getAnnonces,
  })

  const { data: assemblees = [], isLoading: loadingAssemblees } = useQuery({
    queryKey: ['portail-assemblees'],
    queryFn: getAssembleesPortail,
  })

  const publishedAnnonces = annonces.filter((a) => !('statut' in a) || (a as { statut?: string }).statut !== 'brouillon')

  const upcoming = assemblees.filter((a) => new Date(a.date) >= new Date() && a.statut !== 'annulee')
  const past = assemblees.filter((a) => new Date(a.date) < new Date() || a.statut === 'tenue')

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
        {t('portail.actualites.title')}
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <TabBtn active={activeTab === 'annonces'} onClick={() => setActiveTab('annonces')}>
          <Bell className="size-4" />
          {t('portail.actualites.tabAnnonces')}
          {publishedAnnonces.length > 0 && (
            <span className={cn(
              'ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              activeTab === 'annonces' ? 'bg-white/30' : 'bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]',
            )}>
              {publishedAnnonces.length}
            </span>
          )}
        </TabBtn>
        <TabBtn active={activeTab === 'assemblees'} onClick={() => setActiveTab('assemblees')}>
          <CalendarDays className="size-4" />
          {t('portail.actualites.tabAssemblees')}
          {upcoming.length > 0 && (
            <span className={cn(
              'ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              activeTab === 'assemblees' ? 'bg-white/30' : 'bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]',
            )}>
              {upcoming.length}
            </span>
          )}
        </TabBtn>
      </div>

      {/* Content */}
      {activeTab === 'annonces' ? (
        <AnnoncesTab annonces={publishedAnnonces} isLoading={loadingAnnonces} t={t} />
      ) : (
        <AssembleesTab upcoming={upcoming} past={past} isLoading={loadingAssemblees} t={t} />
      )}
    </div>
  )
}

// ─── TabBtn ───────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--color-imaro-primary)] text-white shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

// ─── AnnoncesTab ─────────────────────────────────────────────────────────────

function AnnoncesTab({
  annonces,
  isLoading,
  t,
}: {
  annonces: Annonce[]
  isLoading: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
      </div>
    )
  }

  if (annonces.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Bell className="size-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('portail.actualites.noAnnonces')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {annonces.map((a) => {
        const isUrgente = a.priorite === 'urgente'
        const isExpanded = expandedId === a.id
        const dateStr = new Date(a.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'long', year: 'numeric',
        })

        return (
          <div
            key={a.id}
            className={cn(
              'rounded-xl border bg-card overflow-hidden transition-shadow',
              isUrgente && 'border-l-4 border-l-red-400',
              isExpanded && 'shadow-sm',
            )}
          >
            <button
              className="w-full p-4 text-left"
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {isUrgente && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t('portail.actualites.urgente')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{dateStr}</span>
                  </div>
                  <p className="font-semibold text-sm leading-snug">{a.titre}</p>
                  {!isExpanded && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.contenu}</p>
                  )}
                </div>
                <span className="shrink-0 text-muted-foreground mt-0.5">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3">
                <p className="text-sm leading-relaxed whitespace-pre-line">{a.contenu}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── AssembleesTab ────────────────────────────────────────────────────────────

function AssembleesTab({
  upcoming,
  past,
  isLoading,
  t,
}: {
  upcoming: AssembleePortail[]
  past: AssembleePortail[]
  isLoading: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
      </div>
    )
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <CalendarDays className="size-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('portail.actualites.noAssemblees')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-imaro-primary)] uppercase tracking-wide">
            À venir
          </h2>
          {upcoming.map((ag) => (
            <AGCard key={ag.id} ag={ag} expanded={expandedId === ag.id} onToggle={() => setExpandedId(expandedId === ag.id ? null : ag.id)} t={t} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Passées
          </h2>
          {past.map((ag) => (
            <AGCard key={ag.id} ag={ag} expanded={expandedId === ag.id} onToggle={() => setExpandedId(expandedId === ag.id ? null : ag.id)} t={t} />
          ))}
        </section>
      )}
    </div>
  )
}

// ─── AGCard ───────────────────────────────────────────────────────────────────

function AGCard({
  ag,
  expanded,
  onToggle,
  t,
}: {
  ag: AssembleePortail
  expanded: boolean
  onToggle: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const statutCls = STATUT_STYLES[ag.statut] ?? 'bg-gray-100 text-gray-600'
  const statutLabel = t(`portail.actualites.${ag.statut}`, { defaultValue: ag.statut })
  const typeLabel = t(`portail.actualites.${ag.type}`, { defaultValue: ag.type })

  const dateObj = new Date(ag.date)
  const dateStr = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const isUpcoming = dateObj >= new Date() && ag.statut !== 'annulee'

  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden',
      isUpcoming && 'border-[var(--color-imaro-primary)]/30',
    )}>
      <button className="w-full p-4 text-left" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge className={cn(statutCls, 'border-0 text-xs')}>
                {statutLabel}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">{typeLabel}</span>
            </div>
            <p className="font-semibold text-sm leading-snug">{ag.titre}</p>
            <div className="mt-1.5 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3 shrink-0" />
                <span className="capitalize">{dateStr} à {timeStr}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                {ag.lieu}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-muted-foreground mt-0.5">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* Quorum */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
            <Users className="size-4 shrink-0 text-muted-foreground" />
            <div className="text-xs">
              <p className="font-medium">{t('portail.actualites.quorum', { n: ag.quorum_requis })}</p>
              <p className="text-muted-foreground">
                {ag.participants_count !== null
                  ? t('portail.actualites.participants', { n: ag.participants_count })
                  : t('portail.actualites.agNonTenue')}
              </p>
            </div>
          </div>

          {/* Ordre du jour */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              {t('portail.actualites.ordreDuJour')}
            </p>
            <div className="space-y-1">
              {ag.ordre_du_jour.split('\n').map((line, i) => (
                <p key={i} className="text-sm leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
