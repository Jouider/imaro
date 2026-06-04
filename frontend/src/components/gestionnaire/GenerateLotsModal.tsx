import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Zap, Home, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { storeLot } from '@/services/gestionnaire.service'
import {
  generateLots,
  countLots,
  type LotTemplate,
  type LotConfig,
  type EntranceItem,
  type UnitTypeItem,
} from '@/utils/lotGenerator'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GenerateLotsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residenceId: number
  immeubleId: number
  immeubleName: string
  onSuccess: (count: number) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LOT_TYPE_OPTIONS = [
  'appartement',
  'commerce',
  'parking',
  'cave',
  'bureau',
  'autre',
] as const

type TemplateCard = {
  template: LotTemplate
  title: string
  subtitle: string
}

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    template: 'residence_ensemble',
    title: 'Résidence / Ensemble immobilier',
    subtitle:
      'Définir des entrées avec des comptages différents (Ex: E1=12, Bloc B=8)',
  },
  {
    template: 'simple_sequential',
    title: 'Numérotation simple',
    subtitle: 'Exemple : 1, 2, 3, 4, 5',
  },
  {
    template: 'wings_floors',
    title: 'Immeuble (Ailes + Étages)',
    subtitle: 'Exemple : A101, A102, B201, B202',
  },
  {
    template: 'floor_based',
    title: 'Par étage (sans aile)',
    subtitle: 'Exemple : 101, 102, 201, 202',
  },
  {
    template: 'villa_townhouse',
    title: 'Villa / Maison',
    subtitle: 'Exemple : Villa 1, Villa 2, Phase 1-Villa 1',
  },
  {
    template: 'commercial_mixed',
    title: 'Commercial / Usage mixte',
    subtitle: 'Exemple : Boutique 1, Bureau A',
  },
]

// ─── Per-template state types ─────────────────────────────────────────────────

interface SimpleSequentialState {
  totalLots: number
  startingNumber: number
}

interface WingsFloorsState {
  wings: string[]
  floors: number
  startingFloor: number
  unitsPerFloor: number
  startingNumber: number
}

interface FloorBasedState {
  floors: number
  startingFloor: number
  unitsPerFloor: number
  startingNumber: number
}

interface VillaTownhouseState {
  totalVillas: number
  prefix: string
  phase: string
  startingNumber: number
}

interface ResidenceEnsembleState {
  entrances: EntranceItem[]
}

interface CommercialMixedState {
  unitTypes: UnitTypeItem[]
}

// ─── Default states ───────────────────────────────────────────────────────────

const DEFAULT_SIMPLE: SimpleSequentialState = {
  totalLots: 10,
  startingNumber: 1,
}
const DEFAULT_WINGS: WingsFloorsState = {
  wings: ['A'],
  floors: 4,
  startingFloor: 1,
  unitsPerFloor: 3,
  startingNumber: 1,
}
const DEFAULT_FLOOR: FloorBasedState = {
  floors: 4,
  startingFloor: 1,
  unitsPerFloor: 3,
  startingNumber: 1,
}
const DEFAULT_VILLA: VillaTownhouseState = {
  totalVillas: 5,
  prefix: 'Villa',
  phase: '',
  startingNumber: 1,
}
const DEFAULT_ENSEMBLE: ResidenceEnsembleState = {
  entrances: [{ name: 'E1', count: 0 }],
}
const DEFAULT_COMMERCIAL: CommercialMixedState = {
  unitTypes: [
    { label: 'Boutique', count: 0 },
    { label: 'Bureau', count: 0 },
  ],
}

