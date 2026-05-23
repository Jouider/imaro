import type { ImportConfig, ImportContext } from '../types'
import { validateNumber, parseNumber, validateDate, parseFlexDate } from '../validators'

export type SoldeImportPayload = {
  lot_id: number
  montant: number
  date_arrete?: string
}

export const soldesConfig: ImportConfig<SoldeImportPayload> = {
  id: 'soldes',
  labelKey: 'gestionnaire.imports.tabs.soldes',
  icon: 'Scale',
  columns: [
    {
      key: 'lot_numero',
      label: 'Numéro du lot',
      aliases: ['lot', 'numero lot', 'numéro lot', 'n° lot', 'n°lot', 'unit', 'num lot'],
      type: 'string',
      required: true,
    },
    {
      key: 'solde',
      label: 'Solde (DH)',
      aliases: ['solde', 'balance', 'montant du', 'montant dû', 'arriere', 'arriéré', 'impaye', 'impayé', 'dette', 'montant'],
      type: 'number',
      required: true,
    },
    {
      key: 'date_arrete',
      label: "Date d'arrêté",
      aliases: ['date', 'date arrete', 'date arrêté', 'au', 'date solde', 'a la date du'],
      type: 'date',
      required: false,
    },
  ],

  validate(row: Record<string, unknown>, ctx: ImportContext): string[] {
    const errors: string[] = []

    const lotNumero = String(row.lot_numero ?? '').trim()
    if (!lotNumero) {
      errors.push('Numéro de lot requis')
    } else {
      const found = ctx.existingLots.find(
        (l) => l.numero.toLowerCase() === lotNumero.toLowerCase(),
      )
      if (!found) {
        errors.push(`Lot "${lotNumero}" introuvable dans cette résidence`)
      }
    }

    const soldeStr = String(row.solde ?? '').trim()
    if (!soldeStr) {
      errors.push('Solde requis')
    } else if (!validateNumber(soldeStr)) {
      errors.push('Solde invalide (nombre attendu)')
    }

    const dateStr = String(row.date_arrete ?? '').trim()
    if (dateStr && !validateDate(dateStr)) {
      errors.push('Date invalide (formats: YYYY-MM-DD ou DD/MM/YYYY)')
    }

    return errors
  },

  transform(row: Record<string, unknown>, ctx: ImportContext): SoldeImportPayload {
    const lotNumero = String(row.lot_numero ?? '').trim()
    const lot = ctx.existingLots.find(
      (l) => l.numero.toLowerCase() === lotNumero.toLowerCase(),
    )

    const dateStr = String(row.date_arrete ?? '').trim()

    return {
      lot_id: lot?.id ?? 0,
      montant: parseNumber(String(row.solde ?? '0')),
      ...(dateStr ? { date_arrete: parseFlexDate(dateStr) } : {}),
    }
  },

  endpoint: '/gestionnaire/residences/{id}/import-soldes',
  method: 'POST',
  chunkSize: 50,
  templateFileName: 'imaro-soldes-template.xlsx',
  templateExampleRows: [
    { lot_numero: 'A-101', solde: -1500, date_arrete: '2026-06-01' },
    { lot_numero: 'A-102', solde: 0, date_arrete: '2026-06-01' },
  ],
}
