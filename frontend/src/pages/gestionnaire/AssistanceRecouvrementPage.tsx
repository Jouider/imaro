import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import {
  LifeBuoy,
  Scale,
  FileText,
  Bell,
  Mail,
  Gavel,
  Landmark,
  CheckCircle2,
  ShieldCheck,
  Crown,
  Send,
  User,
  Phone,
  AtSign,
  Building2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import {
  submitAssistanceRequest,
  buildAssistanceMailto,
  ASSISTANCE_IT_EMAIL,
  type AssistancePlan,
  type AssistanceRequestPayload,
} from '@/services/assistanceRecouvrement.service'

// ─── Static structure (labels come from i18n) ──────────────────────────────────

const LEGAL_STEPS: { key: string; icon: typeof Scale }[] = [
  { key: 'appel', icon: FileText },
  { key: 'relance', icon: Bell },
  { key: 'miseEnDemeure', icon: Mail },
  { key: 'injonction', icon: Gavel },
  { key: 'tribunal', icon: Scale },
  { key: 'execution', icon: Landmark },
]

const PLANS: { id: AssistancePlan; featured: boolean }[] = [
  { id: 'essentiel', featured: false },
  { id: 'complet', featured: true },
  { id: 'sur_mesure', featured: false },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AssistanceRecouvrementPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)

  const [form, setForm] = useState<AssistanceRequestPayload>(() => ({
    contactName: user?.name ?? '',
    contactPhone: user?.phone ?? '',
    contactEmail: '',
    syndicName: tenant?.name ?? '',
    residencesCount: '',
    impayesEstimate: '',
    plan: 'complet',
    message: '',
  }))
  const [result, setResult] = useState<{ reference: string } | null>(null)

  const mutation = useMutation({
    mutationFn: () => submitAssistanceRequest(form),
    onSuccess: (res) => {
      setResult(res)
      toast.success(t('gestionnaire.assistanceRecouvrement.toast.success'))
    },
    onError: () =>
      toast.error(t('gestionnaire.assistanceRecouvrement.toast.error')),
  })

  const mailtoHref = useMemo(
    () =>
      buildAssistanceMailto(
        form,
        t('gestionnaire.assistanceRecouvrement.mailto.subject', {
          syndic: form.syndicName || '—',
        }),
        {
          syndic: t('gestionnaire.assistanceRecouvrement.form.syndicName'),
          contact: t('gestionnaire.assistanceRecouvrement.form.contactName'),
          phone: t('gestionnaire.assistanceRecouvrement.form.contactPhone'),
          email: t('gestionnaire.assistanceRecouvrement.form.contactEmail'),
          residences: t(
            'gestionnaire.assistanceRecouvrement.form.residencesCount',
          ),
          impayes: t(
            'gestionnaire.assistanceRecouvrement.form.impayesEstimate',
          ),
          plan: t('gestionnaire.assistanceRecouvrement.form.plan'),
          planLabel: t(
            `gestionnaire.assistanceRecouvrement.plans.${form.plan}.name`,
          ),
          message: t('gestionnaire.assistanceRecouvrement.form.message'),
        },
      ),
    [form, t],
  )

  const canSubmit =
    !!form.syndicName.trim() &&
    !!form.contactName.trim() &&
    !!form.contactPhone.trim() &&
    !!form.contactEmail.trim() &&
    !mutation.isPending

  function set<K extends keyof AssistanceRequestPayload>(
    key: K,
    value: AssistanceRequestPayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        breadcrumbs={[
          { label: t('gestionnaire.assistanceRecouvrement.breadcrumb') },
        ]}
        title={t('gestionnaire.assistanceRecouvrement.title')}
        subtitle={t('gestionnaire.assistanceRecouvrement.subtitle')}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-imaro-primary)]/15 bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] p-6 text-white shadow-sm sm:p-8">
        <div className="absolute -end-10 -top-10 size-40 rounded-full bg-[#e67e22]/20 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
            <Crown className="size-3.5 text-[#e67e22]" />
            {t('gestionnaire.assistanceRecouvrement.hero.eyebrow')}
          </span>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight sm:text-3xl">
            {t('gestionnaire.assistanceRecouvrement.hero.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t('gestionnaire.assistanceRecouvrement.hero.desc')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="size-3.5 text-[#27ae60]" />
              {t('gestionnaire.assistanceRecouvrement.hero.target1')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Building2 className="size-3.5 text-[#27ae60]" />
              {t('gestionnaire.assistanceRecouvrement.hero.target2')}
            </span>
          </div>
          <a
            href="#demande"
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#e67e22] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
          >
            <LifeBuoy className="size-4" />
            {t('gestionnaire.assistanceRecouvrement.hero.cta')}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </a>
        </div>
      </section>

      {/* ── Legal steps (loi 18-00) ── */}
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-[var(--color-imaro-primary)]" />
          <h3 className="text-lg font-bold text-foreground">
            {t('gestionnaire.assistanceRecouvrement.legal.title')}
          </h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('gestionnaire.assistanceRecouvrement.legal.subtitle')}
        </p>

        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <li
                key={step.key}
                className="group relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-imaro-primary)]/8 text-[var(--color-imaro-primary)]">
                    <Icon className="size-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#e67e22]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">
                        {t(
                          `gestionnaire.assistanceRecouvrement.steps.${step.key}.title`,
                        )}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t(
                        `gestionnaire.assistanceRecouvrement.steps.${step.key}.desc`,
                      )}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* ── Plans ── */}
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[var(--color-imaro-primary)]" />
          <h3 className="text-lg font-bold text-foreground">
            {t('gestionnaire.assistanceRecouvrement.plans.title')}
          </h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('gestionnaire.assistanceRecouvrement.plans.subtitle')}
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const base = `gestionnaire.assistanceRecouvrement.plans.${plan.id}`
            const features = t(`${base}.features`, {
              returnObjects: true,
            }) as string[]
            const selected = form.plan === plan.id
            return (
              <button
                type="button"
                key={plan.id}
                onClick={() => set('plan', plan.id)}
                aria-pressed={selected}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-5 text-start transition-all',
                  selected
                    ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)]/[0.03] ring-2 ring-[var(--color-imaro-primary)]/15'
                    : 'border-border bg-card hover:border-[var(--color-imaro-primary)]/40',
                )}
              >
                {plan.featured && (
                  <span className="absolute -top-2.5 end-4 inline-flex items-center gap-1 rounded-full bg-[#e67e22] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <Crown className="size-3" />
                    {t('gestionnaire.assistanceRecouvrement.plans.popular')}
                  </span>
                )}
                <h4 className="text-base font-bold text-foreground">
                  {t(`${base}.name`)}
                </h4>
                <p className="mt-1 text-sm font-semibold text-[var(--color-imaro-primary)]">
                  {t(`${base}.price`)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t(`${base}.desc`)}
                </p>
                <ul className="mt-4 space-y-2">
                  {features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-xs text-foreground/80"
                    >
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#27ae60]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <span
                  className={cn(
                    'mt-4 inline-flex items-center gap-1.5 text-xs font-semibold',
                    selected
                      ? 'text-[var(--color-imaro-primary)]'
                      : 'text-muted-foreground',
                  )}
                >
                  {selected && <CheckCircle2 className="size-3.5" />}
                  {selected
                    ? t('gestionnaire.assistanceRecouvrement.plans.selected')
                    : t('gestionnaire.assistanceRecouvrement.plans.choose')}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Request form / confirmation ── */}
      <section id="demande" className="mt-8 scroll-mt-20">
        {result ? (
          <ConfirmationCard
            reference={result.reference}
            mailtoHref={mailtoHref}
            onReset={() => {
              setResult(null)
              mutation.reset()
            }}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-[var(--color-imaro-primary)]" />
              <h3 className="text-lg font-bold text-foreground">
                {t('gestionnaire.assistanceRecouvrement.form.title')}
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('gestionnaire.assistanceRecouvrement.form.subtitle')}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="ar-syndic"
                  icon={Building2}
                  label={t(
                    'gestionnaire.assistanceRecouvrement.form.syndicName',
                  )}
                  required
                >
                  <Input
                    id="ar-syndic"
                    value={form.syndicName}
                    onChange={(e) => set('syndicName', e.target.value)}
                    required
                  />
                </Field>
                <Field
                  id="ar-name"
                  icon={User}
                  label={t(
                    'gestionnaire.assistanceRecouvrement.form.contactName',
                  )}
                  required
                >
                  <Input
                    id="ar-name"
                    value={form.contactName}
                    onChange={(e) => set('contactName', e.target.value)}
                    required
                  />
                </Field>
                <Field
                  id="ar-phone"
                  icon={Phone}
                  label={t(
                    'gestionnaire.assistanceRecouvrement.form.contactPhone',
                  )}
                  required
                >
                  <Input
                    id="ar-phone"
                    type="tel"
                    dir="ltr"
                    value={form.contactPhone}
                    onChange={(e) => set('contactPhone', e.target.value)}
                    required
                  />
                </Field>
                <Field
                  id="ar-email"
                  icon={AtSign}
                  label={t(
                    'gestionnaire.assistanceRecouvrement.form.contactEmail',
                  )}
                  required
                >
                  <Input
                    id="ar-email"
                    type="email"
                    dir="ltr"
                    value={form.contactEmail}
                    onChange={(e) => set('contactEmail', e.target.value)}
                    required
                  />
                </Field>
                <Field
                  id="ar-residences"
                  icon={Building2}
                  label={t(
                    'gestionnaire.assistanceRecouvrement.form.residencesCount',
                  )}
                >
                  <Input
                    id="ar-residences"
                    inputMode="numeric"
                    value={form.residencesCount}
                    onChange={(e) =>
                      set(
                        'residencesCount',
                        e.target.value.replace(/\D/g, '').slice(0, 5),
                      )
                    }
                    placeholder={t(
                      'gestionnaire.assistanceRecouvrement.form.residencesPlaceholder',
                    )}
                  />
                </Field>
                <Field
                  id="ar-impayes"
                  icon={Scale}
                  label={t(
                    'gestionnaire.assistanceRecouvrement.form.impayesEstimate',
                  )}
                >
                  <Input
                    id="ar-impayes"
                    value={form.impayesEstimate}
                    onChange={(e) => set('impayesEstimate', e.target.value)}
                    placeholder={t(
                      'gestionnaire.assistanceRecouvrement.form.impayesPlaceholder',
                    )}
                  />
                </Field>
              </div>

              {/* Plan (mirrors the cards above) */}
              <div className="space-y-1.5">
                <Label htmlFor="ar-plan">
                  {t('gestionnaire.assistanceRecouvrement.form.plan')}
                </Label>
                <Select
                  value={form.plan}
                  onValueChange={(v) => set('plan', v as AssistancePlan)}
                >
                  <SelectTrigger id="ar-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {t(
                          `gestionnaire.assistanceRecouvrement.plans.${p.id}.name`,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ar-message">
                  {t('gestionnaire.assistanceRecouvrement.form.message')}
                </Label>
                <textarea
                  id="ar-message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder={t(
                    'gestionnaire.assistanceRecouvrement.form.messagePlaceholder',
                  )}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-imaro-primary)]/10 dark:bg-card"
                />
              </div>

              {/* Legal conformity disclaimer */}
              <div className="flex items-start gap-2 rounded-lg border border-[var(--color-imaro-primary)]/15 bg-[var(--color-imaro-primary)]/[0.03] p-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--color-imaro-primary)]" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('gestionnaire.assistanceRecouvrement.form.disclaimer')}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="min-h-[44px] gap-2 bg-[#e67e22] text-white shadow-sm hover:brightness-110"
                >
                  <Send className="size-4" />
                  {mutation.isPending
                    ? t('gestionnaire.assistanceRecouvrement.form.submitting')
                    : t('gestionnaire.assistanceRecouvrement.form.submit')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('gestionnaire.assistanceRecouvrement.form.mailtoHint')}{' '}
                  <a
                    href={mailtoHref}
                    className="font-medium text-[var(--color-imaro-primary)] hover:underline"
                  >
                    {ASSISTANCE_IT_EMAIL}
                  </a>
                </p>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Field wrapper ──────────────────────────────────────────────────────────────

