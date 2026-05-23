import type { ImportConfig, ImportContext } from '../types'
import { validatePhone, normalizePhone, validateEmail } from '../validators'

export type CoproprietaireImportPayload = {
  name: string
  phone: string
  email?: string
  lot_id: number
  cin?: string
}

export const coproprietairesConfig: ImportConfig<CoproprietaireImportPayload> = {
  id: 'coproprietaires',
  labelKey: 'gestionnaire.imports.tabs.coproprietaires',
  icon: 'Users',
  columns: [
    {
      key: 'name',
      label: 'Nom complet',
      aliases: ['nom', 'name', 'nom complet', 'proprietaire', 'propriétaire', 'nom et prenom', 'nom et prénom'],
      type: 'string',
      required: true,
    },
    {
      key: 'phone',
      label: 'Téléphone',
      aliases: ['telephone', 'téléphone', 'tel', 'phone', 'gsm', 'mobile', 'num tel', 'n° tel'],
      type: 'phone',
      required: true,
    },
    {
      key: 'email',
      label: 'Email',
      aliases: ['email', 'e-mail', 'courriel', 'mail', 'adresse email'],
      type: 'email',
      required: false,
    },
    {
      key: 'lot_numero',
      label: 'Numéro du lot',
      aliases: ['lot', 'numero lot', 'numéro lot', 'n° lot', 'n°lot', 'unit', 'num lot'],
      type: 'string',
      required: true,
    },
    {
      key: 'cin',
      label: 'CIN',
      aliases: ['cin', 'carte identite', 'carte identité', 'id card', 'cni', 'numero cin'],
      type: 'string',
      required: false,
    },
  ],

  validate(row: Record<string, unknown>, ctx: ImportContext): string[] {
    const errors: string[] = []

    const name = String(row.name ?? '').trim()
    if (!name) errors.push('Nom requis')

    const phone = String(row.phone ?? '').trim()
    if (!phone) {
      errors.push('Téléphone requis')
    } else if (!validatePhone(phone)) {
      errors.push('Téléphone invalide (format marocain attendu)')
    }

    const email = String(row.email ?? '').trim()
    if (email && !validateEmail(email)) {
      errors.push('Email invalide')
    }

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

    return errors
  },

  transform(row: Record<string, unknown>, ctx: ImportContext): CoproprietaireImportPayload {
    const lotNumero = String(row.lot_numero ?? '').trim()
    const lot = ctx.existingLots.find(
      (l) => l.numero.toLowerCase() === lotNumero.toLowerCase(),
    )
    const email = String(row.email ?? '').trim()
    const cin = String(row.cin ?? '').trim()

    return {
      name: String(row.name ?? '').trim(),
      phone: normalizePhone(String(row.phone ?? '').trim()),
      ...(email ? { email } : {}),
      lot_id: lot?.id ?? 0,
      ...(cin ? { cin } : {}),
    }
  },

  endpoint: '/gestionnaire/coproprietaires/bulk',
  method: 'POST',
  chunkSize: 50,
  templateFileName: 'imaro-coproprietaires-template.xlsx',
  templateExampleRows: [
    { name: 'Hassan Benali', phone: '0612345678', email: 'hassan@email.com', lot_numero: 'A-101', cin: 'AB123456' },
    { name: 'Fatima Chraibi', phone: '0698765432', email: '', lot_numero: 'A-102', cin: '' },
  ],
}
