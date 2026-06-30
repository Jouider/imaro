import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Trash2, Bell } from 'lucide-react'
import {
  getRelanceScenario,
  updateRelanceScenario,
  type RelanceStep,
  type RelanceCanal,
  type RelanceStepType,
} from '@/services/relance-scenario.service'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DraftStep = Omit<RelanceStep, 'id'>

const CANAUX: RelanceCanal[] = ['whatsapp', 'sms', 'email']
const TYPES: RelanceStepType[] = ['relance', 'mise_en_demeure']

/**
 * Configuration du scénario de relance de recouvrement (KAN-87) : étapes
 * ordonnées (J+X après échéance), canal et type (relance / mise en demeure).
 */
export function RelanceScenarioCard({ residenceId }: { residenceId: number }) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['relance-scenario', residenceId],
    queryFn: () => getRelanceScenario(residenceId),
    enabled: !!residenceId,
  })

  const [enabled, setEnabled] = useState(false)
  const [steps, setSteps] = useState<DraftStep[]>([])

  // Sync the editable draft when freshly loaded data arrives — render-time
  // adjustment (no effect), per the project's setState-during-render pattern.
  const [syncedData, setSyncedData] = useState<typeof data>(undefined)
  if (data && data !== syncedData) {
    setSyncedData(data)
    setEnabled(data.enabled)
    setSteps(
      data.steps.map(({ delai_jours, canal, type }) => ({
        delai_jours,
        canal,
        type,
      })),
    )
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      updateRelanceScenario(residenceId, {
        enabled,
        steps: [...steps].sort((a, b) => a.delai_jours - b.delai_jours),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['relance-scenario', residenceId] })
      toast.success(
        t('gestionnaire.recouvrement.relance.saved', {
          defaultValue: 'Scénario de relance enregistré',
        }),
      )
    },
    onError: () => toast.error(t('common.error')),
  })

  function addStep() {
    setSteps((s) => [
      ...s,
      { delai_jours: 7, canal: 'whatsapp', type: 'relance' },
    ])
  }

  function updateStep(index: number, patch: Partial<DraftStep>) {
    setSteps((s) =>
      s.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    )
  }

  function removeStep(index: number) {
    setSteps((s) => s.filter((_, i) => i !== index))
  }

  if (isLoading) return <LoadingSkeleton variant="card" />

  return (
    <div className="rounded-xl border bg-white p-4 dark:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 size-4 text-[var(--color-imaro-primary)]" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('gestionnaire.recouvrement.relance.title', {
                defaultValue: 'Scénario de relance',
              })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('gestionnaire.recouvrement.relance.subtitle', {
                defaultValue:
                  'Étapes automatiques après échéance : délai, canal et escalade vers mise en demeure.',
              })}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          {t('gestionnaire.recouvrement.relance.auto', {
            defaultValue: 'Automatique',
          })}
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {steps.length === 0 && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {t('gestionnaire.recouvrement.relance.empty', {
              defaultValue: 'Aucune étape. Ajoutez une première relance.',
            })}
          </p>
        )}
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-2 rounded-lg border p-2"
          >
            <div className="space-y-1">
              <Label className="text-[11px]">
                {t('gestionnaire.recouvrement.relance.delai', {
                  defaultValue: 'Délai (J+)',
                })}
              </Label>
              <Input
                type="number"
                min={0}
                className="w-20"
                value={step.delai_jours}
                onChange={(e) =>
                  updateStep(i, { delai_jours: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">
                {t('gestionnaire.recouvrement.relance.canal', {
                  defaultValue: 'Canal',
                })}
              </Label>
              <Select
                value={step.canal}
                onValueChange={(v) =>
                  updateStep(i, { canal: v as RelanceCanal })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANAUX.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`gestionnaire.recouvrement.relance.canaux.${c}`, {
                        defaultValue: c,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">
                {t('gestionnaire.recouvrement.relance.type', {
                  defaultValue: 'Type',
                })}
              </Label>
              <Select
                value={step.type}
                onValueChange={(v) =>
                  updateStep(i, { type: v as RelanceStepType })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {t(`gestionnaire.recouvrement.relance.types.${ty}`, {
                        defaultValue: ty,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-red-600 hover:bg-red-50"
              onClick={() => removeStep(i)}
              aria-label={t('actions.delete')}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="me-1.5 size-4" />
          {t('gestionnaire.recouvrement.relance.addStep', {
            defaultValue: 'Ajouter une étape',
          })}
        </Button>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? t('actions.loading') : t('actions.save')}
        </Button>
      </div>
    </div>
  )
}
