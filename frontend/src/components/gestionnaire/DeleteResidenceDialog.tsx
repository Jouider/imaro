import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShieldAlert,
  Mail,
  MessageSquare,
  Trash2,
  KeyRound,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  requestResidenceDeletionCode,
  deleteResidence,
  type Residence,
} from '@/services/gestionnaire.service'

/**
 * Two-step secured residence deletion (KAN-49). Deleting a residence is
 * destructive, so the gestionnaire must first request a one-time code
 * (email/SMS) and enter it before the deletion goes through.
 */
export function DeleteResidenceDialog({
  residence,
  onOpenChange,
  onDeleted,
}: {
  residence: Residence | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'request' | 'confirm'>('request')
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [code, setCode] = useState('')
  const [syncedId, setSyncedId] = useState<number | null>(null)

  // Reset whenever a different residence opens (derived from props, no effect).
  if (residence && residence.id !== syncedId) {
    setSyncedId(residence.id)
    setStep('request')
    setCode('')
  }

  const requestMut = useMutation({
    mutationFn: () => requestResidenceDeletionCode(residence!.id),
    onSuccess: (res) => {
      setChannel(res.channel)
      setStep('confirm')
      toast.success(t('gestionnaire.residences.delete.codeSent'))
    },
    onError: () => toast.error(t('gestionnaire.residences.delete.codeError')),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteResidence(residence!.id, code.trim()),
    onSuccess: () => {
      toast.success(t('gestionnaire.residences.toast.deleted'))
      onDeleted()
      onOpenChange(false)
    },
    onError: () => toast.error(t('gestionnaire.residences.delete.wrongCode')),
  })

  const ChannelIcon = channel === 'sms' ? MessageSquare : Mail

  return (
    <Dialog open={!!residence} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--color-imaro-danger)]">
            <ShieldAlert className="size-5" />
            {t('gestionnaire.residences.deleteTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.residences.deleteDesc', {
              name: residence?.name ?? '',
            })}
          </DialogDescription>
        </DialogHeader>

        {step === 'request' ? (
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-imaro-danger)]/20 bg-[var(--color-imaro-danger)]/[0.04] p-3">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-[var(--color-imaro-danger)]" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('gestionnaire.residences.delete.intro')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button
                className="bg-[var(--color-imaro-danger)] text-white hover:brightness-110"
                disabled={requestMut.isPending}
                onClick={() => requestMut.mutate()}
              >
                {requestMut.isPending
                  ? t('actions.loading')
                  : t('gestionnaire.residences.delete.sendCode')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim().length >= 4) deleteMut.mutate()
            }}
          >
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-sm">
              <ChannelIcon className="size-4 text-[var(--color-imaro-primary)]" />
              <span className="text-muted-foreground">
                {t(`gestionnaire.residences.delete.sentVia.${channel}`)}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-code">
                {t('gestionnaire.residences.delete.codeLabel')}
              </Label>
              <Input
                id="delete-code"
                inputMode="numeric"
                autoFocus
                dir="ltr"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="••••••"
                className="text-center text-lg font-bold tracking-[0.4em]"
              />
              <button
                type="button"
                onClick={() => requestMut.mutate()}
                disabled={requestMut.isPending}
                className="text-xs font-medium text-[var(--color-imaro-primary)] hover:underline disabled:opacity-50"
              >
                {t('gestionnaire.residences.delete.resend')}
              </button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                className="gap-1.5 bg-[var(--color-imaro-danger)] text-white hover:brightness-110"
                disabled={code.trim().length < 4 || deleteMut.isPending}
              >
                <Trash2 className="size-4" />
                {deleteMut.isPending
                  ? t('actions.loading')
                  : t('gestionnaire.residences.delete.confirmDelete')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
