import type { ImportConfig, ImportContext } from '../types'
import { validateNumber, parseNumber, validateDate, parseFlexDate } from '../validators'

const MODES_PAIEMENT = ['especes', 'virement', 'cheque', 'mobile', 'cb']

export type PaiementImportPayload = {
  lot_id: number
  coproprietaire_id?: number
  montant: number
  date_paiement: string
  mode?: string
  reference?: string
  note?: string
}

export const paiementsConfig: ImportConfig<PaiementImportPayload> = {
  id: 'paiements',
  labelKey: 'gestionnaire.imports.tabs.paiements',
  icon: 'CreditCard',
  columns: [
    {
      key: 'lot_numero',
      label: 'Numéro du lot',
      aliases: ['lot', 'numero lot', 'numéro lot', 'n° lot', 'n°lot', 'unit', 'num lot'],
      type: 'string',
      required: true,
    },
    {
      key: 'montant',
      label: 'Montant (DH)',
      aliases: ['montant', 'amount', 'somme', 'montant paye', 'montant payé'],
      type: 'number',
      required: true,
    },
    {
      key: 'date',
      label: 'Date de paiement',
      aliases: ['date', 'date paiement', 'date_paiement', 'date de paiement', 'paye le', 'payé le'],
      type: 'date',
      required: true,
    },
    {
      key: 'mode',
      label: 'Mode de paiement',
      aliases: ['mode', 'mode paiement', 'mode de paiement', 'type paiement', 'methode'],
      type: 'string',
      required: false,
    },
    {
      key: 'reference',
      label: 'Référence',
      aliases: ['reference', 'référence', 'ref', 'num cheque', 'n° cheque', 'n° chèque'],
      type: 'string',
      required: false,
    },
    {
      key: 'note',
      label: 'Note',
      aliases: ['note', 'notes', 'commentaire', 'observation', 'remarque'],
      type: 'string',
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

    const montantStr = String(row.montant ?? '').trim()
    if (!montantStr) {
      errors.push('Montant requis')
    } else if (!validateNumber(montantStr)) {
      errors.push('Montant invalide (nombre attendu)')
    } else if (parseNumber(montantStr) <= 0) {
      errors.push('Montant doit être > 0')
    }

    const dateStr = String(row.date ?? '').trim()
    if (!dateStr) {
      errors.push('Date de paiement requise')
    } else if (!validateDate(dateStr)) {
      errors.push('Date invalide (formats: YYYY-MM-DD ou DD/MM/YYYY)')
    }

    const mode = String(row.mode ?? '').trim().toLowerCase()
    if (mode && !MODES_PAIEMENT.includes(mode)) {
      errors.push(`Mode inconnu: "${mode}" (attendu: ${MODES_PAIEMENT.join(', ')})`)
    }

    return errors
  },

  transform(row: Record<string, unknown>, ctx: ImportContext): PaiementImportPayload {
    const lotNumero = String(row.lot_numero ?? '').trim()
    const lot = ctx.existingLots.find(
      (l) => l.numero.toLowerCase() === lotNumero.toLowerCase(),
    )

    // Try to resolve coproprietaire from lot
    const copro = ctx.existingCoproprietaires.find((c) => c.lot_id === lot?.id)

    const mode = String(row.mode ?? '').trim().toLowerCase()
    const reference = String(row.reference ?? '').trim()
    const note = String(row.note ?? '').trim()

    return {
      lot_id: lot?.id ?? 0,
      ...(copro ? { coproprietaire_id: copro.id } : {}),
      montant: parseNumber(String(row.montant ?? '0')),
      date_paiement: parseFlexDate(String(row.date ?? '')),
      ...(mode && MODES_PAIEMENT.includes(mode) ? { mode } : { mode: 'especes' }),
      ...(reference ? { reference } : {}),
      ...(note ? { note } : {}),
    }
  },

  endpoint: '/gestionnaire/residences/{id}/import-paiements',
  method: 'POST',
  chunkSize: 50,
  templateFileName: 'imaro-paiements-template.xlsx',
  templateExampleRows: [
    { lot_numero: 'A-101', montant: 750, date: '15/01/2026', mode: 'virement', reference: 'VIR-001', note: '' },
    { lot_numero: 'A-102', montant: 500, date: '20/02/2026', mode: 'especes', reference: '', note: 'Paiement partiel' },
  ],
}
