// Pure TypeScript lot generation logic — no React, no app imports.

export type LotTemplate =
  | 'simple_sequential'
  | 'wings_floors'
  | 'floor_based'
  | 'villa_townhouse'
  | 'residence_ensemble'
  | 'commercial_mixed'

export interface GeneratedLot {
  numero: string
  etage: number // 0 if not floor-based
  type: string // default 'appartement'
  tantieme: number // default 1
}

// ─── Config types ─────────────────────────────────────────────────────────────

export interface SimpleSequentialConfig {
  template: 'simple_sequential'
  totalLots: number
  startingNumber: number
  type: string
  tantieme: number
}

export interface WingsFloorsConfig {
  template: 'wings_floors'
  wings: string[]
  floors: number
  startingFloor: number
  unitsPerFloor: number
  startingNumber: number
  type: string
  tantieme: number
}

export interface FloorBasedConfig {
  template: 'floor_based'
  floors: number
  startingFloor: number
  unitsPerFloor: number
  startingNumber: number
  type: string
  tantieme: number
}

export interface VillaTownhouseConfig {
  template: 'villa_townhouse'
  totalVillas: number
  prefix: string
  phase: string
  startingNumber: number
  type: string
  tantieme: number
}

export interface EntranceItem {
  name: string
  count: number
}

export interface ResidenceEnsembleConfig {
  template: 'residence_ensemble'
  entrances: EntranceItem[]
  type: string
  tantieme: number
}

export interface UnitTypeItem {
  label: string
  count: number
}

export interface CommercialMixedConfig {
  template: 'commercial_mixed'
  unitTypes: UnitTypeItem[]
  tantieme: number
}

export type LotConfig =
  | SimpleSequentialConfig
  | WingsFloorsConfig
  | FloorBasedConfig
  | VillaTownhouseConfig
  | ResidenceEnsembleConfig
  | CommercialMixedConfig

// ─── Generators ──────────────────────────────────────────────────────────────

function generateSimpleSequential(
  config: SimpleSequentialConfig,
): GeneratedLot[] {
  const lots: GeneratedLot[] = []
  for (let i = 0; i < config.totalLots; i++) {
    lots.push({
      numero: String(config.startingNumber + i),
      etage: 0,
      type: config.type,
      tantieme: config.tantieme,
    })
  }
  return lots
}

function generateWingsFloors(config: WingsFloorsConfig): GeneratedLot[] {
  const lots: GeneratedLot[] = []
  for (const wing of config.wings) {
    for (let floorIdx = 0; floorIdx < config.floors; floorIdx++) {
      const floorLabel = config.startingFloor + floorIdx + 1
      const etage = config.startingFloor + floorIdx
      for (let unitIdx = 0; unitIdx < config.unitsPerFloor; unitIdx++) {
        const unitNum = config.startingNumber + unitIdx
        const numero = `${wing}${floorLabel}${String(unitNum).padStart(2, '0')}`
        lots.push({
          numero,
          etage,
          type: config.type,
          tantieme: config.tantieme,
        })
      }
    }
  }
  return lots
}

function generateFloorBased(config: FloorBasedConfig): GeneratedLot[] {
  const lots: GeneratedLot[] = []
  for (let floorIdx = 0; floorIdx < config.floors; floorIdx++) {
    const floorLabel = config.startingFloor + floorIdx + 1
    const etage = config.startingFloor + floorIdx
    for (let unitIdx = 0; unitIdx < config.unitsPerFloor; unitIdx++) {
      const unitNum = config.startingNumber + unitIdx
      const numero = `${floorLabel}${String(unitNum).padStart(2, '0')}`
      lots.push({ numero, etage, type: config.type, tantieme: config.tantieme })
    }
  }
  return lots
}

function generateVillaTownhouse(config: VillaTownhouseConfig): GeneratedLot[] {
  const lots: GeneratedLot[] = []
  for (let i = 0; i < config.totalVillas; i++) {
    const n = config.startingNumber + i
    const numero =
      config.phase.trim() !== ''
        ? `${config.phase.trim()}-${config.prefix} ${n}`
        : `${config.prefix} ${n}`
    lots.push({
      numero,
      etage: 0,
      type: config.type,
      tantieme: config.tantieme,
    })
  }
  return lots
}

function generateResidenceEnsemble(
  config: ResidenceEnsembleConfig,
): GeneratedLot[] {
  const lots: GeneratedLot[] = []
  for (const entrance of config.entrances) {
    if (entrance.count <= 0) continue
    for (let i = 1; i <= entrance.count; i++) {
      lots.push({
        numero: `${entrance.name}-${i}`,
        etage: 0,
        type: config.type,
        tantieme: config.tantieme,
      })
    }
  }
  return lots
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function generateCommercialMixed(
  config: CommercialMixedConfig,
): GeneratedLot[] {
  const lots: GeneratedLot[] = []
  for (const unitType of config.unitTypes) {
    if (unitType.count <= 0) continue
    for (let i = 0; i < unitType.count; i++) {
      const suffix =
        unitType.count <= 26 ? (LETTERS[i] ?? String(i + 1)) : String(i + 1)
      lots.push({
        numero: `${unitType.label} ${suffix}`,
        etage: 0,
        type: 'commerce',
        tantieme: config.tantieme,
      })
    }
  }
  return lots
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateLots(config: LotConfig): GeneratedLot[] {
  switch (config.template) {
    case 'simple_sequential':
      return generateSimpleSequential(config)
    case 'wings_floors':
      return generateWingsFloors(config)
    case 'floor_based':
      return generateFloorBased(config)
    case 'villa_townhouse':
      return generateVillaTownhouse(config)
    case 'residence_ensemble':
      return generateResidenceEnsemble(config)
    case 'commercial_mixed':
      return generateCommercialMixed(config)
  }
}

export function countLots(config: LotConfig): number {
  switch (config.template) {
    case 'simple_sequential':
      return Math.max(0, config.totalLots)
    case 'wings_floors':
      return (
        config.wings.length *
        Math.max(0, config.floors) *
        Math.max(0, config.unitsPerFloor)
      )
    case 'floor_based':
      return Math.max(0, config.floors) * Math.max(0, config.unitsPerFloor)
    case 'villa_townhouse':
      return Math.max(0, config.totalVillas)
    case 'residence_ensemble':
      return config.entrances.reduce((sum, e) => sum + Math.max(0, e.count), 0)
    case 'commercial_mixed':
      return config.unitTypes.reduce((sum, u) => sum + Math.max(0, u.count), 0)
  }
}
