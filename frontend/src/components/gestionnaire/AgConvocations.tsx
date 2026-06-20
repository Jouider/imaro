import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import {
  getConvocations,
  generateConvocations,
} from '@/services/convocations.service'
import type { Assemblee } from '@/services/gestionnaire.service'
import { Button } from '@/components/ui/button'

const AG_MIN_DELAY_DAYS = 15

/**
 * Convocations AG (KAN-98) : génération d'une convocation PDF par copropriétaire
 * (Loi 18-00 art. 16quinquies) + « Imprimer tout » (PDF fusionné). Contrat
 * backend proposé dans l'issue #269 — câblé avec `withMock` en attendant.
 */
export function AgConvocations({ ag }: { ag: Assemblee }) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['convocations', ag.id],
    queryFn: () => getConvocations(ag.id),
    // Poll while the backend Job is still rendering the PDFs.
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 2000 : false,
  })

  const generateMut = useMutation({
    mutationFn: () => generateConvocations(ag.id),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['convocations', ag.id] })
      toast.success(
        t('gestionnaire.assemblees.convocations.generated', {
          n: res.count,
        }),
      )
    },
    onError: () => toast.error(t('common.error')),
  })

  // Préavis légal : la convocation doit partir au moins 15 jours avant l'AG.
  // `now` capturé une fois (lazy state) pour rester pur au rendu.
  const [nowMs] = useState(() => Date.now())
  const daysUntil = Math.ceil((new Date(ag.date).getTime() - nowMs) / 86_400_000)
  const delaiTropCourt = daysUntil >= 0 && daysUntil < AG_MIN_DELAY_DAYS

  const convocations = data?.convocations ?? []
  const isPending = data?.status === 'pending'
  const hasConvocations = convocations.length > 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {t('gestionnaire.assemblees.convocations.title')}
        </p>
        {hasConvocations && !isPending && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
          >
            <RefreshCw
              className={`me-1.5 size-3.5 ${generateMut.isPending ? 'animate-spin' : ''}`}
            />
            {t('gestionnaire.assemblees.convocations.regenerate')}
          </Button>
        )}
      </div>

      {/* Préavis warning */}
      {delaiTropCourt && (
        <p className="mb-2 flex items-start gap-1.5 text-xs text-[var(--color-imaro-danger)]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {t('gestionnaire.assemblees.convocations.delaiWarning', {
            n: AG_MIN_DELAY_DAYS,
          })}
        </p>
      )}

      {isLoading || isPending ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t(
            isPending
              ? 'gestionnaire.assemblees.convocations.generating'
              : 'actions.loading',
          )}
        </div>
      ) : hasConvocations ? (
        <div className="space-y-2">
          <div className="divide-y rounded-md border">
            {convocations.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <FileText className="size-4 shrink-0 text-[var(--color-imaro-primary)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.coproprietaire_nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('gestionnaire.assemblees.convocations.lotTantieme', {
                      lot: c.lot,
                      tantieme: c.tantieme,
                    })}
                  </p>
                </div>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t(
                    'gestionnaire.assemblees.convocations.download',
                  )}
                >
                  <Download className="size-4" />
                </a>
              </div>
            ))}
          </div>

          {data?.merged_url && (
            <Button asChild className="w-full" variant="outline">
              <a
                href={data.merged_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="me-1.5 size-4" />
                {t('gestionnaire.assemblees.convocations.printAll')}
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            {t('gestionnaire.assemblees.convocations.empty')}
          </p>
          <Button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
          >
            {generateMut.isPending ? (
              <Loader2 className="me-1.5 size-4 animate-spin" />
            ) : (
              <FileText className="me-1.5 size-4" />
            )}
            {t('gestionnaire.assemblees.convocations.generate')}
          </Button>
        </div>
      )}
    </div>
  )
}
