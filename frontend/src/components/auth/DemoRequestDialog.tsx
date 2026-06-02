import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestDemo } from '@/services/demo.service'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Sales-led "create account" path: a prospective syndic requests a demo.
 * Reusable from the login page and the marketing landing CTA.
 */
export function DemoRequestDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [cabinet, setCabinet] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      requestDemo({
        name: name.trim(),
        cabinet: cabinet.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim() || undefined,
      }),
    onSuccess: () => setSent(true),
    onError: () => toast.error(t('auth.demo.error')),
  })

  function close(o: boolean) {
    onOpenChange(o)
    if (!o) {
      // reset for next open
      setTimeout(() => {
        setSent(false)
        setName('')
        setCabinet('')
        setEmail('')
        setPhone('')
        setMessage('')
      }, 250)
    }
  }

  const valid = name.trim() && cabinet.trim() && email.trim() && phone.trim()

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('auth.demo.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('auth.demo.subtitle')}
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-imaro-dark relative overflow-hidden px-6 py-6 text-white">
          <div
            aria-hidden
            className="animate-aurora pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[var(--accent)]/25 blur-3xl"
          />
          <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="size-3.5 text-[var(--color-imaro-accent-light)]" />
            {t('auth.demo.eyebrow')}
          </div>
          <h2 className="relative mt-2 font-display text-2xl leading-tight">
            {t('auth.demo.title')}
          </h2>
          <p className="relative mt-1 text-sm text-white/70">
            {t('auth.demo.subtitle')}
          </p>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--color-imaro-success)]/10 text-[var(--color-imaro-success)]">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="mt-4 font-display text-xl text-[var(--primary)]">
              {t('auth.demo.sentTitle')}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              {t('auth.demo.sentBody')}
            </p>
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => close(false)}
            >
              {t('actions.close')}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4 px-6 py-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (!valid) return
              mutation.mutate()
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="d-name">{t('auth.demo.name')}</Label>
                <Input
                  id="d-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-cabinet">{t('auth.demo.cabinet')}</Label>
                <Input
                  id="d-cabinet"
                  value={cabinet}
                  onChange={(e) => setCabinet(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-email">{t('auth.demo.email')}</Label>
              <Input
                id="d-email"
                type="email"
                placeholder="vous@cabinet.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-phone">{t('auth.demo.phone')}</Label>
              <Input
                id="d-phone"
                type="tel"
                inputMode="tel"
                placeholder="06 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-message">{t('auth.demo.message')}</Label>
              <textarea
                id="d-message"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('auth.demo.messagePlaceholder')}
                className="w-full rounded-xl border-2 border-border bg-white px-3 py-2 text-sm text-[var(--color-imaro-primary)] placeholder:text-muted-foreground/50 focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-imaro-primary)]/10 dark:bg-card"
              />
            </div>

            <Button
              type="submit"
              disabled={!valid || mutation.isPending}
              className="bg-gradient-imaro h-11 w-full text-base text-white shadow-sm hover:brightness-110"
            >
              {mutation.isPending && (
                <Loader2 className="me-1.5 size-4 animate-spin" />
              )}
              {t('auth.demo.submit')}
              <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t('auth.demo.privacy')}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