// ─── Helper: build the next wing letter ──────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function nextWingLetter(existing: string[]): string {
  for (const ch of ALPHABET) {
    if (!existing.includes(ch)) return ch
  }
  return String(existing.length + 1)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerateLotsModal({
  open,
  onOpenChange,
  residenceId,
  immeubleId,
  immeubleName,
  onSuccess,
}: GenerateLotsModalProps) {
  const { t } = useTranslation()
  // Template selection
  const [template, setTemplate] = useState<LotTemplate>('simple_sequential')

  // Shared fields
  const [type, setType] = useState<string>('appartement')
  const [tantieme, setTantieme] = useState<number>(1)

  // Per-template state
  const [simpleState, setSimpleState] =
    useState<SimpleSequentialState>(DEFAULT_SIMPLE)
  const [wingsState, setWingsState] = useState<WingsFloorsState>(DEFAULT_WINGS)
  const [floorState, setFloorState] = useState<FloorBasedState>(DEFAULT_FLOOR)
  const [villaState, setVillaState] =
    useState<VillaTownhouseState>(DEFAULT_VILLA)
  const [ensembleState, setEnsembleState] =
    useState<ResidenceEnsembleState>(DEFAULT_ENSEMBLE)
  const [commercialState, setCommercialState] =
    useState<CommercialMixedState>(DEFAULT_COMMERCIAL)

  // UI state
  const [previewOpen, setPreviewOpen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // ── Build config ────────────────────────────────────────────────────────────

  const config: LotConfig = useMemo(() => {
    switch (template) {
      case 'simple_sequential':
        return { template, ...simpleState, type, tantieme }
      case 'wings_floors':
        return { template, ...wingsState, type, tantieme }
      case 'floor_based':
        return { template, ...floorState, type, tantieme }
      case 'villa_townhouse':
        return { template, ...villaState, type, tantieme }
      case 'residence_ensemble':
        return { template, ...ensembleState, type, tantieme }
      case 'commercial_mixed':
        return { template, ...commercialState, tantieme }
    }
  }, [
    template,
    simpleState,
    wingsState,
    floorState,
    villaState,
    ensembleState,
    commercialState,
    type,
    tantieme,
  ])

  const totalCount = useMemo(() => countLots(config), [config])

  const previewLots = useMemo(() => {
    if (totalCount === 0) return []
    return generateLots(config).slice(0, 10)
  }, [config, totalCount])

  // ── Template switch ─────────────────────────────────────────────────────────

  function handleTemplateChange(t: LotTemplate) {
    setTemplate(t)
    // Reset only villa type default when switching to villa
    if (t === 'villa_townhouse') {
      setType('autre')
    } else if (template === 'villa_townhouse') {
      setType('appartement')
    }
  }

  // ── Generate handler ────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (totalCount === 0) return
    const lots = generateLots(config)
    setIsGenerating(true)
    try {
      await Promise.all(
        lots.map((lot) =>
          storeLot(residenceId, {
            numero: lot.numero,
            type: lot.type,
            etage: lot.etage,
            superficie: 0,
            tantieme: lot.tantieme,
            immeuble_id: immeubleId,
          }),
        ),
      )
      onSuccess(lots.length)
      onOpenChange(false)
    } catch {
      toast.error(t('gestionnaire.generateLots.genError'))
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Wings helpers ───────────────────────────────────────────────────────────

  function addWing() {
    if (wingsState.wings.length >= 10) return
    const letter = nextWingLetter(wingsState.wings)
    setWingsState((s) => ({ ...s, wings: [...s.wings, letter] }))
  }

  function removeWing(idx: number) {
    setWingsState((s) => ({ ...s, wings: s.wings.filter((_, i) => i !== idx) }))
  }

  // ── Entrance helpers ────────────────────────────────────────────────────────

  function addEntrance() {
    setEnsembleState((s) => ({
      entrances: [...s.entrances, { name: '', count: 0 }],
    }))
  }

  function removeEntrance(idx: number) {
    setEnsembleState((s) => ({
      entrances: s.entrances.filter((_, i) => i !== idx),
    }))
  }

  function updateEntrance(idx: number, patch: Partial<EntranceItem>) {
    setEnsembleState((s) => ({
      entrances: s.entrances.map((e, i) =>
        i === idx ? { ...e, ...patch } : e,
      ),
    }))
  }

  // ── UnitType helpers ────────────────────────────────────────────────────────

  function addUnitType() {
    setCommercialState((s) => ({
      unitTypes: [...s.unitTypes, { label: '', count: 0 }],
    }))
  }

  function removeUnitType(idx: number) {
    setCommercialState((s) => ({
      unitTypes: s.unitTypes.filter((_, i) => i !== idx),
    }))
  }

  function updateUnitType(idx: number, patch: Partial<UnitTypeItem>) {
    setCommercialState((s) => ({
      unitTypes: s.unitTypes.map((u, i) =>
        i === idx ? { ...u, ...patch } : u,
      ),
    }))
  }

  // ── Shared field renderers ──────────────────────────────────────────────────

  function TypeSelect({
    value,
    onChange,
  }: {
    value: string
    onChange: (v: string) => void
  }) {
    return (
      <div className="flex flex-col gap-1">
        <Label>Type de lot</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                <span className="capitalize">{t}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  function TantiemeInput({
    value,
    onChange,
  }: {
    value: number
    onChange: (v: number) => void
  }) {
    return (
      <div className="flex flex-col gap-1">
        <Label>{t('gestionnaire.generateLots.tantiemePerLot')}</Label>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    )
  }

  // ── Config fields by template ───────────────────────────────────────────────

  function renderConfigFields() {
    switch (template) {
      case 'simple_sequential':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Total lots</Label>
              <Input
                type="number"
                min={1}
                value={simpleState.totalLots}
                onChange={(e) =>
                  setSimpleState((s) => ({
                    ...s,
                    totalLots: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t('gestionnaire.generateLots.startNumber')}</Label>
              <Input
                type="number"
                value={simpleState.startingNumber}
                onChange={(e) =>
                  setSimpleState((s) => ({
                    ...s,
                    startingNumber: Number(e.target.value),
                  }))
                }
              />
            </div>
            <TypeSelect value={type} onChange={setType} />
            <TantiemeInput value={tantieme} onChange={setTantieme} />
          </div>
        )

      case 'wings_floors':
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Ailes / Blocs</Label>
              <div className="flex flex-wrap gap-2">
                {wingsState.wings.map((wing, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    {wing}
                    <button
                      type="button"
                      onClick={() => removeWing(idx)}
                      className="ml-1 rounded-full hover:text-destructive"
                      aria-label={`Supprimer l'aile ${wing}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {wingsState.wings.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addWing}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Ajouter une aile
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <Label>{t('gestionnaire.generateLots.floorsCount')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={wingsState.floors}
                  onChange={(e) =>
                    setWingsState((s) => ({
                      ...s,
                      floors: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>
                  Étage de départ
                  <span className="ml-1 text-xs text-muted-foreground">
                    (négatif pour sous-sols)
                  </span>
                </Label>
                <Input
                  type="number"
                  value={wingsState.startingFloor}
                  onChange={(e) =>
                    setWingsState((s) => ({
                      ...s,
                      startingFloor: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>{t('gestionnaire.generateLots.lotsPerFloorWing')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={wingsState.unitsPerFloor}
                  onChange={(e) =>
                    setWingsState((s) => ({
                      ...s,
                      unitsPerFloor: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>{t('gestionnaire.generateLots.startNumber')}</Label>
                <Input
                  type="number"
                  value={wingsState.startingNumber}
                  onChange={(e) =>
                    setWingsState((s) => ({
                      ...s,
                      startingNumber: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <TypeSelect value={type} onChange={setType} />
              <TantiemeInput value={tantieme} onChange={setTantieme} />
            </div>
          </div>
        )

      case 'floor_based':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>{t('gestionnaire.generateLots.floorsCount')}</Label>
              <Input
                type="number"
                min={1}
                value={floorState.floors}
                onChange={(e) =>
                  setFloorState((s) => ({
                    ...s,
                    floors: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>
                Étage de départ
                <span className="ml-1 text-xs text-muted-foreground">
                  (négatif pour sous-sols)
                </span>
              </Label>
              <Input
                type="number"
                value={floorState.startingFloor}
                onChange={(e) =>
                  setFloorState((s) => ({
                    ...s,
                    startingFloor: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t('gestionnaire.generateLots.lotsPerFloor')}</Label>
              <Input
                type="number"
                min={1}
                value={floorState.unitsPerFloor}
                onChange={(e) =>
                  setFloorState((s) => ({
                    ...s,
                    unitsPerFloor: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t('gestionnaire.generateLots.startNumber')}</Label>
              <Input
                type="number"
                value={floorState.startingNumber}
                onChange={(e) =>
                  setFloorState((s) => ({
                    ...s,
                    startingNumber: Number(e.target.value),
                  }))
                }
              />
            </div>
            <TypeSelect value={type} onChange={setType} />
            <TantiemeInput value={tantieme} onChange={setTantieme} />
          </div>
        )

      case 'villa_townhouse':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Total villas</Label>
              <Input
                type="number"
                min={1}
                value={villaState.totalVillas}
                onChange={(e) =>
                  setVillaState((s) => ({
                    ...s,
                    totalVillas: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t('gestionnaire.generateLots.startNumber')}</Label>
              <Input
                type="number"
                value={villaState.startingNumber}
                onChange={(e) =>
                  setVillaState((s) => ({
                    ...s,
                    startingNumber: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t('gestionnaire.generateLots.prefix')}</Label>
              <Input
                value={villaState.prefix}
                onChange={(e) =>
                  setVillaState((s) => ({ ...s, prefix: e.target.value }))
                }
                placeholder="Villa"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Phase</Label>
              <Input
                value={villaState.phase}
                onChange={(e) =>
                  setVillaState((s) => ({ ...s, phase: e.target.value }))
                }
                placeholder="Phase 1 (optionnel)"
              />
            </div>
            <TypeSelect value={type} onChange={setType} />
            <TantiemeInput value={tantieme} onChange={setTantieme} />
          </div>
        )

      case 'residence_ensemble':
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>{t('gestionnaire.generateLots.entries')}</Label>
              <div className="space-y-2">
                {ensembleState.entrances.map((entrance, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="w-28"
                      placeholder="E1"
                      value={entrance.name}
                      onChange={(e) =>
                        updateEntrance(idx, { name: e.target.value })
                      }
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      placeholder="Nb lots"
                      value={entrance.count === 0 ? '' : entrance.count}
                      onChange={(e) =>
                        updateEntrance(idx, { count: Number(e.target.value) })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntrance(idx)}
                      className="text-destructive hover:text-destructive"
                      aria-label="Supprimer l'entrée"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={addEntrance}
              >
                <Plus className="size-3.5 mr-1" />
                Ajouter une entrée
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TypeSelect value={type} onChange={setType} />
              <TantiemeInput value={tantieme} onChange={setTantieme} />
            </div>
          </div>
        )

      case 'commercial_mixed':
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>{t('gestionnaire.generateLots.unitTypes')}</Label>
              <div className="space-y-2">
                {commercialState.unitTypes.map((unitType, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Boutique"
                      value={unitType.label}
                      onChange={(e) =>
                        updateUnitType(idx, { label: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      placeholder={t('gestionnaire.generateLots.quantity')}
                      value={unitType.count === 0 ? '' : unitType.count}
                      onChange={(e) =>
                        updateUnitType(idx, { count: Number(e.target.value) })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUnitType(idx)}
                      className="text-destructive hover:text-destructive"
                      aria-label="Supprimer le type"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={addUnitType}
              >
                <Plus className="size-3.5 mr-1" />
                Ajouter un type
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TantiemeInput value={tantieme} onChange={setTantieme} />
            </div>
          </div>
        )
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-[var(--color-imaro-primary)]" />
            <DialogTitle>
              {t('gestionnaire.generateLots.generateTitle')}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{immeubleName}</p>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Template cards */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Modèles rapides
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_CARDS.map((card) => (
                <button
                  key={card.template}
                  type="button"
                  onClick={() => handleTemplateChange(card.template)}
                  className={[
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    template === card.template
                      ? 'border-[var(--color-imaro-primary)] bg-[var(--color-imaro-primary)]/5'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                      template === card.template
                        ? 'border-[var(--color-imaro-primary)]'
                        : 'border-muted-foreground/40',
                    ].join(' ')}
                  >
                    {template === card.template && (
                      <span className="size-2 rounded-full bg-[var(--color-imaro-primary)]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {card.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {card.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Configuration */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Configuration
            </h3>
            {renderConfigFields()}
          </section>

          {/* Preview */}
          <section className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <span>
                Aperçu — premiers{' '}
                <span className="font-semibold">
                  {Math.min(10, totalCount)}
                </span>{' '}
                lots sur <span className="font-semibold">{totalCount}</span>
              </span>
              {previewOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {previewOpen && (
              <div className="border-t divide-y">
                {totalCount === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Aucun lot à générer avec cette configuration.
                  </p>
                ) : (
                  previewLots.map((lot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Home className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{lot.numero}</span>
                      <span className="text-muted-foreground">
                        • Tantième : {lot.tantieme}
                      </span>
                    </div>
                  ))
                )}
                {totalCount > 10 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground italic">
                    … et {totalCount - 10} lots supplémentaires
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleGenerate()
            }}
            disabled={totalCount === 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Génération en cours...
              </>
            ) : (
              <>
                <Zap className="mr-1.5 size-4" />
                Générer {totalCount} lots
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
