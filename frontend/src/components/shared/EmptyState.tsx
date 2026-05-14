import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  /** Icône lucide-react (size-12 recommandée) */
  icon: ReactNode
  /** Titre de l'état vide */
  title: string
  /** Description optionnelle */
  description?: string
  /** Texte du bouton CTA */
  actionLabel?: string
  /** Handler du CTA */
  onAction?: () => void
  className?: string
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
 *   actionLabel="Générer"
 *   onAction={() => setOpen(true)}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 text-muted-foreground/50">{icon}</div>
      <h3 className="text-base font-semibold text-[var(--primary)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          className="mt-6 bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
