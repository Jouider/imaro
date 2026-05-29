import type { ImportConfig } from '../types'
import { validatePhone, normalizePhone, validateEmail } from '../validators'

export type PrestataireImportPayload = {
  nom: string
  specialite?: string
  telephone?: string
  email?: string
  adresse?: string
}

export const prestatairesConfig: ImportConfig<PrestataireImportPayload> = {
  id: 'prestataires',
  labelKey: 'gestionnaire.imports.tabs.prestataires',
  icon: 'Hammer',
  columns: [
    {
      key: 'nom',
      label: 'Nom / Raison sociale',
      aliases: [
        'nom',
        'raison sociale',
        'entreprise',
        'name',
        'societe',
        'société',
        'fournisseur',
      ],
      type: 'string',
      required: true,
    },
    {
      key: 'specialite',
      label: 'Spécialité',
      aliases: [
        'specialite',
        'spécialité',
        'metier',
        'métier',
        'service',
        'activite',
        'activité',
      ],
      type: 'string',
      required: false,
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      aliases: ['telephone', 'téléphone', 'tel', 'phone', 'gsm', 'mobile'],
      type: 'phone',
      required: false,
    },
    {
      key: 'email',
      label: 'Email',
      aliases: ['email', 'e-mail', 'courriel', 'mail'],
      type: 'email',
      required: false,
    },
    {
      key: 'adresse',
      label: 'Adresse',
      aliases: ['adresse', 'address', 'localisation', 'ville'],
      type: 'string',
      required: false,
    },
  ],

  validate(row: Record<string, unknown>): string[] {
    const errors: string[] = []

    const nom = String(row.nom ?? '').trim()
    if (!nom) errors.push('Nom requis')

    const phone = String(row.telephone ?? '').trim()
    if (phone && !validatePhone(phone)) {
      errors.push('Téléphone invalide (format marocain attendu)')
    }

    const email = String(row.email ?? '').trim()
    if (email && !validateEmail(email)) {
      errors.push('Email invalide')
    }

    return errors
  },

  transform(row: Record<string, unknown>): PrestataireImportPayload {
    const phone = String(row.telephone ?? '').trim()
    const email = String(row.email ?? '').trim()
    const specialite = String(row.specialite ?? '').trim()
    const adresse = String(row.adresse ?? '').trim()

    return {
      nom: String(row.nom ?? '').trim(),
      ...(specialite ? { specialite } : {}),
      ...(phone ? { telephone: normalizePhone(phone) } : {}),
      ...(email ? { email } : {}),
      ...(adresse ? { adresse } : {}),
    }
  },

  endpoint: '/gestionnaire/prestataires/bulk',
  method: 'POST',
  chunkSize: 50,
  templateFileName: 'imaro-prestataires-template.xlsx',
  templateExampleRows: [
    {
      nom: 'OTIS Maroc',
      specialite: 'Ascenseurs',
      telephone: '0522123456',
      email: 'contact@otis.ma',
      adresse: 'Casablanca',
    },
    {
      nom: 'ProNet Services',
      specialite: 'Nettoyage',
      telephone: '0661234567',
      email: '',
      adresse: 'Rabat',
    },
  ],
}
