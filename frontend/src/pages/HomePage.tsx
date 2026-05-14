import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-[var(--primary)]/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button asChild size="sm">
              <Link to="/login">{t('nav.login')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('home.subtitle')}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"
            >
              <Link to="/login">{t('home.ctaLogin')}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <Building2 className="size-5 text-[var(--primary)]" />
              <CardTitle className="mt-2 text-base">
                {t('home.cards.residences.title')}
              </CardTitle>
              <CardDescription>
                {t('home.cards.residences.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
          <Card>
            <CardHeader>
              <Wallet className="size-5 text-[var(--accent)]" />
              <CardTitle className="mt-2 text-base">
                {t('home.cards.appelsFonds.title')}
              </CardTitle>
              <CardDescription>
                {t('home.cards.appelsFonds.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="size-5 text-[var(--primary)]" />
              <CardTitle className="mt-2 text-base">
                {t('home.cards.loi.title')}
              </CardTitle>
              <CardDescription>{t('home.cards.loi.desc')}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      </main>
    </div>
  )
}
