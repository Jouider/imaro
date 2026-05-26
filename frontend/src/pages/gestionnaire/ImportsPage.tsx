import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  Building2,
  Users,
  Scale,
  CreditCard,
  Hammer,
  BookOpen,
  CheckCircle2,
  Info,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getResidences,
  getLots,
  getImmeubles,
  getCoproprietaires,
} from '@/services/gestionnaire.service'
import { ImportStepper } from '@/components/gestionnaire/import/ImportStepper'
import { lotsConfig } from '@/lib/import/configs/lots.config'
import { coproprietairesConfig } from '@/lib/import/configs/coproprietaires.config'
import { soldesConfig } from '@/lib/import/configs/soldes.config'
import { paiementsConfig } from '@/lib/import/configs/paiements.config'
import { prestatairesConfig } from '@/lib/import/configs/prestataires.config'
import { bilanOuvertureConfig } from '@/lib/import/configs/bilan-ouverture.config'
import type { ImportContext } from '@/lib/import/types'

// ─── Tab definitions ────────────────────────────────────────────────────────

const IMPORT_TABS = [
  { id: 'lots', config: lotsConfig, icon: Building2, deps: [] as string[] },
  {
    id: 'coproprietaires',
    config: coproprietairesConfig,
    icon: Users,
    deps: ['lots'],
  },
  { id: 'soldes', config: soldesConfig, icon: Scale, deps: ['lots'] },
  {
    id: 'paiements',
    config: paiementsConfig,
    icon: CreditCard,
    deps: ['lots', 'coproprietaires'],
  },
  { id: 'prestataires', config: prestatairesConfig, icon: Hammer, deps: [] },
  {
    id: 'bilan-ouverture',
    config: bilanOuvertureConfig,
    icon: BookOpen,
    deps: [] as string[],
  },
] as const

// ─── ImportsPage ────────────────────────────────────────────────────────────

export function ImportsPage() {
  const { t } = useTranslation()

  // Residence selection
  const [residenceId, setResidenceId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('lots')
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  // ── Queries ──────────────────────────────────────────────────────────────

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const lotsQ = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(residenceId!),
    enabled: !!residenceId,
  })

  const immeublesQ = useQuery({
    queryKey: ['immeubles', residenceId],
    queryFn: () => getImmeubles(residenceId!),
    enabled: !!residenceId,
  })

  const coproprietairesQ = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId!),
    enabled: !!residenceId,
  })

  // ── Import context ───────────────────────────────────────────────────────

  const importContext: ImportContext = useMemo(
    () => ({
      residenceId: residenceId ?? 0,
      existingLots: (lotsQ.data?.lots ?? []).map((l) => ({
        id: l.id,
        numero: l.numero,
        tantieme: l.tantieme,
      })),
      existingCoproprietaires: (coproprietairesQ.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        lot_id: c.lot?.id,
      })),
      existingImmeubles: (immeublesQ.data ?? []).map((i) => ({
        id: i.id,
        nom: i.nom,
      })),
    }),
    [residenceId, lotsQ.data, coproprietairesQ.data, immeublesQ.data],
  )

  const queryClient = useQueryClient()

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleComplete = (tabId: string) => {
    setCompleted((prev) => new Set([...prev, tabId]))
    // Invalidate related queries so next tab gets fresh data for cross-validation
    if (tabId === 'lots') {
      void queryClient.invalidateQueries({ queryKey: ['lots', residenceId] })
    }
    if (tabId === 'coproprietaires') {
      void queryClient.invalidateQueries({
        queryKey: ['coproprietaires', residenceId],
      })
    }
    // Auto-advance to next tab
    const idx = IMPORT_TABS.findIndex((t) => t.id === tabId)
    if (idx < IMPORT_TABS.length - 1) {
      setActiveTab(IMPORT_TABS[idx + 1].id)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#1B4F72]/10">
            <Upload className="size-5 text-[#1B4F72]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t('gestionnaire.imports.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('gestionnaire.imports.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Residence selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">
          {t('gestionnaire.imports.selectResidence')}
        </label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => {
            setResidenceId(Number(v))
            setCompleted(new Set())
            setActiveTab('lots')
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue
              placeholder={t('gestionnaire.imports.selectResidence')}
            />
          </SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No residence selected */}
      {!residenceId && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-center">
          <Building2 className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.imports.selectResidence')}
          </p>
        </div>
      )}

      {/* Import tabs */}
      {residenceId && (
        <>
          {/* Recommended order banner */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">
            <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('gestionnaire.imports.order')}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              {IMPORT_TABS.map((tab) => {
                const Icon = tab.icon
                const isCompleted = completed.has(tab.id)
                const hasMissingDeps = tab.deps.some((d) => !completed.has(d))

                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      'gap-2 rounded-lg border px-4 py-2.5 transition-all',
                      'data-[state=active]:bg-[#1B4F72] data-[state=active]:text-white data-[state=active]:border-[#1B4F72]',
                      'data-[state=inactive]:hover:border-[#1B4F72]/40 data-[state=inactive]:hover:bg-[#1B4F72]/5',
                      isCompleted &&
                        'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
                      hasMissingDeps &&
                        !isCompleted &&
                        !(activeTab === tab.id) &&
                        'opacity-60',
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 text-green-600 data-[state=active]:text-white" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                    <span className="text-xs font-medium">
                      {t(tab.config.labelKey)}
                    </span>
                    {isCompleted ? (
                      <Badge
                        variant="outline"
                        className="ml-1 h-4 border-green-300 bg-green-100 px-1 text-[10px] text-green-700"
                      >
                        OK
                      </Badge>
                    ) : hasMissingDeps ? (
                      <Badge
                        variant="outline"
                        className="ml-1 h-4 border-amber-300 bg-amber-50 px-1 text-[10px] text-amber-700"
                      >
                        !
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {IMPORT_TABS.map((tab) => {
              const isCompleted = completed.has(tab.id)
              const missingDeps = tab.deps.filter((d) => !completed.has(d))
              return (
                <TabsContent
                  key={tab.id}
                  value={tab.id}
                  className="mt-6 space-y-4"
                >
                  {/* Dep warning — shown but doesn't block */}
                  {!isCompleted && missingDeps.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                      <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Pour de meilleurs résultats, importez d&apos;abord :{' '}
                        <span className="font-semibold">
                          {missingDeps
                            .map((d) => {
                              const found = IMPORT_TABS.find((t) => t.id === d)
                              return found ? t(found.config.labelKey) : d
                            })
                            .join(', ')}
                        </span>
                      </p>
                    </div>
                  )}

                  {isCompleted ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 py-10 dark:border-green-900/30 dark:bg-green-950/20">
                      <CheckCircle2 className="size-10 text-green-500" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Import terminé
                      </p>
                      <button
                        onClick={() =>
                          setCompleted((prev) => {
                            const next = new Set(prev)
                            next.delete(tab.id)
                            return next
                          })
                        }
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        Ré-importer
                      </button>
                    </div>
                  ) : (
                    <ImportStepper
                      config={tab.config}
                      context={importContext}
                      onComplete={() => handleComplete(tab.id)}
                    />
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </>
      )}
    </div>
  )
}
