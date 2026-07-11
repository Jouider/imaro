import { type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Titre de la boîte de dialogue */
  title: string
  /** Message de confirmation */
  description: ReactNode
  /** Texte du bouton de confirmation (défaut: "Confirmer") */
  confirmLabel?: string
  /** Texte du bouton annulation (défaut: "Annuler") */
  cancelLabel?: string
  /** Appelé quand l'utilisateur confirme */
  onConfirm: () => void
  /** Désactive le bouton pendant un appel API */
  isLoading?: boolean
  /** Variante du bouton confirm. Défaut: 'destructive' */
  variant?: 'destructive' | 'default'
}

/**
 * Modale de confirmation réutilisable.
 * TOUJOURS utiliser avant toute suppression irréversible.
 *
 * @example
 * <ConfirmModal
 *   open={confirmOpen}
 *   onOpenChange={setConfirmOpen}
 *   title="Supprimer le lot ?"
 *   description={<>Le lot <strong>A-102</strong> sera définitivement supprimé.</>}
 *   onConfirm={handleDelete}
 *   isLoading={deleteMutation.isPending}
 * />
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isLoading = false,
  variant = 'destructive',
}: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="size-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 flex-row justify-center gap-3 sm:justify-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel ?? t('actions.cancel')}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive'
                ? 'bg-[var(--color-imaro-danger)] text-white hover:bg-red-700'
                : undefined
            }
          >
            {isLoading
              ? t('actions.loading')
              : (confirmLabel ?? t('actions.confirm'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
