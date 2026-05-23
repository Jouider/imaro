import type { ImportConfig, ImportContext } from '../types'
import { validateNumber, parseNumber } from '../validators'

const LOT_TYPES = ['appartement', 'commerce', 'parking', 'cave', 'bureau', 'autre']

export type LotImportPayload = {
  numero: string
  type: string
  etage?: number
  superficie?: number
  tantieme: number
  immeuble_id?: number
}

export const lotsConfig: ImportConfig<LotImportPayload> = {
  id: 'lots',
  labelKey: 'gestionnaire.imports.tabs.lots',
  icon: 'Building2',
  columns: [
    {
      key: 'numero',
      label: 'Numéro du lot',
      aliases: ['numero', 'num lot', 'n° lot', 'n°lot', 'lot', 'unit', 'numero lot', 'num'],
      type: 'string',
      required: true,
    },
    {
      key: 'type',
      label: 'Type',
      aliases: ['type', 'type lot', 'categorie', 'catégorie', 'type de lot'],
      type: 'string',
      required: false,
    },
    {
      key: 'etage',
      label: 'Étage',
      aliases: ['etage', 'étage', 'floor', 'niveau', 'niv'],
      type: 'number',
      required: false,
    },
    {
      key: 'superficie',
      label: 'Superficie (m²)',
      aliases: ['superficie', 'surface', 'm2', 'm²', 'sup', 'area'],
      type: 'number',
      required: false,
    },
    {
      key: 'tantieme',
      label: 'Tantième',
      aliases: ['tantieme', 'tantième', 'millieme', 'millième', 'quote-part', 'quote part', 'tantiemes', 'tantièmes'],
      type: 'number',
      required: true,
    },
    {
      key: 'immeuble',
      label: 'Immeuble',
      aliases: ['immeuble', 'building', 'bloc', 'block', 'batiment', 'bâtiment'],
      type: 'string',
      required: false,
    },
  ],

  validate(row: Record<string, unknown>): string[] {
    const errors: string[] = []
    const numero = String(row.numero ?? '').trim()
    if (!numero) errors.push('Numéro du lot requis')

    const tantiemeStr = String(row.tantieme ?? '').trim()
    if (!tantiemeStr) {
      errors.push('Tantième requis')
    } else if (!validateNumber(tantiemeStr)) {
      errors.push('Tantième invalide (nombre attendu)')
    } else if (parseNumber(tantiemeStr) <= 0) {
      errors.push('Tantième doit être > 0')
    }

    const typeVal = String(row.type ?? '').trim().toLowerCase()
    if (typeVal && !LOT_TYPES.includes(typeVal)) {
      errors.push(`Type inconnu: "${typeVal}" (attendu: ${LOT_TYPES.join(', ')})`)
    }

    const superficieStr = String(row.superficie ?? '').trim()
    if (superficieStr && !validateNumber(superficieStr)) {
      errors.push('Superficie invalide (nombre attendu)')
    }

    const etageStr = String(row.etage ?? '').trim()
    if (etageStr && !validateNumber(etageStr)) {
      errors.push('Étage invalide (nombre attendu)')
    }

    return errors
  },

  transform(row: Record<string, unknown>, ctx: ImportContext): LotImportPayload {
    const typeVal = String(row.type ?? '').trim().toLowerCase()
    const immeubleStr = String(row.immeuble ?? '').trim()
    const etageStr = String(row.etage ?? '').trim()
    const superficieStr = String(row.superficie ?? '').trim()

    // Resolve immeuble name → id
    let immeuble_id: number | undefined
    if (immeubleStr) {
      const found = ctx.existingImmeubles.find(
        (i) => i.nom.toLowerCase() === immeubleStr.toLowerCase(),
      )
      if (found) immeuble_id = found.id
    }

    return {
      numero: String(row.numero ?? '').trim(),
      type: LOT_TYPES.includes(typeVal) ? typeVal : 'appartement',
      ...(etageStr ? { etage: parseNumber(etageStr) } : {}),
      ...(superficieStr ? { superficie: parseNumber(superficieStr) } : {}),
      tantieme: parseNumber(String(row.tantieme ?? '0')),
      ...(immeuble_id ? { immeuble_id } : {}),
    }
  },

  endpoint: '/gestionnaire/residences/{id}/lots/bulk',
  method: 'POST',
  chunkSize: 50,
  templateFileName: 'imaro-lots-template.xlsx',
  templateExampleRows: [
    { numero: 'A-101', type: 'appartement', etage: 1, superficie: 85, tantieme: 45, immeuble: 'Bloc A' },
    { numero: 'P-01', type: 'parking', etage: -1, superficie: 15, tantieme: 8, immeuble: 'Bloc A' },
  ],
}
