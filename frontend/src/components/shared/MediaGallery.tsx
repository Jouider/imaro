import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AnnonceMedia } from '@/services/annonces.service'
import { cn } from '@/lib/utils'

type Props = {
  media: AnnonceMedia[]
  className?: string
}

/**
 * Galerie photos + vidéos d'une annonce (KAN-96). Grille de vignettes ;
 * un clic ouvre une lightbox plein écran avec navigation. RTL-safe.
 */
export function MediaGallery({ media, className }: Props) {
  const { t } = useTranslation()
  const [lightbox, setLightbox] = useState<number | null>(null)

  // Close the lightbox on Escape.
  useEffect(() => {
    if (lightbox === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (!media.length) return null

  const open = lightbox !== null
  const current = open ? media[lightbox] : null

  function show(i: number) {
    setLightbox(((i % media.length) + media.length) % media.length)
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-2',
          media.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3',
          className,
        )}
      >
        {media.map((m, i) => (
          <button
            key={`${m.url}-${i}`}
            type="button"
            onClick={() => setLightbox(i)}
            aria-label={t(
              m.type === 'video'
                ? 'common.media.playVideo'
                : 'common.media.viewImage',
            )}
            className={cn(
              'group relative overflow-hidden rounded-lg border bg-muted',
              media.length === 1 ? 'aspect-video' : 'aspect-square',
            )}
          >
            {m.type === 'image' ? (
              <img
                src={m.url}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <>
                <video
                  src={m.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-imaro-primary)]">
                    <Play className="size-5 translate-x-0.5" />
                  </span>
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && current && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label={t('actions.close', { defaultValue: 'Fermer' })}
            onClick={() => setLightbox(null)}
            className="absolute end-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t('actions.previous', {
                  defaultValue: 'Précédent',
                })}
                onClick={(e) => {
                  e.stopPropagation()
                  show(lightbox - 1)
                }}
                className="absolute start-2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="size-6 rtl:rotate-180" />
              </button>
              <button
                type="button"
                aria-label={t('actions.next', { defaultValue: 'Suivant' })}
                onClick={(e) => {
                  e.stopPropagation()
                  show(lightbox + 1)
                }}
                className="absolute end-2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="size-6 rtl:rotate-180" />
              </button>
            </>
          )}

          <div
            className="max-h-[85vh] max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {current.type === 'image' ? (
              <img
                src={current.url}
                alt=""
                className="max-h-[85vh] w-auto rounded-lg object-contain"
              />
            ) : (
              <video
                src={current.url}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] w-auto rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