function Field({
  id,
  icon: Icon,
  label,
  required,
  children,
}: {
  id: string
  icon: typeof User
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-[#e74c3c]">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ─── Confirmation ──────────────────────────────────────────────────────────────

function ConfirmationCard({
  reference,
  mailtoHref,
  onReset,
}: {
  reference: string
  mailtoHref: string
  onReset: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center shadow-sm dark:border-green-800 dark:bg-green-950/30 sm:p-10">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
        <CheckCircle2 className="size-7 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="mt-4 text-xl font-bold text-green-900 dark:text-green-200">
        {t('gestionnaire.assistanceRecouvrement.success.title')}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-green-800/80 dark:text-green-300/80">
        {t('gestionnaire.assistanceRecouvrement.success.desc')}
      </p>
      <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 dark:bg-card">
        <span className="text-xs text-muted-foreground">
          {t('gestionnaire.assistanceRecouvrement.success.reference')}
        </span>
        <span className="font-mono text-sm font-bold tracking-widest text-[var(--color-imaro-primary)]">
          {reference}
        </span>
      </div>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={onReset}
          className="min-h-[44px] gap-2"
        >
          {t('gestionnaire.assistanceRecouvrement.success.newRequest')}
        </Button>
        <a
          href={mailtoHref}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-medium text-[var(--color-imaro-primary)] hover:underline"
        >
          <Mail className="size-4" />
          {t('gestionnaire.assistanceRecouvrement.success.mailtoFallback')}
        </a>
      </div>
    </div>
  )
}
