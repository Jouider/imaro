import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'

type Props = {
  /** Texte encodé dans le QR (instructions de paiement / RIB). */
  value: string
  /** Taille en pixels (carré). */
  size?: number
  className?: string
}

/** Couleur foncée du QR, résolue depuis le token de marque (fallback bleu Imaro). */
function resolveQrColor(): string {
  if (typeof window === 'undefined') return '#1D4ED8'
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-imaro-primary')
    .trim()
  return v || '#1D4ED8'
}

/**
 * QR scannable généré côté client à partir d'un payload texte (RIB + montant +
 * référence). Réutilise la lib `qrcode` déjà présente (annexes PDF).
 */
export function PaymentQr({ value, size = 200, className }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: { dark: resolveQrColor(), light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl(null)
      })
    return () => {
      active = false
    }
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        className={cn('animate-pulse rounded-lg bg-muted', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt=""
      width={size}
      height={size}
      className={cn('rounded-lg bg-white p-1', className)}
    />
  )
}
