import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus } from 'lucide-react'
import {
  walkInVisite,
  type CreateVisiteInput,
  type Visite,
  type VisiteType,
} from '@/services/visites.service'
import { useAuthStore } from '@/stores/authStore'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (visit: Visite) => void
}

export function WalkInDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation()
  const { tenant } = useAuthStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<VisiteType>('visitor')
  const [purpose, setPurpose] = useState('')
  const [hostLot, setHostLot] = useState('')

  const mut = useMutation({
    mutationFn: (input: CreateVisiteInput) => walkInVisite(input),
    onSuccess: (v) => {
      onCreated(v)
      setName('')
      setPhone('')
      setType('visitor')
      setPurpose('')
      setHostLot('')
    },
  })

  const submit = () => {
    if (!name.trim()) {
      toast.error(t('gestionnaire.visites.form.validationName'))
      return
    }
    if (!phone.trim()) {
      toast.error(t('gestionnaire.visites.form.validationPhone'))
      return
    }
    mut.mutate({
      // The gardien doesn't pick a residence — backend infers from their
      // assigned residence. We send a non-zero placeholder if needed.
      residence_id: tenant?.id ?? 0,
      visitor_name: name.trim(),
      visitor_phone: phone.trim(),
      type,
      purpose: purpose.trim() || undefined,
      host_lot_id: hostLot.trim() ? undefined : undefined, // free-text for now
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-[var(--color-imaro-primary)]" />
            {t('gardien.walkIn.title')}
          </DialogTitle>
          <DialogDescription>{t('gardien.walkIn.desc')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wi-name">
              {t('gestionnaire.visites.form.visitorName')}
            </Label>
            <Input
              id="wi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'gestionnaire.visites.form.visitorNamePlaceholder',
              )}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wi-phone">
              {t('gestionnaire.visites.form.visitorPhone')}
            </Label>
            <Input
              id="wi-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('gestionnaire.visites.form.phonePlaceholder')}
              dir="ltr"
              inputMode="tel"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('gestionnaire.visites.form.type')}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as VisiteType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'visitor',
                      'delivery',
                      'contractor',
                      'prestataire',
                    ] as const
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`gestionnaire.visites.type.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wi-lot">
                {t('gestionnaire.visites.form.host')}
              </Label>
              <Input
                id="wi-lot"
                value={hostLot}
                onChange={(e) => setHostLot(e.target.value)}
                placeholder="A-12"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wi-purpose">
              {t('gestionnaire.visites.form.purpose')}
            </Label>
            <Input
              id="wi-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t('gestionnaire.visites.form.purposePlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mut.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button onClick={submit} disabled={mut.isPending} className="gap-1.5">
            <UserPlus className="size-4" />
            {mut.isPending
              ? t('gardien.walkIn.submitting')
              : t('gardien.walkIn.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
