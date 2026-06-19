import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ImagePlus, Play, X } from 'lucide-react'
import {
  MAX_MEDIA,
  MEDIA_ACCEPT,
  isVideoFile,
  validateMediaFile,
} from '@/lib/annonce-media'
import { cn } from '@/lib/utils'

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

/**
 * Sélecteur de médias pour le formulaire d'annonce (KAN-96) : photos + vidéos,
 * validation type/taille côté client, aperçus avec bouton retirer, max 6.
 */
export function AnnonceMediaPicker({ files, onChange, disabled }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  // Object URLs for previews, recomputed when the file list changes.
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        video: isVideoFile(file),
      })),
    [files],
  )

  // Revoke the previous batch of object URLs when files change / on unmount.
  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url)
    }
  }, [previews])

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same file
    if (!picked.length) return

    const accepted: File[] = []
    for (const file of picked) {
      const err = validateMediaFile(file)
      if (err) {
        toast.error(
          t(`gestionnaire.annonces.media.${err}`, { name: file.name }),
        )
        continue
      }
      accepted.push(file)
    }

    const room = MAX_MEDIA - files.length
    if (accepted.length > room) {
      toast.error(t('gestionnaire.annonces.media.maxReached', { n: MAX_MEDIA }))
    }
    const next = [...files, ...accepted.slice(0, Math.max(room, 0))]
    onChange(next)
  }

  function remove(file: File) {
    onChange(files.filter((f) => f !== file))
  }

  const full = files.length >= MAX_MEDIA

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={handleSelect}
        disabled={disabled}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {previews.map(({ file, url, video }, i) => (
          <div
            key={`${file.name}-${i}`}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            {video ? (
              <>
                <video
                  src={url}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="size-5 text-white" />
                </span>
              </>
            ) : (
              <img src={url} alt="" className="size-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => remove(file)}
              disabled={disabled}
              aria-label={t('gestionnaire.annonces.media.remove')}
              className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors',
              'hover:border-[var(--color-imaro-primary)]/50 hover:text-[var(--color-imaro-primary)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-[11px]">
              {t('gestionnaire.annonces.media.add')}
            </span>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t('gestionnaire.annonces.media.hint', { n: MAX_MEDIA })}
      </p>
    </div>
  )
}
