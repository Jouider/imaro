import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MediaGallery } from '@/components/shared'
import { toggleAnnonceLike, type Annonce } from '@/services/portail.service'
import { cn } from '@/lib/utils'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Carte annonce façon « post » pour le portail résident (KAN-96) :
 * médias en haut, titre + contenu en dessous, et un bouton « j'aime ».
 * Le like est optimiste : on met à jour le cache ['portail-annonces']
 * immédiatement et on restaure en cas d'échec.
 */
export function AnnoncePostCard({ annonce }: { annonce: Annonce }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const isUrgente = annonce.priorite === 'urgente'
  const liked = annonce.liked ?? false
  const likesCount = annonce.likes_count ?? 0

  const likeMutation = useMutation({
    mutationFn: () => toggleAnnonceLike(annonce.id, !liked),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['portail-annonces'] })
      const previous = queryClient.getQueryData<Annonce[]>(['portail-annonces'])
      queryClient.setQueryData<Annonce[]>(['portail-annonces'], (old) =>
        (old ?? []).map((a) =>
          a.id === annonce.id
            ? {
                ...a,
                liked: !liked,
                likes_count: Math.max(0, likesCount + (liked ? -1 : 1)),
              }
            : a,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(['portail-annonces'], ctx.previous)
      toast.error(
        t('portail.home.likeError', { defaultValue: 'Action impossible' }),
      )
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Annonce[]>(['portail-annonces'], (old) =>
        (old ?? []).map((a) =>
          a.id === annonce.id
            ? { ...a, liked: data.liked, likes_count: data.likes_count }
            : a,
        ),
      )
    },
  })

  return (
    <Card
      className={cn(
        'overflow-hidden p-0',
        isUrgente && 'border-l-4 border-l-[var(--color-imaro-accent)]',
      )}
    >
      {/* Médias en haut, façon post */}
      {annonce.media && annonce.media.length > 0 && (
        <MediaGallery media={annonce.media} className="gap-px rounded-none" />
      )}

      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold leading-snug">
            {annonce.titre}
          </p>
          {isUrgente && (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {t('portail.home.urgent', { defaultValue: 'Urgent' })}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {formatDate(annonce.date)}
        </p>

        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {annonce.contenu}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => likeMutation.mutate()}
            aria-pressed={liked}
            aria-label={t(liked ? 'portail.home.unlike' : 'portail.home.like', {
              defaultValue: liked ? "Je n'aime plus" : "J'aime",
            })}
            className={cn(
              'flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors active:scale-95',
              liked
                ? 'text-[var(--color-imaro-danger)]'
                : 'text-muted-foreground hover:text-[var(--color-imaro-danger)]',
            )}
          >
            <Heart
              className={cn('size-5', liked && 'fill-current')}
              aria-hidden="true"
            />
            {likesCount > 0 && (
              <span className="tabular-nums">{likesCount}</span>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
