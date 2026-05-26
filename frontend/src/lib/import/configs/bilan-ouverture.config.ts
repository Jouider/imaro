import type { ImportConfig } from '../types'
import { validateNumber, parseNumber } from '../validators'

/**
 * Bilan d'ouverture comptable — soldes initiaux par compte du Plan Comptable
 * Marocain syndic, lors de la reprise d'une comptabilité existante ou la
 * création d'un nouvel exercice.
 *
 * Une ligne = un compte avec son solde de départ (en débit OU en crédit, jamais
 * les deux). Le total débit doit égaler le total crédit (balance équilibrée).
 *
 * Comptes attendus (Plan Comptable Marocain Syndic) :
 *   Classe 1 (capitaux propres) :   1111-1999
 *   Classe 2 (immobilisations) :    2111-2999
 *   Classe 3 (actif circulant) :    3411-3999
 *   Classe 4 (dettes circulant) :   4411-4999
 *   Classe 5 (trésorerie) :         5111-5999
 *   (Classes 6 et 7 sont pour les charges/produits, pas en bilan d'ouverture)
 */
export type BilanOuverturePayload = {
  numero_compte: string
  libelle: string
  solde_debit: number
  solde_credit: number
}

const COMPTE_REGEX = /^[1-5]\d{2,5}$/

export const bilanOuvertureConfig: ImportConfig<BilanOuverturePayload> = {
  id: 'bilan-ouverture',
  labelKey: 'gestionnaire.imports.tabs.bilanOuverture',
  icon: 'BookOpen',
  columns: [
    {
      key: 'numero_compte',
      label: 'Numéro de compte',
      aliases: ['numero compte', 'numéro compte', 'n compte', 'numero', 'numéro', 'compte', 'cpt', 'account', 'code'],
      type: 'string',
      required: true,
    },
    {
      key: 'libelle',
      label: 'Libellé du compte',
      aliases: ['libelle', 'libellé', 'nom', 'designation', 'description', 'intitulé', 'intitule', 'label'],
      type: 'string',
      required: true,
    },
    {
      key: 'solde_debit',
      label: 'Solde débit',
      aliases: ['solde debit', 'solde débit', 'debit', 'débit', 'sd', 'd', 'dr'],
      type: 'number',
      required: false,
    },
    {
      key: 'solde_credit',
      label: 'Solde crédit',
      aliases: ['solde credit', 'solde crédit', 'credit', 'crédit', 'sc', 'c', 'cr'],
      type: 'number',
      required: false,
    },
  ],

  validate(row: Record<string, unknown>): string[] {
    const errors: string[] = []
    const numero = String(row.numero_compte ?? '').trim()
    const libelle = String(row.libelle ?? '').trim()
    const debitStr  = String(row.solde_debit  ?? '').trim()
    const creditStr = String(row.solde_credit ?? '').trim()

    if (!numero) errors.push('Numéro de compte requis')
    else if (!COMPTE_REGEX.test(numero)) {
      errors.push('Numéro invalide — doit commencer par 1-5 (Plan Comptable Marocain Syndic)')
    }

    if (!libelle) errors.push('Libellé requis')

    const debit  = debitStr  ? parseNumber(debitStr)  : 0
    const credit = creditStr ? parseNumber(creditStr) : 0

    if (debitStr && !validateNumber(debitStr))   errors.push('Solde débit invalide')
    if (creditStr && !validateNumber(creditStr)) errors.push('Solde crédit invalide')

    if (debit === 0 && credit === 0) {
      errors.push('Au moins un des soldes (débit ou crédit) doit être renseigné')
    }
    if (debit > 0 && credit > 0) {
      errors.push('Un compte ne peut avoir un solde à la fois en débit et en crédit')
    }
    if (debit < 0 || credit < 0) {
      errors.push('Les soldes doivent être positifs')
    }

    return errors
  },

  transform(row: Record<string, unknown>): BilanOuverturePayload {
    const debitStr  = String(row.solde_debit  ?? '').trim()
    const creditStr = String(row.solde_credit ?? '').trim()
    return {
      numero_compte: String(row.numero_compte ?? '').trim(),
      libelle: String(row.libelle ?? '').trim(),
      solde_debit:  debitStr  ? parseNumber(debitStr)  : 0,
      solde_credit: creditStr ? parseNumber(creditStr) : 0,
    }
  },

  endpoint: '/gestionnaire/residences/{id}/bilan-ouverture/bulk',
  method: 'POST',
  chunkSize: 100,
  templateFileName: 'imaro-bilan-ouverture-template.xlsx',
  templateExampleRows: [
    { numero_compte: '1111', libelle: 'Fonds de copropriété',         solde_debit:     0, solde_credit: 25000 },
    { numero_compte: '1191', libelle: 'Report à nouveau',              solde_debit:  3200, solde_credit:     0 },
    { numero_compte: '3421', libelle: 'Copropriétaires — appels émis', solde_debit:  5300, solde_credit:     0 },
    { numero_compte: '4411', libelle: 'Fournisseurs',                  solde_debit:     0, solde_credit:  1200 },
    { numero_compte: '5141', libelle: 'Banque',                        solde_debit: 18500, solde_credit:     0 },
    { numero_compte: '5161', libelle: 'Caisse',                        solde_debit:   600, solde_credit:     0 },
  ],
}
