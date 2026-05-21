import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a monetary amount as Moroccan Dirham.
 * @example formatMontant(24300) → "24 300,00 DH"
 */
export function formatMontant(value: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' DH'
  )
}
