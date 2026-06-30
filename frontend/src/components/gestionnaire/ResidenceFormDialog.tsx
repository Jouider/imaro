import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CreateResidenceInput,
  type Residence,
  type PeriodiciteCotisation,
} from '@/services/gestionnaire.service'
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
  name: string
  address: string
  city: string
  mode_cotisation: 'tantieme' | 'fixe' | 'categorie'
  montant_fixe: string
  jour_echeance: string
  periodicite_cotisation: PeriodiciteCotisation
}

const PERIODICITES: PeriodiciteCotisation[] = [
  'mensuel',
  'trimestriel',
  'semestriel',
  'annuel',
]

const EMPTY: FormState = {
  name: '',
  address: '',
  city: '',
  mode_cotisation: 'tantieme',
  montant_fixe: '',
  jour_echeance: '1',
  periodicite_cotisation: 'trimestriel',
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si fourni → mode édition. Sinon → création. */
  residence?: Residence | null
  onSubmit: (data: CreateResidenceInput) => void
  isLoading?: boolean
}

export function ResidenceFormDialog({
  open,
  onOpenChange,
  residence,
  onSubmit,
  isLoading,
}: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [wasOpen, setWasOpen] = useState(false)

  // Reset/populate the form on the closed → open transition (avoids effects).
  if (open && !wasOpen) {
    setWasOpen(true)
    setForm(
      residence
        ? {
            name: residence.name,
            address: residence.address,
            city: residence.city,
            mode_cotisation: residence.mode_cotisation ?? 'tantieme',
            montant_fixe: residence.montant_fixe?.toString() ?? '',
            jour_echeance: residence.jour_echeance?.toString() ?? '1',
            periodicite_cotisation:
              residence.periodicite_cotisation ?? 'trimestriel',
          }
        : EMPTY,
    )
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const isEdit = !!residence
  // Seul le mode « fixe » exige un montant ; tantième et catégorie n'en ont pas.
  const canSubmit =
    form.name.trim() !== '' &&
    form.city.trim() !== '' &&
    (form.mode_cotisation !== 'fixe' || form.montant_fixe.trim() !== '')

  function handleSubmit() {
    onSubmit({
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      mode_cotisation: form.mode_cotisation,
      montant_fixe:
        form.mode_cotisation === 'fixe' && form.montant_fixe
          ? Number(form.montant_fixe)
          : undefined,
      jour_echeance: form.jour_echeance
        ? Number(form.jour_echeance)
        : undefined,
      periodicite_cotisation: form.periodicite_cotisation,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('gestionnaire.residences.form.editTitle')
              : t('gestionnaire.residences.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.residences.form.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="res-name">
              {t('gestionnaire.residences.form.name')}
            </Label>
            <Input
              id="res-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('gestionnaire.residences.form.namePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-address">
              {t('gestionnaire.residences.form.address')}
            </Label>
            <Input
              id="res-address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder={t('gestionnaire.residences.form.addressPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-city">
                {t('gestionnaire.residences.form.city')}
              </Label>
              <Input
                id="res-city"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder={t('gestionnaire.residences.form.cityPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-jour">
                {t('gestionnaire.residences.form.jourEcheance')}
              </Label>
              <Input
                id="res-jour"
                type="number"
                min={1}
                max={28}
                value={form.jour_echeance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jour_echeance: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('gestionnaire.residences.form.modeCotisation')}</Label>
              <Select
                value={form.mode_cotisation}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    mode_cotisation: v as 'tantieme' | 'fixe' | 'categorie',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tantieme">
                    {t('gestionnaire.residences.form.modeTantieme')}
                  </SelectItem>
                  <SelectItem value="fixe">
                    {t('gestionnaire.residences.form.modeFixe')}
                  </SelectItem>
                  <SelectItem value="categorie">
                    {t('gestionnaire.residences.form.modeCategorie', {
                      defaultValue: 'Par catégorie de lot',
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.mode_cotisation === 'fixe' && (
              <div className="space-y-1.5">
                <Label htmlFor="res-montant">
                  {t('gestionnaire.residences.form.montantFixe')}
                </Label>
                <Input
                  id="res-montant"
                  type="number"
                  min={0}
                  value={form.montant_fixe}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, montant_fixe: e.target.value }))
                  }
                  placeholder="1500"
                />
              </div>
            )}
          </div>

          {form.mode_cotisation === 'categorie' && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {t('gestionnaire.residences.form.categorieHint', {
                defaultValue:
                  'Créez les catégories (libellé + cotisation) dans l’onglet « Catégories » de la résidence, puis rattachez chaque lot à une catégorie.',
              })}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>
              {t('gestionnaire.residences.form.periodicite', {
                defaultValue: 'Périodicité de cotisation',
              })}
            </Label>
            <Select
              value={form.periodicite_cotisation}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  periodicite_cotisation: v as PeriodiciteCotisation,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODICITES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`gestionnaire.residences.form.periodicites.${p}`, {
                      defaultValue: p,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                : t('gestionnaire.residences.form.createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
