import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type BankAccount,
  type CreateBankAccountInput,
} from '@/services/gestionnaire.service'
import { BANQUES } from '@/services/pointage.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FormState = {
  banque: string
  titulaire: string
  rib: string
  iban: string
  is_primary: boolean
}

const EMPTY: FormState = {
  banque: 'attijariwafa',
  titulaire: '',
  rib: '',
  iban: '',
  is_primary: false,
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si fourni → mode édition. Sinon → création. */
  account?: BankAccount | null
  onSubmit: (data: CreateBankAccountInput) => void
  isLoading?: boolean
}

export function BankAccountFormDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
  isLoading,
}: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [wasOpen, setWasOpen] = useState(false)

  // Reset/populate au passage fermé → ouvert (évite un effet).
  if (open && !wasOpen) {
    setWasOpen(true)
    setForm(
      account
        ? {
            banque: account.banque,
            titulaire: account.titulaire,
            rib: account.rib,
            iban: account.iban ?? '',
            is_primary: account.is_primary,
          }
        : EMPTY,
    )
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const isEdit = !!account
  const canSubmit = form.titulaire.trim() !== '' && form.rib.trim() !== ''

  function handleSubmit() {
    onSubmit({
      banque: form.banque as CreateBankAccountInput['banque'],
      titulaire: form.titulaire.trim(),
      rib: form.rib.trim(),
      iban: form.iban.trim() || undefined,
      is_primary: form.is_primary,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('gestionnaire.residence.encaissement.editTitle')
              : t('gestionnaire.residence.encaissement.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.residence.encaissement.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('gestionnaire.residence.encaissement.banque')}</Label>
            <Select
              value={form.banque}
              onValueChange={(v) => setForm((f) => ({ ...f, banque: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANQUES.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ba-titulaire">
              {t('gestionnaire.residence.encaissement.titulaire')}
            </Label>
            <Input
              id="ba-titulaire"
              value={form.titulaire}
              onChange={(e) =>
                setForm((f) => ({ ...f, titulaire: e.target.value }))
              }
              placeholder={t(
                'gestionnaire.residence.encaissement.titulairePlaceholder',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ba-rib">
              {t('gestionnaire.residence.encaissement.rib')}
            </Label>
            <Input
              id="ba-rib"
              value={form.rib}
              onChange={(e) => setForm((f) => ({ ...f, rib: e.target.value }))}
              placeholder="007 780 0001234567890123 45"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ba-iban">
              {t('gestionnaire.residence.encaissement.iban')}
            </Label>
            <Input
              id="ba-iban"
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
              placeholder="MA64 0077 8000 0123 4567 8901 2345"
            />
          </div>

          <label className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_primary: e.target.checked }))
              }
              className="size-4 accent-[var(--color-imaro-primary)]"
            />
            <span>{t('gestionnaire.residence.encaissement.isPrimary')}</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !canSubmit}>
            {isLoading
              ? t('actions.loading')
              : isEdit
                ? t('actions.save')
                : t('gestionnaire.residence.encaissement.createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
