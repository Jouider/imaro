import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

/** Shared full-screen fallback shown when something crashes (i18n FR/AR/EN). */
function AppErrorFallback() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-imaro-surface)] px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-imaro-danger)]/10 text-[var(--color-imaro-danger)]">
        <AlertTriangle className="size-8" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl tracking-tight text-[var(--color-imaro-primary)]">
        {t('errors.title', { defaultValue: 'Une erreur est survenue' })}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t('errors.message', {
          defaultValue:
            "Quelque chose s'est mal passé. Réessayez en rechargeant la page.",
        })}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 min-h-[44px] rounded-xl bg-[var(--color-imaro-primary)] px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
      >
        {t('errors.reload', { defaultValue: 'Recharger' })}
      </button>
    </div>
  )
}

/**
 * React Router `errorElement` — catches errors thrown while rendering a route
 * element or its loader, so a page crash shows a recovery screen, not a blank
 * page. (Data routers handle route errors here, not in a parent class boundary.)
 */
export function RouteErrorBoundary() {
  const error = useRouteError()
  console.error('[RouteError]', error)
  return <AppErrorFallback />
}

/**
 * Class error boundary for render errors outside the router tree (providers,
 * App shell). Belt-and-suspenders alongside {@link RouteErrorBoundary}.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) return <AppErrorFallback />
    return this.props.children
  }
}
