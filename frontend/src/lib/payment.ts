import type { BankAccount } from '@/services/gestionnaire.service'
import { BANQUES, type Banque } from '@/services/pointage.service'

/** Libellé lisible d'une banque à partir de son code. */
export function banqueLabel(code: Banque): string {
  return BANQUES.find((b) => b.code === code)?.label ?? code
}

/**
 * Payload texte encodé dans le QR de paiement. Contient le bénéficiaire, le RIB
 * et (optionnellement) le montant + une référence, pour faciliter la saisie
 * d'un virement par le copropriétaire.
 */
export function buildPaymentPayload(
  account: Pick<BankAccount, 'banque' | 'titulaire' | 'rib' | 'iban'>,
  opts?: { montant?: number; reference?: string },
): string {
  const lines = [
    `Beneficiaire: ${account.titulaire}`,
    `Banque: ${banqueLabel(account.banque)}`,
    `RIB: ${account.rib}`,
  ]
  if (account.iban) lines.push(`IBAN: ${account.iban}`)
  if (opts?.montant) lines.push(`Montant: ${opts.montant.toFixed(2)} DH`)
  if (opts?.reference) lines.push(`Reference: ${opts.reference}`)
  return lines.join('\n')
}
