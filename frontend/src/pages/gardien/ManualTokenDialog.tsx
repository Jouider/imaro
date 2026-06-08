import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Keyboard, ScanLine } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (token: string) => void
}

export function ManualTokenDialog({ open, onOpenChange, onSubmit }: Props) {
  const { t } = useTranslation()
  const [token, setToken] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-[var(--color-imaro-primary)]" />
            {t('gestionnaire.visites.scan.manualToken')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.visites.scan.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="manual-tok">
            {t('gestionnaire.visites.scan.manualToken')}
          </Label>
          <Input
            id="manual-tok"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t('gestionnaire.visites.scan.manualPlaceholder')}
            dir="ltr"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            disabled={!token.trim()}
            onClick={() => {
              onSubmit(token.trim())
              setToken('')
              onOpenChange(false)
            }}
            className="gap-1.5"
          >
            <ScanLine className="size-4" />
            {t('gestionnaire.visites.scan.manualSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
