import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert, Trash2, KeyRound } from 'lucide-react'
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
  deleteResidence,
  type Residence,
} from '@/services/gestionnaire.service'

/**
 * Secured residence deletion (KAN-112). Deleting a residence is destructive, so
 * the gestionnaire must re-type the residence name to confirm — a simple guard
 * against accidental deletion (replaces the former one-time-code flow, KAN-49).
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
  const [confirmText, setConfirmText] = useState('')
  const [syncedId, setSyncedId] = useState<number | null>(null)

  // Reset whenever a different residence opens (derived from props, no effect).
  if (residence && residence.id !== syncedId) {
    setSyncedId(residence.id)
    setConfirmText('')
  }

  const deleteMut = useMutation({
    mutationFn: () => deleteResidence(residence!.id),
    onSuccess: () => {
      toast.success(t('gestionnaire.residences.toast.deleted'))
      onDeleted()
      onOpenChange(false)
    },
    onError: () => toast.error(t('gestionnaire.residences.delete.error')),
  })

  const expected = residence?.name.trim() ?? ''
  const matches =
    confirmText.trim().toLowerCase() === expected.toLowerCase() &&
    expected !== ''

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

        <form
          className="space-y-4 pt-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (matches) deleteMut.mutate()
          }}
        >
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-imaro-danger)]/20 bg-[var(--color-imaro-danger)]/[0.04] p-3">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-[var(--color-imaro-danger)]" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('gestionnaire.residences.delete.intro')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              {t('gestionnaire.residences.delete.typeToConfirm', {
                defaultValue:
                  'Pour confirmer, saisissez le nom de la résidence :',
              })}{' '}
              <span className="font-semibold text-foreground">
                {residence?.name}
              </span>
            </Label>
            <Input
              id="delete-confirm"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={residence?.name ?? ''}
              aria-invalid={confirmText !== '' && !matches}
            />
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
              disabled={!matches || deleteMut.isPending}
            >
              <Trash2 className="size-4" />
              {deleteMut.isPending
                ? t('actions.loading')
                : t('gestionnaire.residences.delete.confirmDelete')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
