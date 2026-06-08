import { useEffect, useRef, useState } from 'react'
import QrScannerLib from 'qr-scanner'
import { useTranslation } from 'react-i18next'
import { Camera, CameraOff, Keyboard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  /** Called with the decoded text whenever a QR is read. */
  onDecode: (text: string) => void
  /** Called when the user requests manual entry instead. */
  onManualEntry?: () => void
  /** Pause scanning after a successful read (useful between scans). */
  paused?: boolean
  className?: string
}

/**
 * Live webcam QR scanner.
 *
 * Wraps `qr-scanner` (Nimiq, ~14 kB) — handles camera permissions, multi-camera
 * switching, and decoding. We extract a single token per `onDecode` call so the
 * parent can pause / resume between scans.
 */
export function QrScanner({
  onDecode,
  onManualEntry,
  paused = false,
  className,
}: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScannerLib | null>(null)
  const [state, setState] = useState<
    'idle' | 'starting' | 'ready' | 'denied' | 'no-camera'
  >('idle')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [facingFront, setFacingFront] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setState('starting')

    const scanner = new QrScannerLib(
      video,
      (result) => {
        if (paused) return
        onDecode(result.data)
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: facingFront ? 'user' : 'environment',
        maxScansPerSecond: 4,
      },
    )
    scannerRef.current = scanner

    scanner
      .start()
      .then(async () => {
        setState('ready')
        const cams = await QrScannerLib.listCameras(true).catch(() => [])
        setHasMultipleCameras(cams.length > 1)
      })
      .catch((err: unknown) => {
        const msg = String(err)
        if (
          /permission|NotAllowed|denied/i.test(msg) ||
          /SecurityError/i.test(msg)
        ) {
          setState('denied')
        } else {
          setState('no-camera')
        }
      })

    return () => {
      scanner.stop()
      scanner.destroy()
      scannerRef.current = null
    }
  }, [facingFront, onDecode, paused])

  // ── Manual permission re-request (after a deny we can't auto-retry) ──
  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      // Force a fresh init cycle
      setState('starting')
      setFacingFront((v) => v) // no-op state poke
      window.location.reload()
    } catch {
      // still denied; nothing to do
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-black/90',
        className,
      )}
    >
      {/* Video element — always mounted so the ref is available */}
      <video
        ref={videoRef}
        className={cn(
          'aspect-square w-full object-cover',
          state !== 'ready' && 'opacity-0',
        )}
        muted
        playsInline
      />

      {/* Frame overlay */}
      {state === 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="aspect-square w-3/4 rounded-2xl border-2 border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {/* Status overlays */}
      {state === 'starting' && (
        <Overlay>
          <RefreshCw className="size-8 animate-spin" />
          <p className="mt-2 text-sm font-medium">
            {t('gardien.scanner.starting')}
          </p>
        </Overlay>
      )}

      {state === 'denied' && (
        <Overlay>
          <CameraOff className="size-10" />
          <p className="mt-3 text-base font-semibold">
            {t('gardien.scanner.permissionNeeded')}
          </p>
          <p className="mb-4 mt-1 max-w-xs text-center text-xs text-white/70">
            {t('gardien.scanner.permissionDesc')}
          </p>
          <Button
            variant="outline"
            className="bg-white text-black hover:bg-white/90"
            onClick={() => void requestPermission()}
          >
            <Camera className="me-2 size-4" />
            {t('gardien.scanner.permissionAllow')}
          </Button>
        </Overlay>
      )}

      {state === 'no-camera' && (
        <Overlay>
          <CameraOff className="size-10" />
          <p className="mt-3 text-sm font-medium">
            {t('gardien.scanner.noCamera')}
          </p>
        </Overlay>
      )}

      {/* Bottom action bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
        {onManualEntry ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
            onClick={onManualEntry}
          >
            <Keyboard className="size-4" />
            {t('gardien.scanner.manualEntry')}
          </Button>
        ) : (
          <span />
        )}
        {hasMultipleCameras && state === 'ready' && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setFacingFront((v) => !v)}
          >
            <RefreshCw className="size-4" />
            {t('gardien.scanner.switchCamera')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-white">
      {children}
    </div>
  )
}
