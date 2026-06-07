import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ScanLine,
  UserPlus,
  CheckCircle2,
  XCircle,
  LogOut,
  Users,
  ArrowRight,
  Building2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { QrScanner } from '@/components/shared/QrScanner'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'
import {
  getActiveVisites,
  scanVisite,
  type ScanResult,
} from '@/services/visites.service'
import { cn } from '@/lib/utils'
import { WalkInDialog } from './WalkInDialog'
import { ManualTokenDialog } from './ManualTokenDialog'

type ViewState =
  | { kind: 'home' }
  | { kind: 'scan' }
  | { kind: 'walk-in' }
  | { kind: 'manual' }
  | { kind: 'result'; result: ScanResult }

const sinceFmt = new Intl.RelativeTimeFormat('fr-MA', { numeric: 'auto' })

function relativeSince(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 60) return sinceFmt.format(-diffMin, 'minute')
  const diffH = Math.round(diffMin / 60)
  return sinceFmt.format(-diffH, 'hour')
}

export function GardienPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, clear } = useAuthStore()
  const [view, setView] = useState<ViewState>({ kind: 'home' })

  const activeQ = useQuery({
    queryKey: ['gardien-active'],
    queryFn: () => getActiveVisites(),
    refetchInterval: 30_000,
  })
  const active = activeQ.data ?? []

  const scanMut = useMutation({
    mutationFn: (token: string) => scanVisite(extractToken(token)),
    onSuccess: (res) => {
      setView({ kind: 'result', result: res })
      void qc.invalidateQueries({ queryKey: ['gardien-active'] })
    },
    onError: () => {
      setView({
        kind: 'result',
        result: {
          visit: {
            id: 0,
            residence_id: 0,
            qr_token: '',
            visitor_name: '—',
            visitor_phone: '',
            type: 'visitor',
            status: 'expired',
            created_by_name: '',
            created_at: '',
          },
          action: 'rejected',
          reason: 'network',
        },
      })
    },
  })

  const logoutMut = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      setStoredToken(null)
      clear()
      void navigate('/login', { replace: true })
    },
  })

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          'linear-gradient(160deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark, #154360) 100%)',
      }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between p-4">
        <Wordmark inverted className="h-9 w-32" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => logoutMut.mutate()}
            aria-label={t('gardien.logout')}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 pb-10">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-display text-3xl">{t('gardien.title')}</h1>
          <p className="mt-1 text-xs text-white/70">{t('gardien.subtitle')}</p>
        </div>

        {/* User card */}
        {user && (
          <div className="rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-white/60">{user.phone}</p>
          </div>
        )}

        {/* Main views */}
        {view.kind === 'home' && (
          <>
            {/* Big actions */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="h-20 w-full justify-start gap-4 bg-white text-[var(--color-imaro-primary)] shadow-xl hover:bg-white/95"
                onClick={() => setView({ kind: 'scan' })}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-imaro-primary)]/10">
                  <ScanLine className="size-7" />
                </div>
                <div className="flex flex-1 flex-col items-start">
                  <span className="text-base font-semibold">
                    {t('gardien.scanAction')}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {t('gardien.hint')}
                  </span>
                </div>
                <ArrowRight className="size-5 opacity-50" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-16 w-full justify-start gap-4 border-white/30 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white"
                onClick={() => setView({ kind: 'walk-in' })}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <UserPlus className="size-5" />
                </div>
                <span className="text-sm font-semibold">
                  {t('gardien.walkInAction')}
                </span>
              </Button>
            </div>

            {/* Active list */}
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                  <Users className="size-3.5" />
                  {t('gardien.activeListTitle')}
                </h2>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/10 text-[10px] text-white"
                >
                  {active.length === 0
                    ? t('gardien.activeCountZero')
                    : t('gardien.activeCount', { n: active.length })}
                </Badge>
              </div>
              {activeQ.isLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-white/10" />
              ) : active.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 p-6 text-center text-xs text-white/60">
                  {t('gardien.activeCountZero')}
                </div>
              ) : (
                <div className="space-y-2">
                  {active.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => scanMut.mutate(v.qr_token)}
                      disabled={scanMut.isPending}
                      className="flex w-full items-center gap-3 rounded-xl bg-white/95 px-3 py-2.5 text-left text-foreground shadow-sm transition-transform active:scale-[0.98]"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Building2 className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {v.visitor_name}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="size-3" />
                          {v.arrived_at ? relativeSince(v.arrived_at) : '—'}
                          {v.host_lot_numero && (
                            <span className="ms-auto rounded-md bg-muted px-1.5 py-0.5 font-mono">
                              Lot {v.host_lot_numero}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        {t('gardien.scanResult.manualCheckOut')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {view.kind === 'scan' && (
          <div className="space-y-3">
            <QrScanner
              onDecode={(text) => {
                if (scanMut.isPending) return
                scanMut.mutate(text)
              }}
              onManualEntry={() => setView({ kind: 'manual' })}
              paused={scanMut.isPending}
            />
            <Button
              variant="outline"
              className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setView({ kind: 'home' })}
            >
              {t('gardien.scanner.cancelScan')}
            </Button>
          </div>
        )}

        {view.kind === 'result' && (
          <ResultPanel
            result={view.result}
            onNewScan={() => setView({ kind: 'scan' })}
            onHome={() => setView({ kind: 'home' })}
          />
        )}
      </main>

      {/* Modals */}
      <WalkInDialog
        open={view.kind === 'walk-in'}
        onOpenChange={(v) => !v && setView({ kind: 'home' })}
        onCreated={(visit) => {
          toast.success(
            t('gardien.walkIn.success', { name: visit.visitor_name }),
          )
          void qc.invalidateQueries({ queryKey: ['gardien-active'] })
          setView({ kind: 'home' })
        }}
      />

      <ManualTokenDialog
        open={view.kind === 'manual'}
        onOpenChange={(v) => !v && setView({ kind: 'scan' })}
        onSubmit={(tok) => scanMut.mutate(tok)}
      />
    </div>
  )
}

// ─── Result panel ──────────────────────────────────────────────────────────

function ResultPanel({
  result,
  onNewScan,
  onHome,
}: {
  result: ScanResult
  onNewScan: () => void
  onHome: () => void
}) {
  const { t } = useTranslation()
  const isRejected = result.action === 'rejected'
  const Icon = isRejected ? XCircle : CheckCircle2

  const tone = isRejected
    ? 'from-red-500 to-red-700'
    : result.action === 'check_out'
      ? 'from-slate-500 to-slate-700'
      : 'from-emerald-500 to-emerald-700'

  const titleKey = isRejected
    ? 'gardien.scanResult.rejectedTitle'
    : result.action === 'check_out'
      ? 'gardien.scanResult.checkOutTitle'
      : 'gardien.scanResult.checkInTitle'

  return (
    <div className="rounded-2xl bg-white/95 p-5 text-foreground shadow-2xl dark:bg-card">
      <div
        className={cn(
          'mx-auto -mt-12 mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg',
          tone,
        )}
      >
        <Icon className="size-8" />
      </div>
      <h2 className="text-center font-display text-2xl">{t(titleKey)}</h2>

      {!isRejected && (
        <div className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-3">
          <p className="text-center text-base font-semibold">
            {result.visit.visitor_name}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {result.visit.visitor_phone}
          </p>
          {result.visit.host_name && (
            <p className="text-center text-xs">
              → {result.visit.host_name}
              {result.visit.host_lot_numero && (
                <span className="ms-1 text-muted-foreground">
                  (Lot {result.visit.host_lot_numero})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {isRejected && result.reason && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {result.reason}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onNewScan} className="flex-1 gap-1.5">
          <ScanLine className="size-4" />
          {t('gardien.scanResult.newScan')}
        </Button>
        <Button onClick={onHome} variant="outline" className="flex-1">
          {t('actions.close')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Accept either a raw token (`vst_xxx`) OR the full `/v/<token>` URL the QR
 * encodes. Strip down to just the token segment.
 */
function extractToken(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/v\/([\w-]+)$/)
  return match?.[1] ?? trimmed
}
