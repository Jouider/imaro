import { type ReactNode } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type Breadcrumb = {
  label: string
  href?: string
}

type Props = {
  /** Fil d'Ariane. Le dernier élément est la page courante (sans href). */
  breadcrumbs?: Breadcrumb[]
  /** Titre H1 de la page */
  title: string
  /** Sous-titre optionnel */
  subtitle?: string
  /** Boutons d'actions (ex: <Button>Nouveau</Button>) */
  actions?: ReactNode
  className?: string
}

/**
 * En-tête de page standard : breadcrumb + titre + slot actions.
 *
 * @example
 * <PageHeader
 *   breadcrumbs={[{ label: 'Copropriétés', href: '/residences' }]}
 *   title="Résidence Blanca"
 *   subtitle="48 lots · 3 bâtiments"
 *   actions={<Button>Modifier</Button>}
 * />
 */
export function PageHeader({
  breadcrumbs,
  title,
  subtitle,
  actions,
  className,
}: Props) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            to="/gestionnaire/dashboard"
            className="hover:text-[var(--primary)]"
          >
            <Home className="size-3.5" />
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="size-3.5" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-[var(--primary)]">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight tracking-tight text-[var(--primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
