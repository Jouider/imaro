import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActionVariant = 'primary' | 'secondary' | 'outline' | 'destructive'

type Action = {
  label: string
  onClick: () => void
  variant?: ActionVariant
  icon?: ReactNode
}

type Props = {
  /** Icône lucide-react (size-12 recommandée) */
  icon: ReactNode
  /** Titre de l'état vide */
  title: string
  /** Description optionnelle */
  description?: string
  /** CTA principal */
  primaryAction?: Action
  /** CTA secondaire (lien) */
  secondaryAction?: Action
  /** @deprecated Use primaryAction */
  actionLabel?: string
  /** @deprecated Use primaryAction */
  onAction?: () => void
  className?: string
}

function actionClassName(variant: ActionVariant = 'primary') {
  switch (variant) {
    case 'primary':
      return 'bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]'
    case 'secondary':
      return 'bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]'
    case 'outline':
      return 'border border-[var(--primary)] bg-transparent text-[var(--primary)] hover:bg-[var(--color-imaro-primary-tint)]'
    case 'destructive':
      return 'bg-[var(--destructive)] text-white hover:bg-red-700'
  }
}

/**
 * État vide pour tables et listes.
 * Toujours afficher un message utile + CTA si possible.
 *
 * @example
 * <EmptyState
 *   icon={<FileText className="size-12" />}
 *   title="Aucune quittance"
 *   description="Les quittances apparaîtront ici une fois générées."
 *   primaryAction={{ label: 'Générer', onClick: () => setOpen(true) }}
 *   secondaryAction={{ label: 'En savoir plus', onClick: () => {}, variant: 'outline' }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  actionLabel,
  onAction,
  className,
}: Props) {
  // Backwards compat: actionLabel + onAction map to primaryAction
  const primary =
    primaryAction ??
    (actionLabel && onAction
      ? { label: actionLabel, onClick: onAction, variant: 'primary' as const }
      : undefined)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-imaro-primary)]/15 bg-[var(--color-imaro-primary-tint)]/40 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 text-[var(--primary)]/40">{icon}</div>
      <h3 className="text-base font-semibold text-[var(--primary)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(primary || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {primary && (
            <Button
              className={actionClassName(primary.variant)}
              onClick={primary.onClick}
            >
              {primary.icon}
              {primary.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              className={actionClassName(secondaryAction.variant ?? 'outline')}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
