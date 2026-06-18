import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, RefreshCw, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  /** Called when the user accepts the photo. Receives a JPEG data URL. */
  onCapture: (dataUrl: string) => void
  /** Called when the user skips photo capture. */
  onSkip: () => void
  /** Called when the user cancels and closes the capture flow. */
  onCancel?: () => void
  className?: string
}

/**
 * Mobile-first selfie/visitor photo capture. Uses `getUserMedia` with the
 * front-facing camera by default (gardien holds the tablet toward the
 * visitor). Outputs a compressed JPEG data URL ready for upload.
 */
export function PhotoCapture({
  onCapture,
  onSkip,
  onCancel,
  className,
}: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<'starting' | 'ready' | 'denied'>(
    'starting',
  )
  const [snapshot, setSnapshot] = useState<string | null>(null)

  // ── Camera lifecycle ──
  useEffect(() => {
    if (snapshot) return // pause while previewing snapshot
    let active = true
    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: 640, height: 640 },
        audio: false,
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          void v.play()
        }
        setState('ready')
      })
      .catch(() => setState('denied'))
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
  }, [snapshot])

  // ── Capture ──
  const snap = () => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, c.width, c.height)
    setSnapshot(c.toDataURL('image/jpeg', 0.82))
  }

  const confirm = () => {
    if (snapshot) onCapture(snapshot)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative overflow-hidden rounded-2xl bg-black/90">
        {snapshot ? (
          <img
            src={snapshot}
            alt="snapshot"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            className={cn(
              'aspect-square w-full object-cover',
              state !== 'ready' && 'opacity-0',
            )}
            muted
            playsInline
          />
        )}

        {state === 'starting' && !snapshot && (
          <Overlay>
            <RefreshCw className="size-8 animate-spin" />
            <p className="mt-2 text-sm">{t('gardien.photo.starting')}</p>
          </Overlay>
        )}
        {state === 'denied' && !snapshot && (
          <Overlay>
            <Camera className="size-10" />
            <p className="mt-2 max-w-xs text-center text-sm">
              {t('gardien.photo.permissionDenied')}
            </p>
          </Overlay>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap gap-2">
        {snapshot ? (
          <>
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => setSnapshot(null)}
            >
              <RefreshCw className="size-4" />
              {t('gardien.photo.retake')}
            </Button>
            <Button className="flex-1 gap-1.5" onClick={confirm}>
              <Check className="size-4" />
              {t('gardien.photo.confirm')}
            </Button>
          </>
        ) : (
          <>
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                aria-label={t('actions.cancel')}
              >
                <X className="size-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onSkip}>
              {t('gardien.photo.skip')}
            </Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={state !== 'ready'}
              onClick={snap}
            >
              <Camera className="size-4" />
              {t('gardien.photo.capture')}
            </Button>
          </>
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
