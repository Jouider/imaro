import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ScanLine,
  UserPlus,
  CheckCircle2,
  LogOut,
  Users,
  ArrowRight,
  Download,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { QrScanner } from '@/components/shared/QrScanner'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'
import { useInstallPromptGardien } from '@/hooks/useInstallPromptGardien'
import {
  getPersonnelVisites,
  scanPersonnelVisite,
  uploadVisitePhoto,
  type PersonnelScanResult,
} from '@/services/visites.service'
import { cn } from '@/lib/utils'
import { WalkInDialog } from './WalkInDialog'
import { ManualTokenDialog } from './ManualTokenDialog'

type ViewState =
  | { kind: 'home' }
  | { kind: 'scan' }
  | { kind: 'walk-in' }
  | { kind: 'manual' }
  | { kind: 'photo'; result: PersonnelScanResult }
  | { kind: 'result'; result: PersonnelScanResult }

export function GardienPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, clear } = useAuthStore()
  const [view, setView] = useState<ViewState>({ kind: 'home' })

  const activeQ = useQuery({
    queryKey: ['gardien-expected'],
    queryFn: () => getPersonnelVisites(),
    refetchInterval: 30_000,
  })
  const active = activeQ.data ?? []

  const install = useInstallPromptGardien()

  const photoUploadMut = useMutation({
    mutationFn: ({ id, dataUrl }: { id: number; dataUrl: string }) =>
      uploadVisitePhoto(id, dataUrl),
    onSuccess: () => {
      toast.success(t('gardien.photo.uploaded'))
    },
  })

  const scanMut = useMutation({
    mutationFn: (token: string) => scanPersonnelVisite(extractToken(token)),
    onSuccess: (res) => {
      setView({ kind: 'photo', result: res })
      void qc.invalidateQueries({ queryKey: ['gardien-expected'] })
    },
    onError: (err) => {
      const status = (err as { response?: { status: number } }).response?.status
      if (status === 404) {
        toast.error(t('gardien.scanResult.unknownToken'))
      } else if (status === 409) {
        toast.warning(t('gardien.scanResult.alreadyScanned'))
      } else {
        toast.error(t('common.networkError'))
      }
      setView({ kind: 'scan' })
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
                    <div
                      key={v.visite_id}
                      className="flex w-full items-center gap-3 rounded-xl bg-white/95 px-3 py-2.5 text-foreground shadow-sm"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]">
                        <Users className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {v.resident_nom}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {v.motif}
                          <span className="ms-auto rounded-md bg-muted px-1.5 py-0.5 font-mono">
                            Lot {v.lot}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          v.statut === 'attendu'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700',
                        )}
                      >
                        {v.statut === 'attendu'
                          ? t('gardien.scanResult.attendu')
                          : t('gardien.scanResult.nonAttendu')}
                      </span>
                    </div>
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

        {view.kind === 'photo' && (
          <div className="rounded-2xl bg-white/95 p-5 text-foreground shadow-2xl dark:bg-card">
            <div className="mb-3 text-center">
              <h2 className="font-display text-xl">
                {t('gardien.photo.title')}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('gardien.photo.desc')}
              </p>
              <p className="mt-2 text-sm font-semibold">
                → Lot {view.result.lot} · {view.result.resident_nom}
              </p>
            </div>
            <PhotoCapture
              onCapture={(dataUrl) => {
                photoUploadMut.mutate({
                  id: view.result.visite_id,
                  dataUrl,
                })
                setView({ kind: 'result', result: view.result })
              }}
              onSkip={() => {
                toast.info(t('gardien.photo.skipped'))
                setView({ kind: 'result', result: view.result })
              }}
              onCancel={() => setView({ kind: 'home' })}
            />
          </div>
        )}

        {view.kind === 'result' && (
          <ResultPanel
            result={view.result}
            onNewScan={() => setView({ kind: 'scan' })}
            onHome={() => setView({ kind: 'home' })}
          />
        )}

        {/* Install banner — only on Chrome/Edge/Samsung where the
            beforeinstallprompt event fired, only on the home view. */}
        {install.available && view.kind === 'home' && (
          <div className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Camera className="size-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-white">
                {t('gardien.install.title')}
              </p>
              <p className="mt-0.5 text-white/70">
                {t('gardien.install.desc')}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-white text-[var(--color-imaro-primary)] hover:bg-white/90"
                  onClick={() => void install.promptInstall()}
                >
                  <Download className="size-3.5" />
                  {t('gardien.install.install')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={install.dismiss}
                >
                  {t('gardien.install.later')}
                </Button>
              </div>
            </div>
          </div>
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
  result: PersonnelScanResult
  onNewScan: () => void
  onHome: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl bg-white/95 p-5 text-foreground shadow-2xl dark:bg-card">
      <div className="mx-auto -mt-12 mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
        <CheckCircle2 className="size-8" />
      </div>
      <h2 className="text-center font-display text-2xl">
        {t('gardien.scanResult.checkInTitle')}
      </h2>

      <div className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{result.resident_nom}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              result.statut === 'attendu'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-orange-100 text-orange-700',
            )}
          >
            {result.statut === 'attendu'
              ? t('gardien.scanResult.attendu')
              : t('gardien.scanResult.nonAttendu')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono font-medium">Lot {result.lot}</span>
          {result.motif && <span className="ms-2">· {result.motif}</span>}
        </p>
      </div>

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
