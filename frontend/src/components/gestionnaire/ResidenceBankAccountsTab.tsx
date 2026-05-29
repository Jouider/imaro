import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Building2,
  Check,
  Copy,
  Pencil,
  Plus,
  QrCode,
  Star,
  Trash2,
} from 'lucide-react'
import {
  deleteBankAccount,
  getResidenceBankAccounts,
  setPrimaryBankAccount,
  storeBankAccount,
  updateBankAccount,
  type BankAccount,
  type CreateBankAccountInput,
} from '@/services/gestionnaire.service'
import { banqueLabel, buildPaymentPayload } from '@/lib/payment'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ConfirmModal,
  EmptyState,
  LoadingSkeleton,
  PaymentQr,
} from '@/components/shared'
import { BankAccountFormDialog } from '@/components/gestionnaire/BankAccountFormDialog'
import { cn } from '@/lib/utils'

type Props = {
  residenceId: number
}

export function ResidenceBankAccountsTab({ residenceId }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)
  const [qrTarget, setQrTarget] = useState<BankAccount | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['residence-bank-accounts', residenceId],
    queryFn: () => getResidenceBankAccounts(residenceId),
    enabled: !!residenceId,
  })

  function invalidate() {
    void qc.invalidateQueries({
      queryKey: ['residence-bank-accounts', residenceId],
    })
  }

  const storeMutation = useMutation({
    mutationFn: (data: CreateBankAccountInput) =>
      storeBankAccount(residenceId, data),
    onSuccess: () => {
      invalidate()
      setFormOpen(false)
      toast.success(t('gestionnaire.residence.encaissement.toast.created'))
    },
    onError: () =>
      toast.error(t('gestionnaire.residence.encaissement.toast.error')),
  })

  const updateMutation = useMutation({
    mutationFn: (data: CreateBankAccountInput) =>
      updateBankAccount(residenceId, editTarget!.id, data),
    onSuccess: () => {
      invalidate()
      setEditTarget(null)
      toast.success(t('gestionnaire.residence.encaissement.toast.updated'))
    },
    onError: () =>
      toast.error(t('gestionnaire.residence.encaissement.toast.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBankAccount(residenceId, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success(t('gestionnaire.residence.encaissement.toast.deleted'))
    },
    onError: () =>
      toast.error(t('gestionnaire.residence.encaissement.toast.error')),
  })

  const primaryMutation = useMutation({
    mutationFn: (id: number) => setPrimaryBankAccount(residenceId, id),
    onSuccess: () => {
      invalidate()
      toast.success(t('gestionnaire.residence.encaissement.toast.primarySet'))
    },
    onError: () =>
      toast.error(t('gestionnaire.residence.encaissement.toast.error')),
  })

  async function copyRib(account: BankAccount) {
    try {
      await navigator.clipboard.writeText(account.rib)
      setCopiedId(account.id)
      window.setTimeout(() => setCopiedId(null), 1500)
      toast.success(t('gestionnaire.residence.encaissement.copied'))
    } catch {
      toast.error(t('gestionnaire.residence.encaissement.copyError'))
    }
  }

  if (isLoading) return <LoadingSkeleton variant="card" count={2} />

  return (
    <div className="space-y-4">
      {/* Header + add */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('gestionnaire.residence.encaissement.intro')}
        </p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="me-1.5 size-4" />
          {t('gestionnaire.residence.encaissement.add')}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-12" />}
          title={t('gestionnaire.residence.encaissement.emptyTitle')}
          description={t('gestionnaire.residence.encaissement.emptyDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                'rounded-xl border bg-card p-5',
                account.is_primary &&
                  'border-[var(--color-imaro-primary)]/40 ring-1 ring-[var(--color-imaro-primary)]/20',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-foreground">
                      {banqueLabel(account.banque)}
                    </h3>
                    {account.is_primary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-imaro-primary-tint)] px-2 py-0.5 text-xs font-medium text-[var(--color-imaro-primary)]">
                        <Star className="size-3 fill-current" />
                        {t('gestionnaire.residence.encaissement.primaryBadge')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {account.titulaire}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  title={t('gestionnaire.residence.encaissement.showQr')}
                  onClick={() => setQrTarget(account)}
                >
                  <QrCode className="size-4" />
                </Button>
              </div>

              {/* RIB row */}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <code className="truncate font-mono text-sm tabular-nums text-foreground">
                  {account.rib}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  title={t('gestionnaire.residence.encaissement.copy')}
                  onClick={() => copyRib(account)}
                >
                  {copiedId === account.id ? (
                    <Check className="size-4 text-[var(--color-imaro-success)]" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              {account.iban && (
                <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                  {account.iban}
                </p>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!account.is_primary && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={primaryMutation.isPending}
                    onClick={() => primaryMutation.mutate(account.id)}
                  >
                    <Star className="me-1.5 size-3.5" />
                    {t('gestionnaire.residence.encaissement.setPrimary')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditTarget(account)}
                >
                  <Pencil className="me-1.5 size-3.5" />
                  {t('actions.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[var(--color-imaro-danger)] hover:text-[var(--color-imaro-danger)]"
                  onClick={() => setDeleteTarget(account)}
                >
                  <Trash2 className="me-1.5 size-3.5" />
                  {t('actions.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <BankAccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data) => storeMutation.mutate(data)}
        isLoading={storeMutation.isPending}
      />

      {/* Edit dialog */}
      <BankAccountFormDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        account={editTarget}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('gestionnaire.residence.encaissement.deleteTitle')}
        description={t('gestionnaire.residence.encaissement.deleteDesc', {
          banque: deleteTarget ? banqueLabel(deleteTarget.banque) : '',
        })}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      {/* QR preview */}
      <Dialog open={!!qrTarget} onOpenChange={(o) => !o && setQrTarget(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {t('gestionnaire.residence.encaissement.qrTitle')}
            </DialogTitle>
          </DialogHeader>
          {qrTarget && (
            <div className="flex flex-col items-center gap-3 py-2">
              <PaymentQr value={buildPaymentPayload(qrTarget)} size={220} />
              <p className="text-center text-sm text-muted-foreground">
                {banqueLabel(qrTarget.banque)} · {qrTarget.titulaire}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
