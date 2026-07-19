/**
 * Annexes comptables PDF generators (Décret 2.23.700).
 * Designed in Imaro brand language: navy #1B4F72 (primary), orange #E67E22 (accent),
 * green #27AE60 (success/verified). Uses the real Imaro logo (logo-horizontal-inverted.png).
 *
 * Three official annexes:
 *  - Annexe 10   → Suivi des contributions des copropriétaires
 *  - Annexe 13-1 → État de la situation financière (très simplifié)
 *  - Annexe 13-2 → Compte des produits et charges et budget
 */
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { loadLogo } from './annexes-pdf-assets'

/**
 * Mode de sortie des générateurs d'annexes (KAN-123). Par défaut « download »
 * (téléchargement du fichier) ; en mode « preview » le PDF s'ouvre dans un
 * nouvel onglet (aperçu) au lieu d'être enregistré.
 */
let annexeOutputMode: 'download' | 'preview' = 'download'

export function setAnnexeOutputMode(mode: 'download' | 'preview'): void {
  annexeOutputMode = mode
}

/** Émet le PDF : téléchargement ou aperçu (nouvel onglet) selon le mode. */
function emitPdf(doc: jsPDF, filename: string): void {
  if (annexeOutputMode === 'preview') {
    const url = doc.output('bloburl')
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    doc.save(filename)
  }
}

/**
 * Base URL where annexe PDFs link to for verification.
 * Override via VITE_VERIFY_BASE_URL in production.
 */
const VERIFY_BASE_URL: string =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_VERIFY_BASE_URL) ||
  'https://imaro.ma/verify'

// ─── Imaro brand tokens ──────────────────────────────────────────────────────

const NAVY: [number, number, number] = [27, 79, 114] // #1B4F72 — primary
const NAVY_DEEP: [number, number, number] = [18, 56, 84] // darker navy for gradient
const ORANGE: [number, number, number] = [230, 126, 34] // #E67E22 — accent
const ORANGE_SOFT: [number, number, number] = [253, 240, 226] // tinted bg
const GREEN: [number, number, number] = [39, 174, 96] // #27AE60 — success
const GREEN_DARK: [number, number, number] = [30, 132, 73]
const TEXT_DARK: [number, number, number] = [44, 62, 80] // #2c3e50
const TEXT_MUTED: [number, number, number] = [127, 140, 141] // #7f8c8d
const BORDER: [number, number, number] = [228, 232, 237]
const ROW_ALT: [number, number, number] = [249, 250, 251]
const HEADER_BG: [number, number, number] = [241, 245, 249]
const NAVY_TINT: [number, number, number] = [232, 240, 247]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const CONTENT_W = PAGE_W - MARGIN * 2

// ─── Common types ────────────────────────────────────────────────────────────

export type AnnexeCommonInput = {
  residenceName: string
  exerciceLabel: string // e.g. "Exercice clos le 31 décembre 2026"
  exercice: number
  generatedAtIso?: string
  documentCode?: string
  /** Optional pre-loaded logo data URI. If omitted, loaded automatically. */
  logoInvertedDataUri?: string
}

const fmtMad = (n: number): string =>
  n.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' MAD'

const fmtDateFr = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('fr-FR')
}

function genDocCode(
  annexeNum: string,
  residenceName: string,
  exercice: number,
): string {
  const slug =
    residenceName
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 4) || 'IMARO'
  const rnd = Math.random().toString(16).slice(2, 6).toUpperCase()
  return `IMA-${slug}-${exercice}-A${annexeNum.replace('-', '')}-${rnd}`
}

// ─── Shared drawing helpers ──────────────────────────────────────────────────

/** Thin orange accent strip at very top of the page — signature Imaro element. */
function drawTopAccent(doc: jsPDF): void {
  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, PAGE_W, 2.5, 'F')
}

/** Top metadata bar (above the gradient header). */
function drawTopBar(
  doc: jsPDF,
  docCode: string,
  pageNum: number,
  totalPages: number,
): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('IMARO', MARGIN, 7)
  doc.text(docCode, PAGE_W / 2, 7, { align: 'center' })
  doc.text(`Page ${pageNum}/${totalPages}`, PAGE_W - MARGIN, 7, {
    align: 'right',
  })
}

/** Big navy gradient header band with the Imaro logo + Annexe title + Document Officiel badge. */
function drawHeaderBand(
  doc: jsPDF,
  annexeNum: string,
  subtitle: string,
  logoDataUri: string,
): number {
  const bandY = 11
  const bandH = 32
  const steps = 60

  // Navy → deep-navy gradient (vertical-ish, simulated)
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const r = Math.round(NAVY[0] + (NAVY_DEEP[0] - NAVY[0]) * t)
    const g = Math.round(NAVY[1] + (NAVY_DEEP[1] - NAVY[1]) * t)
    const b = Math.round(NAVY[2] + (NAVY_DEEP[2] - NAVY[2]) * t)
    doc.setFillColor(r, g, b)
    doc.rect(
      MARGIN + (CONTENT_W * i) / steps,
      bandY,
      CONTENT_W / steps + 0.3,
      bandH,
      'F',
    )
  }

  // Subtle orange bottom edge inside the band — Imaro orange roof concept
  doc.setFillColor(...ORANGE)
  doc.rect(MARGIN, bandY + bandH - 0.8, CONTENT_W, 0.8, 'F')

  // Imaro logo (left) — use inverted variant on dark background
  // Logo PNG is 2000×2000 but content is centered; we draw it at 32×16 mm to fit nicely
  try {
    doc.addImage(logoDataUri, 'PNG', MARGIN + 4, bandY + 4, 36, 24)
  } catch {
    // Fallback if image fails — draw text-only
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(255, 255, 255)
    doc.text('IMARO', MARGIN + 6, bandY + 18)
  }

  // Center: ANNEXE XX
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text(`ANNEXE ${annexeNum}`, PAGE_W / 2, bandY + 14, { align: 'center' })

  // Orange divider line below title
  const titleWidth = doc.getTextWidth(`ANNEXE ${annexeNum}`)
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.8)
  doc.line(
    PAGE_W / 2 - titleWidth / 3,
    bandY + 17.5,
    PAGE_W / 2 + titleWidth / 3,
    bandY + 17.5,
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(225, 232, 240)
  doc.text(subtitle, PAGE_W / 2, bandY + 24, { align: 'center' })

  // Right: DOCUMENT OFFICIEL green badge
  const badgeX = PAGE_W - MARGIN - 54
  const badgeY = bandY + 8
  const badgeW = 50
  const badgeH = 16

  // Green gradient
  for (let i = 0; i < 30; i++) {
    const t = i / 29
    const r = Math.round(GREEN[0] + (GREEN_DARK[0] - GREEN[0]) * t)
    const g = Math.round(GREEN[1] + (GREEN_DARK[1] - GREEN[1]) * t)
    const b = Math.round(GREEN[2] + (GREEN_DARK[2] - GREEN[2]) * t)
    doc.setFillColor(r, g, b)
    doc.roundedRect(
      badgeX + (badgeW * i) / 30,
      badgeY,
      badgeW / 30 + 0.3,
      badgeH,
      2.5,
      2.5,
      'F',
    )
  }
  // Check icon (white circle with green check)
  doc.setFillColor(255, 255, 255)
  doc.circle(badgeX + 6, badgeY + 8, 3, 'F')
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.9)
  doc.line(badgeX + 4.5, badgeY + 8, badgeX + 5.5, badgeY + 9.4)
  doc.line(badgeX + 5.5, badgeY + 9.4, badgeX + 7.6, badgeY + 6.4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('DOCUMENT OFFICIEL', badgeX + 11, badgeY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Intégrité vérifiable', badgeX + 11, badgeY + 11.5)

  return bandY + bandH
}

/** Info row: Immeuble | Exercice | Généré le. Orange left accent. */
function drawInfoRow(doc: jsPDF, y: number, ctx: AnnexeCommonInput): number {
  const rowH = 15

  doc.setFillColor(...HEADER_BG)
  doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')

  // Orange accent bar
  doc.setFillColor(...ORANGE)
  doc.rect(MARGIN, y, 2, rowH, 'F')

  const labelY = y + 6.5
  const valueY = y + 11.5
  const colW = CONTENT_W / 3

  const cols: { label: string; value: string }[] = [
    { label: 'IMMEUBLE', value: ctx.residenceName },
    { label: 'EXERCICE', value: ctx.exerciceLabel },
    { label: 'GÉNÉRÉ LE', value: fmtDateFr(ctx.generatedAtIso) },
  ]

  cols.forEach((c, i) => {
    const x = MARGIN + colW * i + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...ORANGE)
    doc.text(c.label, x, labelY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXT_DARK)
    doc.text(c.value, x, valueY)
  })

  return y + rowH + 6
}

/** Signature box centered, orange-bordered. Adapts to available space. */
function drawSignatureBox(doc: jsPDF, y: number): number {
  // Footer separator is at 262. Need 4mm padding above. Box max bottom = 258.
  const maxBottom = 258
  const availableH = maxBottom - y
  const boxW = 80
  const boxH = Math.min(30, Math.max(20, availableH))
  const boxX = (PAGE_W - boxW) / 2

  // Soft orange-tinted background
  doc.setFillColor(...ORANGE_SOFT)
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'F')

  // Orange border
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.5)
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'S')

  // Adapt inner positions to the actual height
  const labelY = y + 6.5
  const sigLineY = y + boxH * 0.62
  const syndicY = sigLineY + 4
  const dateY = y + boxH - 3
  const dateLineY = dateY

  // Label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...NAVY)
  doc.text('SIGNATURE ET CACHET DU SYNDIC', boxX + boxW / 2, labelY, {
    align: 'center',
  })

  // Signature line
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.4)
  doc.line(boxX + 12, sigLineY, boxX + boxW - 12, sigLineY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('Syndic', boxX + boxW / 2, syndicY, { align: 'center' })

  // Date row only if there's room
  if (boxH >= 26) {
    doc.text('Date :', boxX + 12, dateY)
    doc.setDrawColor(...TEXT_MUTED)
    doc.setLineWidth(0.3)
    doc.line(boxX + 22, dateLineY, boxX + boxW - 12, dateLineY)
  }

  return y + boxH
}

/** Footer separator + disclaimer + QR placeholder + page number. */
/** Generate a verification URL that the QR encodes. */
function buildVerifyUrl(docCode: string): string {
  return `${VERIFY_BASE_URL}/${docCode}`
}

/** Generate a real scannable QR data URI for the verification URL. */
async function generateVerifyQr(docCode: string): Promise<string> {
  return QRCode.toDataURL(buildVerifyUrl(docCode), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
    color: { dark: '#1B4F72', light: '#FFFFFF' }, // Imaro navy on white
  })
}

function drawFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  qrDataUri: string,
  verifyUrl: string,
): void {
  const sepY = 262
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, sepY, PAGE_W - MARGIN, sepY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(
    'Document généré par Imaro.ma  •  Conforme au décret n° 2.23.700',
    PAGE_W / 2,
    sepY + 5,
    { align: 'center' },
  )

  // Real scannable QR (navy on white, ~16mm square)
  const qrSize = 16
  const qrX = MARGIN
  const qrY = PAGE_H - 24

  try {
    doc.addImage(qrDataUri, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST')
  } catch {
    // fallback (should not happen)
    doc.setFillColor(20, 20, 20)
    doc.rect(qrX, qrY, qrSize, qrSize, 'F')
  }

  // "SCAN TO VERIFY" caption + short URL hint under it
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...NAVY)
  doc.text('SCAN TO VERIFY', qrX + qrSize + 2, qrY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...TEXT_MUTED)
  // Show the host part of the URL so the user knows it's safe
  const hostHint = verifyUrl.replace(/^https?:\/\//, '').split('/')[0]
  doc.text(hostHint, qrX + qrSize + 2, qrY + 9.5)
  doc.text('Document authentique', qrX + qrSize + 2, qrY + 13)

  // Centered tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('Document généré par Imaro.ma', PAGE_W / 2, qrY + 6, {
    align: 'center',
  })
  doc.text('Conforme au décret n° 2.23.700', PAGE_W / 2, qrY + 10.5, {
    align: 'center',
  })

  // Page number
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Page ${pageNum}/${totalPages}`, PAGE_W - MARGIN, qrY + 10.5, {
    align: 'right',
  })
}

/** KPI card with orange top accent line + label + value. */
function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  options: {
    valueColor?: [number, number, number]
    accent?: [number, number, number]
  } = {},
): void {
  const accent = options.accent ?? ORANGE
  const valColor = options.valueColor ?? TEXT_DARK

  // Soft fill
  doc.setFillColor(...HEADER_BG)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')

  // Top accent line
  doc.setFillColor(...accent)
  doc.rect(x, y, w, 1.5, 'F')

  // Subtle border
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, w, h, 2, 2, 'S')

  // Label (small, muted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(label.toUpperCase(), x + 4, y + 7)

  // Value (big, bold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...valColor)
  doc.text(value, x + 4, y + 15.5)
}

// ─── Annexe 10 — Suivi des contributions des copropriétaires ─────────────────

export type Annexe10Row = {
  lotNumero: string
  coproprietaireNom: string
  soldeInitial: number
  appele: number
  paye: number
  soldeFinal: number
}

export type Annexe10Input = AnnexeCommonInput & {
  totals: {
    soldeInitial: number
    appele: number
    paye: number
    soldeFinal: number
  }
  rows: Annexe10Row[]
}

export async function generateAnnexe10Pdf(data: Annexe10Input): Promise<void> {
  const logo =
    data.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const docCode =
    data.documentCode ?? genDocCode('10', data.residenceName, data.exercice)
  const verifyUrl = buildVerifyUrl(docCode)
  const qrDataUri = await generateVerifyQr(docCode)
  drawTopAccent(doc)
  let y = drawHeaderBand(
    doc,
    '10',
    'Suivi des contributions des copropriétaires',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)

  // 4 KPI cards — alternating accent (orange / navy / green / orange)
  const kpiW = (CONTENT_W - 9) / 4
  const kpiH = 20
  drawKpiCard(
    doc,
    MARGIN,
    y,
    kpiW,
    kpiH,
    'Solde au 01/01',
    fmtMad(data.totals.soldeInitial),
  )
  drawKpiCard(
    doc,
    MARGIN + (kpiW + 3),
    y,
    kpiW,
    kpiH,
    'Montant annuel appelé',
    fmtMad(data.totals.appele),
    { accent: NAVY },
  )
  drawKpiCard(
    doc,
    MARGIN + (kpiW + 3) * 2,
    y,
    kpiW,
    kpiH,
    'Versements effectués',
    fmtMad(data.totals.paye),
    { valueColor: GREEN, accent: GREEN },
  )
  drawKpiCard(
    doc,
    MARGIN + (kpiW + 3) * 3,
    y,
    kpiW,
    kpiH,
    'Solde au 31/12',
    fmtMad(data.totals.soldeFinal),
  )

  y += kpiH + 10

  // Total must equal CONTENT_W (182mm): 17 + 53 + 28 + 24 + 24 + 36 = 182
  const colW = [17, 53, 28, 24, 24, 36]
  const headers = [
    'Lot',
    'Copropriétaire',
    'Solde initial',
    'Appelé',
    'Payé',
    'Solde final',
  ]

  // Draws the navy column-header row at `yy`; returns the y just below it.
  const drawTableHead = (yy: number): number => {
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, yy, CONTENT_W, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN + 4
    headers.forEach((h, i) => {
      const align = i >= 2 ? 'right' : 'left'
      const tx = align === 'right' ? cx + colW[i] - 4 : cx
      doc.text(h.toUpperCase(), tx, yy + 6, { align })
      cx += colW[i]
    })
    return yy + 9
  }

  // Opens a continuation page (accent + header band) and returns the y to
  // resume at. Top bar + footer are stamped once at the end (page numbering).
  const continuationPage = (): number => {
    doc.addPage()
    drawTopAccent(doc)
    return (
      drawHeaderBand(
        doc,
        '10',
        'Suivi des contributions des copropriétaires',
        logo,
      ) + 5
    )
  }

  // Rows must stop above the footer separator (262) to avoid overlapping it.
  const ROW_MAX = 254

  // Table
  if (data.rows.length === 0) {
    doc.setFillColor(...HEADER_BG)
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('Aucun copropriétaire enregistré', PAGE_W / 2, y + 12, {
      align: 'center',
    })
    y += 20 + 6
  } else {
    y = drawTableHead(y)

    // Rows — break to a new page (re-drawing the header band + column head)
    // before a row would reach the footer zone.
    data.rows.forEach((r, idx) => {
      if (y + 8 > ROW_MAX) {
        y = drawTableHead(continuationPage())
      }
      if (idx % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_DARK)
      let rx = MARGIN + 4
      const cells = [
        r.lotNumero,
        r.coproprietaireNom,
        fmtMad(r.soldeInitial),
        fmtMad(r.appele),
        fmtMad(r.paye),
        fmtMad(r.soldeFinal),
      ]
      cells.forEach((c, i) => {
        const align = i >= 2 ? 'right' : 'left'
        const tx = align === 'right' ? rx + colW[i] - 4 : rx
        doc.text(c, tx, y + 5.5, { align })
        rx += colW[i]
      })
      y += 8
    })

    // Totals row — orange highlight (kept with the table; new page if needed).
    if (y + 9 > ROW_MAX) {
      y = drawTableHead(continuationPage())
    }
    doc.setFillColor(...ORANGE_SOFT)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    // Orange left border
    doc.setFillColor(...ORANGE)
    doc.rect(MARGIN, y, 2, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...NAVY)
    let tx = MARGIN + 4
    const totalCells = [
      'TOTAL',
      '',
      fmtMad(data.totals.soldeInitial),
      fmtMad(data.totals.appele),
      fmtMad(data.totals.paye),
      fmtMad(data.totals.soldeFinal),
    ]
    totalCells.forEach((c, i) => {
      const align = i >= 2 ? 'right' : 'left'
      const ax = align === 'right' ? tx + colW[i] - 4 : tx
      doc.text(c, ax, y + 6, { align })
      tx += colW[i]
    })
    y += 9 + 6
  }

  // Signature box on the last page — move to a fresh page if it would collide
  // with the footer.
  if (y > 238) {
    y = continuationPage() + 3
  }
  drawSignatureBox(doc, Math.max(y, 215))

  // Stamp the top bar + footer on every page now that the total is known.
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawTopBar(doc, docCode, p, totalPages)
    drawFooter(doc, p, totalPages, qrDataUri, verifyUrl)
  }

  emitPdf(doc, `annexe10_${data.exercice}.pdf`)
}

// ─── Annexe 13-1 — État de la situation financière (très simplifié) ──────────

export type Annexe13_1Input = AnnexeCommonInput & {
  current: {
    fondsReserve: number
    creances: number
    dettes: number
    tresorerie: number
  }
  previous: {
    fondsReserve: number
    creances: number
    dettes: number
    tresorerie: number
  }
}

export async function generateAnnexe131Pdf(
  data: Annexe13_1Input,
): Promise<void> {
  const logo =
    data.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const docCode =
    data.documentCode ?? genDocCode('13-1', data.residenceName, data.exercice)
  const verifyUrl = buildVerifyUrl(docCode)
  const qrDataUri = await generateVerifyQr(docCode)

  drawTopAccent(doc)
  drawTopBar(doc, docCode, 1, 1)
  let y = drawHeaderBand(
    doc,
    '13-1',
    'État de la situation financière (très simplifié)',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)

  // 3 columns: label | exercice clos (N) | exercice précédent (N-1)
  const labelW = 80
  const colW = (CONTENT_W - labelW) / 2

  // Table header
  doc.setFillColor(...NAVY)
  doc.rect(MARGIN, y, CONTENT_W, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('EXERCICE CLOS (N)', MARGIN + labelW + colW - 4, y + 6.5, {
    align: 'right',
  })
  doc.text(
    'EXERCICE PRÉCÉDENT (N-1)',
    MARGIN + labelW + colW * 2 - 4,
    y + 6.5,
    { align: 'right' },
  )
  y += 10

  const rows = [
    {
      label: 'Situation des comptes de réserve',
      current: data.current.fondsReserve,
      previous: data.previous.fondsReserve,
    },
    {
      label: 'Situation des créances',
      current: data.current.creances,
      previous: data.previous.creances,
    },
    {
      label: 'Situation des dettes',
      current: data.current.dettes,
      previous: data.previous.dettes,
    },
    {
      label: 'Situation de la trésorerie',
      current: data.current.tresorerie,
      previous: data.previous.tresorerie,
      highlight: true,
    },
  ]

  rows.forEach((r, idx) => {
    if (r.highlight) {
      doc.setFillColor(...ORANGE_SOFT)
      doc.rect(MARGIN, y, CONTENT_W, 11, 'F')
      doc.setFillColor(...ORANGE)
      doc.rect(MARGIN, y, 2, 11, 'F')
    } else if (idx % 2 === 1) {
      doc.setFillColor(...ROW_ALT)
      doc.rect(MARGIN, y, CONTENT_W, 11, 'F')
    }
    doc.setFont('helvetica', r.highlight ? 'bold' : 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(
      r.highlight ? NAVY[0] : TEXT_DARK[0],
      r.highlight ? NAVY[1] : TEXT_DARK[1],
      r.highlight ? NAVY[2] : TEXT_DARK[2],
    )
    doc.text(r.label, MARGIN + 5, y + 7)
    doc.text(fmtMad(r.current), MARGIN + labelW + colW - 4, y + 7, {
      align: 'right',
    })
    doc.text(fmtMad(r.previous), MARGIN + labelW + colW * 2 - 4, y + 7, {
      align: 'right',
    })
    y += 11
  })

  drawSignatureBox(doc, 195)
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe13-1_${data.exercice}.pdf`)
}

// ─── Annexe 13-2 — Compte des produits et charges et budget ──────────────────

type Quad = { n1: number; n: number; n0: number; nMinus1: number }

function sumQuad(items: Quad[]): Quad {
  return items.reduce(
    (acc, q) => ({
      n1: acc.n1 + q.n1,
      n: acc.n + q.n,
      n0: acc.n0 + q.n0,
      nMinus1: acc.nMinus1 + q.nMinus1,
    }),
    { n1: 0, n: 0, n0: 0, nMinus1: 0 },
  )
}

export type Annexe13_2Input = AnnexeCommonInput & {
  excedent: number
  recettes: {
    cotisations: Quad
    fondsReserve: Quad
    autresAg: Quad
    autresProduits: Quad
  }
  depenses: {
    matieres: Quad
    servicesExterieurs: Quad
    impotsTaxes: Quad
    personnel: Quad
    autresCharges: Quad
  }
}

export async function generateAnnexe132Pdf(
  data: Annexe13_2Input,
): Promise<void> {
  const logo =
    data.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const docCode =
    data.documentCode ?? genDocCode('13-2', data.residenceName, data.exercice)
  const verifyUrl = buildVerifyUrl(docCode)
  const qrDataUri = await generateVerifyQr(docCode)

  drawTopAccent(doc)
  drawTopBar(doc, docCode, 1, 1)
  let y = drawHeaderBand(
    doc,
    '13-2',
    'Compte des produits et charges et budget',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)

  // EXCÉDENT hero card — orange-accented
  doc.setFillColor(...HEADER_BG)
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(MARGIN, y, 2, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text("EXCÉDENT DE L'EXERCICE", MARGIN + 6, y + 7.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...GREEN)
  doc.text(fmtMad(data.excedent), MARGIN + 6, y + 16)
  y += 20 + 6

  // Table column setup
  const labelW = 60
  const colW = (CONTENT_W - labelW) / 4

  // Column headers (navy band)
  doc.setFillColor(...NAVY)
  doc.rect(MARGIN, y, CONTENT_W, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  const headers: string[][] = [
    ['BUDGET VOTÉ (N+1)'],
    ['RÉALISÉ EXERCICE', 'CLOS (N)'],
    ['BUDGET VOTÉ (N)'],
    ['APPROUVÉ EXERCICE', 'PRÉCÉDENT (N-1)'],
  ]
  headers.forEach((lines, i) => {
    const cx = MARGIN + labelW + colW * (i + 1) - 4
    if (lines.length === 1) {
      doc.text(lines[0], cx, y + 8.5, { align: 'right' })
    } else {
      doc.text(lines[0], cx, y + 6, { align: 'right' })
      doc.text(lines[1], cx, y + 10, { align: 'right' })
    }
  })
  y += 14

  // Section label band
  const drawSectionLabel = (
    label: string,
    accent: [number, number, number],
    yPos: number,
  ): number => {
    doc.setFillColor(...NAVY_TINT)
    doc.rect(MARGIN, yPos, CONTENT_W, 7.5, 'F')
    doc.setFillColor(...accent)
    doc.rect(MARGIN, yPos, 2.5, 7.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...NAVY)
    doc.text(label.toUpperCase(), MARGIN + 6, yPos + 5.3)
    return yPos + 7.5
  }

  // Data row with wrapping
  const drawDataRow = (
    yPos: number,
    label: string,
    q: Quad,
    opts: { alt?: boolean; bold?: boolean; highlight?: 'orange' | 'navy' } = {},
  ): number => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(8.5)
    const labelLines = doc.splitTextToSize(label, labelW - 8) as string[]
    const rowH = Math.max(7.5, labelLines.length * 3.7 + 3.5)

    if (opts.highlight === 'orange') {
      doc.setFillColor(...ORANGE_SOFT)
      doc.rect(MARGIN, yPos, CONTENT_W, rowH, 'F')
      doc.setFillColor(...ORANGE)
      doc.rect(MARGIN, yPos, 2, rowH, 'F')
    } else if (opts.highlight === 'navy') {
      doc.setFillColor(...NAVY_TINT)
      doc.rect(MARGIN, yPos, CONTENT_W, rowH, 'F')
      doc.setFillColor(...NAVY)
      doc.rect(MARGIN, yPos, 2, rowH, 'F')
    } else if (opts.alt) {
      doc.setFillColor(...ROW_ALT)
      doc.rect(MARGIN, yPos, CONTENT_W, rowH, 'F')
    }

    doc.setTextColor(...(opts.highlight ? NAVY : TEXT_DARK))
    const labelStartY =
      labelLines.length === 1 ? yPos + rowH / 2 + 1.5 : yPos + 5
    doc.text(labelLines, MARGIN + (opts.highlight ? 6 : 5), labelStartY)

    const valueY = yPos + rowH / 2 + 1.5
    const vals = [q.n1, q.n, q.n0, q.nMinus1]
    vals.forEach((v, i) => {
      const cx = MARGIN + labelW + colW * (i + 1) - 4
      doc.text(fmtMad(v), cx, valueY, { align: 'right' })
    })
    return yPos + rowH
  }

  // Recettes
  y = drawSectionLabel('Recettes', GREEN, y)
  const recettes = [
    {
      label: 'Contributions perçues (cotisations)',
      q: data.recettes.cotisations,
    },
    {
      label: 'Contributions au fonds de réserve',
      q: data.recettes.fondsReserve,
    },
    { label: "Autres produits votés par l'AG", q: data.recettes.autresAg },
    { label: 'Autres produits', q: data.recettes.autresProduits },
  ]
  recettes.forEach((r, i) => {
    y = drawDataRow(y, r.label, r.q, { alt: i % 2 === 1 })
  })
  const totalRecettes = sumQuad(recettes.map((r) => r.q))
  y = drawDataRow(y, 'Total des Recettes', totalRecettes, {
    bold: true,
    highlight: 'navy',
  })

  // Dépenses
  y = drawSectionLabel('Dépenses', ORANGE, y)
  const depenses = [
    {
      label: 'Matières et fournitures (eau, électricité, équipement)',
      q: data.depenses.matieres,
    },
    {
      label: 'Services extérieurs (nettoyage, maintenance, syndic)',
      q: data.depenses.servicesExterieurs,
    },
    { label: 'Impôts et taxes', q: data.depenses.impotsTaxes },
    { label: 'Personnel', q: data.depenses.personnel },
    {
      label: 'Autres charges de fonctionnement',
      q: data.depenses.autresCharges,
    },
  ]
  depenses.forEach((r, i) => {
    y = drawDataRow(y, r.label, r.q, { alt: i % 2 === 1 })
  })
  const totalDepenses = sumQuad(depenses.map((r) => r.q))
  y = drawDataRow(y, 'Total des Dépenses', totalDepenses, {
    bold: true,
    highlight: 'navy',
  })

  // Excédent row (orange highlight) — realized column tinted green
  const excQuad: Quad = {
    n1: totalRecettes.n1 - totalDepenses.n1,
    n: totalRecettes.n - totalDepenses.n,
    n0: totalRecettes.n0 - totalDepenses.n0,
    nMinus1: totalRecettes.nMinus1 - totalDepenses.nMinus1,
  }

  const excRowH = 9
  doc.setFillColor(...ORANGE_SOFT)
  doc.rect(MARGIN, y, CONTENT_W, excRowH, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(MARGIN, y, 2, excRowH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text('Excédent', MARGIN + 6, y + 6)

  const excValueY = y + 6
  const excVals: { v: number; tint: [number, number, number] }[] = [
    { v: excQuad.n1, tint: TEXT_DARK },
    { v: excQuad.n, tint: GREEN }, // realized → green
    { v: excQuad.n0, tint: TEXT_DARK },
    { v: excQuad.nMinus1, tint: TEXT_DARK },
  ]
  excVals.forEach((cell, i) => {
    const cx = MARGIN + labelW + colW * (i + 1) - 4
    doc.setTextColor(...cell.tint)
    doc.text(fmtMad(cell.v), cx, excValueY, { align: 'right' })
  })
  y += excRowH + 6

  drawSignatureBox(doc, Math.max(y, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe13-2_${data.exercice}.pdf`)
}

// ─── Shared table helpers (used by annexes 3, 4, 6, 7, 8, 9, 11, 12) ─────────

type CodeRowValues = number[]

/** Renders a section title like "ACTIF" or "CHARGES" in a colored band. */
function drawBigSectionTitle(
  doc: jsPDF,
  title: string,
  color: [number, number, number],
  y: number,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...color)
  doc.text(title.toUpperCase(), MARGIN, y + 4)
  // Underline accent
  doc.setDrawColor(...color)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6)
  return y + 10
}

/** Renders a subsection band like "Créances de l'Actif Circulant". */
function drawSubsectionBand(
  doc: jsPDF,
  title: string,
  accent: [number, number, number],
  y: number,
): number {
  const h = 7
  doc.setFillColor(...NAVY_TINT)
  doc.rect(MARGIN, y, CONTENT_W, h, 'F')
  doc.setFillColor(...accent)
  doc.rect(MARGIN, y, 2.5, h, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  doc.text(title, MARGIN + 6, y + 4.8)
  return y + h
}

/** Renders a code + libellé + N values row. Auto-wraps libellé.
 *  Column layout for 2-column data (bilan): code=20, libelle=82, val1=40, val2=40
 *  Column layout for 4-column data (résultat): code=18, libelle=44, val1=30, val2=30, val3=30, val4=30
 */
function drawCodeRow(
  doc: jsPDF,
  code: string,
  libelle: string,
  values: CodeRowValues,
  y: number,
  opts: { alt?: boolean; bold?: boolean; highlight?: boolean } = {},
): number {
  const numCols = values.length
  const codeW = numCols === 2 ? 20 : 18
  const labelW = numCols === 2 ? 82 : 44
  const valW = (CONTENT_W - codeW - labelW) / numCols

  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(8)
  const labelLines = doc.splitTextToSize(libelle, labelW - 4) as string[]
  const rowH = Math.max(7, labelLines.length * 3.5 + 3)

  if (opts.highlight) {
    doc.setFillColor(...HEADER_BG)
    doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
  } else if (opts.alt) {
    doc.setFillColor(...ROW_ALT)
    doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
  }

  const textY = y + rowH / 2 + 1.5
  const labelStartY = labelLines.length === 1 ? textY : y + 4.5

  doc.setTextColor(...(opts.bold || opts.highlight ? NAVY : TEXT_DARK))
  if (code) {
    doc.text(code, MARGIN + 4, textY)
  }
  doc.text(labelLines, MARGIN + codeW, labelStartY)
  values.forEach((v, i) => {
    const cx = MARGIN + codeW + labelW + valW * (i + 1) - 4
    doc.text(fmtMad(v), cx, textY, { align: 'right' })
  })

  return y + rowH
}

/** Renders the column header bar for code-table layouts. */
function drawCodeTableHeader(
  doc: jsPDF,
  headers: string[], // e.g. ['CODE','LIBELLÉ','EXERCICE CLOS (N)','EXERCICE PRÉCÉDENT (N-1)']
  y: number,
  variant: 'navy' | 'tint' = 'navy',
): number {
  const h = 10
  const numCols = headers.length - 2
  const codeW = numCols === 2 ? 20 : 18
  const labelW = numCols === 2 ? 82 : 44
  const valW = (CONTENT_W - codeW - labelW) / numCols

  if (variant === 'navy') {
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT_W, h, 'F')
    doc.setTextColor(255, 255, 255)
  } else {
    doc.setFillColor(...HEADER_BG)
    doc.rect(MARGIN, y, CONTENT_W, h, 'F')
    doc.setTextColor(...NAVY)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(headers[0], MARGIN + 4, y + 6.5)
  doc.text(headers[1], MARGIN + codeW, y + 6.5)
  const valHeaders = headers.slice(2)
  valHeaders.forEach((h2, i) => {
    const lines = h2.split(' / ')
    const cx = MARGIN + codeW + labelW + valW * (i + 1) - 4
    if (lines.length === 1) {
      doc.text(lines[0], cx, y + 6.5, { align: 'right' })
    } else {
      doc.text(lines[0], cx, y + 4.5, { align: 'right' })
      doc.text(lines[1], cx, y + 8.5, { align: 'right' })
    }
  })
  return y + h
}

/** Empty-state card centered with italic message. */
function drawEmptyState(doc: jsPDF, message: string, y: number): number {
  const h = 18
  doc.setFillColor(...HEADER_BG)
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, 'F')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(message, PAGE_W / 2, y + 11, { align: 'center' })
  return y + h
}

/** Quick KPI row helper that takes an array of {label, value, accent, color} cards. */
function drawKpiRow(
  doc: jsPDF,
  y: number,
  cards: {
    label: string
    value: string
    accent?: [number, number, number]
    color?: [number, number, number]
  }[],
): number {
  const n = cards.length
  const gap = 3
  const w = (CONTENT_W - gap * (n - 1)) / n
  const h = 20
  cards.forEach((c, i) => {
    drawKpiCard(doc, MARGIN + (w + gap) * i, y, w, h, c.label, c.value, {
      accent: c.accent ?? ORANGE,
      valueColor: c.color ?? TEXT_DARK,
    })
  })
  return y + h
}

/** Async helper to pre-build doc-code, verify-url, QR for a given annexe. */
async function buildPdfBase(annexeNum: string, ctx: AnnexeCommonInput) {
  const logo =
    ctx.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const docCode =
    ctx.documentCode ?? genDocCode(annexeNum, ctx.residenceName, ctx.exercice)
  const verifyUrl = buildVerifyUrl(docCode)
  const qrDataUri = await generateVerifyQr(docCode)
  return { logo, docCode, verifyUrl, qrDataUri }
}

/** Re-draw header bar + top accent on each new page. */
function startPage(
  doc: jsPDF,
  docCode: string,
  page: number,
  totalPages: number,
): void {
  if (page > 1) doc.addPage()
  drawTopAccent(doc)
  drawTopBar(doc, docCode, page, totalPages)
}

// ─── Annexe 3 — BILAN ────────────────────────────────────────────────────────

export type Annexe3BilanRow = {
  code: string
  libelle: string
  currentValue: number
  previousValue: number
}

export type Annexe3BilanSubsection = {
  title: string
  rows: Annexe3BilanRow[]
  total: { currentValue: number; previousValue: number }
}

export type Annexe3Input = AnnexeCommonInput & {
  actif: {
    sections: Annexe3BilanSubsection[]
    total: { currentValue: number; previousValue: number }
  }
  passif: {
    sections: Annexe3BilanSubsection[]
    total: { currentValue: number; previousValue: number }
  }
}

export async function generateAnnexe3Pdf(data: Annexe3Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('3', data)
  const totalPages = 2

  // Page 1 — ACTIF
  startPage(doc, docCode, 1, totalPages)
  let y = drawHeaderBand(
    doc,
    '3',
    'État de la Situation Financière (Bilan)',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    {
      label: 'Total Actif',
      value: fmtMad(data.actif.total.currentValue),
      accent: ORANGE,
    },
    {
      label: 'Total Passif',
      value: fmtMad(data.passif.total.currentValue),
      accent: NAVY,
    },
    {
      label: 'Bilan',
      value:
        Math.abs(
          data.actif.total.currentValue - data.passif.total.currentValue,
        ) < 0.01
          ? 'Équilibré'
          : 'Déséquilibré',
      accent: GREEN,
      color: GREEN,
    },
  ])
  y += 6

  y = drawBigSectionTitle(doc, 'ACTIF', NAVY, y)
  y = drawCodeTableHeader(
    doc,
    ['CODE', 'LIBELLÉ', 'EXERCICE CLOS (N)', 'EXERCICE PRÉCÉDENT / (N-1)'],
    y,
  )

  const renderBilanSection = (
    sections: Annexe3BilanSubsection[],
    total: { currentValue: number; previousValue: number },
    accent: [number, number, number],
    startY: number,
  ): number => {
    let yy = startY
    if (sections.length === 0) {
      yy = drawEmptyState(doc, 'Aucune donnée de bilan pour cet exercice', yy)
    } else {
      sections.forEach((sec) => {
        yy = drawSubsectionBand(doc, sec.title, accent, yy)
        sec.rows.forEach((r, i) => {
          yy = drawCodeRow(
            doc,
            r.code,
            r.libelle,
            [r.currentValue, r.previousValue],
            yy,
            {
              alt: i % 2 === 1,
            },
          )
        })
        yy = drawCodeRow(
          doc,
          '',
          `Total ${sec.title}`,
          [sec.total.currentValue, sec.total.previousValue],
          yy,
          {
            bold: true,
            highlight: true,
          },
        )
      })
    }
    // Grand total
    yy = drawCodeRow(
      doc,
      '',
      'Total',
      [total.currentValue, total.previousValue],
      yy,
      {
        bold: true,
        highlight: true,
      },
    )
    return yy
  }

  renderBilanSection(data.actif.sections, data.actif.total, ORANGE, y)

  drawFooter(doc, 1, totalPages, qrDataUri, verifyUrl)

  // Page 2 — PASSIF
  startPage(doc, docCode, 2, totalPages)
  let y2 = 14
  y2 = drawBigSectionTitle(doc, 'PASSIF', GREEN, y2)
  y2 = drawCodeTableHeader(
    doc,
    ['CODE', 'LIBELLÉ', 'EXERCICE CLOS (N)', 'EXERCICE PRÉCÉDENT / (N-1)'],
    y2,
  )
  y2 = renderBilanSection(data.passif.sections, data.passif.total, GREEN, y2)

  // Bilan équilibré final row
  const equilibre =
    Math.abs(data.actif.total.currentValue - data.passif.total.currentValue) <
    0.01
  const DANGER_SOFT: [number, number, number] = [254, 226, 226]
  const DANGER: [number, number, number] = [220, 38, 38]
  const bgClr = equilibre ? ORANGE_SOFT : DANGER_SOFT
  const barClr = equilibre ? GREEN : DANGER
  doc.setFillColor(...bgClr)
  doc.rect(MARGIN, y2 + 4, CONTENT_W, 9, 'F')
  doc.setFillColor(...barClr)
  doc.rect(MARGIN, y2 + 4, 2.5, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...NAVY)
  doc.text(
    equilibre ? 'Bilan équilibré' : 'Bilan déséquilibré',
    MARGIN + 6,
    y2 + 10,
  )
  doc.text(
    fmtMad(
      Math.abs(data.actif.total.currentValue - data.passif.total.currentValue),
    ),
    PAGE_W - MARGIN - 4,
    y2 + 10,
    { align: 'right' },
  )

  drawSignatureBox(doc, y2 + 20)
  drawFooter(doc, 2, totalPages, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe3_${data.exercice}.pdf`)
}

// ─── Annexe 4 — COMPTE DE RÉSULTAT (complet) ─────────────────────────────────

export type Annexe4Row = { code: string; libelle: string; q: Quad }
export type Annexe4Subsection = {
  title: string
  rows: Annexe4Row[]
  total: Quad
}

export type Annexe4Input = AnnexeCommonInput & {
  totals: { charges: number; produits: number; resultat: number }
  chargesSections: Annexe4Subsection[] // Courantes, Non Courantes, Dotations
  produitsSections: Annexe4Subsection[] // Courants, Non Courants, Reprises
  totalCharges: Quad
  totalProduits: Quad
  resultatNet: Quad
}

export async function generateAnnexe4Pdf(data: Annexe4Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('4', data)
  const totalPages = 2

  const plHeaders = [
    'CODE',
    'LIBELLÉ',
    'BUDGET VOTÉ / (N+1)',
    'RÉALISÉ CLOS / (N)',
    'BUDGET VOTÉ / (N)',
    'APPROUVÉ / (N-1)',
  ]

  const renderPLSection = (
    sections: Annexe4Subsection[],
    grandTotal: Quad,
    grandLabel: string,
    accent: [number, number, number],
    startY: number,
  ): number => {
    let yy = startY
    if (sections.length === 0) {
      yy = drawEmptyState(doc, 'Aucune donnée comptable pour cet exercice', yy)
      yy = drawCodeRow(
        doc,
        '',
        grandLabel,
        [grandTotal.n1, grandTotal.n, grandTotal.n0, grandTotal.nMinus1],
        yy,
        {
          bold: true,
          highlight: true,
        },
      )
      return yy
    }
    sections.forEach((sec) => {
      yy = drawSubsectionBand(doc, sec.title, accent, yy)
      sec.rows.forEach((r, i) => {
        yy = drawCodeRow(
          doc,
          r.code,
          r.libelle,
          [r.q.n1, r.q.n, r.q.n0, r.q.nMinus1],
          yy,
          {
            alt: i % 2 === 1,
          },
        )
        // page break if needed
        if (yy > 248) {
          drawFooter(
            doc,
            doc.getNumberOfPages(),
            totalPages,
            qrDataUri,
            verifyUrl,
          )
          startPage(doc, docCode, doc.getNumberOfPages() + 1, totalPages)
          yy = 14
          yy = drawCodeTableHeader(doc, plHeaders, yy)
        }
      })
      yy = drawCodeRow(
        doc,
        '',
        `Total ${sec.title}`,
        [sec.total.n1, sec.total.n, sec.total.n0, sec.total.nMinus1],
        yy,
        {
          bold: true,
          highlight: true,
        },
      )
    })
    yy = drawCodeRow(
      doc,
      '',
      grandLabel,
      [grandTotal.n1, grandTotal.n, grandTotal.n0, grandTotal.nMinus1],
      yy,
      {
        bold: true,
        highlight: true,
      },
    )
    return yy
  }

  // Page 1
  startPage(doc, docCode, 1, totalPages)
  let y = drawHeaderBand(doc, '4', 'Compte de Gestion Général', logo)
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    {
      label: 'Total Charges',
      value: fmtMad(data.totals.charges),
      accent: ORANGE,
    },
    {
      label: 'Total Produits',
      value: fmtMad(data.totals.produits),
      accent: GREEN,
      color: GREEN,
    },
    {
      label: 'Résultat Net',
      value: fmtMad(data.totals.resultat),
      accent: NAVY,
      color:
        data.totals.resultat >= 0
          ? GREEN
          : ([220, 38, 38] as [number, number, number]),
    },
  ])
  y += 6
  y = drawBigSectionTitle(doc, 'CHARGES', ORANGE, y)
  y = drawCodeTableHeader(doc, plHeaders, y)
  y = renderPLSection(
    data.chargesSections,
    data.totalCharges,
    'Total Charges',
    ORANGE,
    y,
  )

  // PRODUITS section (page break if needed handled inside renderPLSection)
  y += 4
  y = drawBigSectionTitle(doc, 'PRODUITS', GREEN, y)
  y = drawCodeTableHeader(doc, plHeaders, y)
  y = renderPLSection(
    data.produitsSections,
    data.totalProduits,
    'Total Produits',
    GREEN,
    y,
  )

  // Résultat Net row
  y = drawCodeRow(
    doc,
    '',
    'Résultat Net',
    [
      data.resultatNet.n1,
      data.resultatNet.n,
      data.resultatNet.n0,
      data.resultatNet.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )

  drawSignatureBox(doc, Math.min(y + 6, 230))
  drawFooter(
    doc,
    doc.getNumberOfPages(),
    doc.getNumberOfPages(),
    qrDataUri,
    verifyUrl,
  )

  emitPdf(doc, `annexe4_${data.exercice}.pdf`)
}

// ─── Annexe 5 — Suivi du Budget Prévisionnel vs Réalisé ──────────────────────

export type Annexe5Row = {
  libelle: string
  prevu: number
  realise: number
  ecart: number
}
export type Annexe5Input = AnnexeCommonInput & {
  totals: { prevu: number; realise: number; ecart: number }
  rows: Annexe5Row[]
}

export async function generateAnnexe5Pdf(data: Annexe5Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('5', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(
    doc,
    '5',
    'Suivi du Budget — Prévisionnel vs Réalisé',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    { label: 'Budget prévu', value: fmtMad(data.totals.prevu), accent: NAVY },
    {
      label: 'Réalisé',
      value: fmtMad(data.totals.realise),
      accent: GREEN,
      color: GREEN,
    },
    {
      label: 'Écart',
      value: fmtMad(data.totals.ecart),
      accent: ORANGE,
      color:
        data.totals.ecart < 0
          ? ([220, 38, 38] as [number, number, number])
          : GREEN,
    },
  ])
  y += 6

  if (data.rows.length === 0) {
    y = drawEmptyState(
      doc,
      'Aucun budget prévisionnel saisi pour cet exercice.',
      y,
    )
  } else {
    const colW = [78, 33, 33, 38]
    // header
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN + 4
    ;['LIBELLÉ', 'PRÉVU', 'RÉALISÉ', 'ÉCART'].forEach((h, i) => {
      const align = i === 0 ? 'left' : 'right'
      const tx = align === 'right' ? cx + colW[i] - 4 : cx
      doc.text(h, tx, y + 6, { align })
      cx += colW[i]
    })
    y += 9
    data.rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...TEXT_DARK)
      let rx = MARGIN + 4
      ;[r.libelle, fmtMad(r.prevu), fmtMad(r.realise), fmtMad(r.ecart)].forEach(
        (c, i) => {
          const align = i === 0 ? 'left' : 'right'
          const tx = align === 'right' ? rx + colW[i] - 4 : rx
          doc.text(c, tx, y + 5.5, { align })
          rx += colW[i]
        },
      )
      y += 8
    })
    // totals
    doc.setFillColor(...ORANGE_SOFT)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setFillColor(...ORANGE)
    doc.rect(MARGIN, y, 2, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...NAVY)
    let tx = MARGIN + 4
    ;[
      'TOTAL',
      fmtMad(data.totals.prevu),
      fmtMad(data.totals.realise),
      fmtMad(data.totals.ecart),
    ].forEach((c, i) => {
      const align = i === 0 ? 'left' : 'right'
      const cxt = align === 'right' ? tx + colW[i] - 4 : tx
      doc.text(c, cxt, y + 6, { align })
      tx += colW[i]
    })
    y += 9
  }

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe5_${data.exercice}.pdf`)
}

// ─── Annexe 6 — Travaux Non Courants ─────────────────────────────────────────

export type Annexe6Row = {
  libelle: string
  date: string
  montantVote: number
  montantEngage: number
  montantRegle: number
}

export type Annexe6Input = AnnexeCommonInput & {
  totals: { vote: number; engage: number; regle: number; reste: number }
  rows: Annexe6Row[]
}

export async function generateAnnexe6Pdf(data: Annexe6Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('6', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(
    doc,
    '6',
    'Suivi des Travaux et Opérations Non Courantes',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    { label: 'Montant voté', value: fmtMad(data.totals.vote), accent: NAVY },
    {
      label: 'Montant engagé',
      value: fmtMad(data.totals.engage),
      accent: ORANGE,
    },
    {
      label: 'Montant réglé',
      value: fmtMad(data.totals.regle),
      accent: GREEN,
      color: GREEN,
    },
    {
      label: 'Reste à régler',
      value: fmtMad(data.totals.reste),
      accent: ORANGE,
      color:
        data.totals.reste > 0
          ? ([220, 38, 38] as [number, number, number])
          : TEXT_DARK,
    },
  ])
  y += 6

  if (data.rows.length === 0) {
    y = drawEmptyState(doc, 'Aucun travaux exceptionnels pour cet exercice', y)
  } else {
    const colW = [70, 22, 30, 30, 30]
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN + 4
    ;['LIBELLÉ', 'DATE', 'VOTÉ', 'ENGAGÉ', 'RÉGLÉ'].forEach((h, i) => {
      const align = i <= 1 ? 'left' : 'right'
      const tx = align === 'right' ? cx + colW[i] - 4 : cx
      doc.text(h, tx, y + 6, { align })
      cx += colW[i]
    })
    y += 9
    data.rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT_DARK)
      let rx = MARGIN + 4
      ;[
        r.libelle,
        r.date,
        fmtMad(r.montantVote),
        fmtMad(r.montantEngage),
        fmtMad(r.montantRegle),
      ].forEach((c, i) => {
        const align = i <= 1 ? 'left' : 'right'
        const tx = align === 'right' ? rx + colW[i] - 4 : rx
        doc.text(c, tx, y + 5.5, { align })
        rx += colW[i]
      })
      y += 8
    })
  }

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe6_${data.exercice}.pdf`)
}

// ─── Annexe 7 — Mouvements de trésorerie ─────────────────────────────────────

export type Annexe7FlowRow = { libelle: string; montant: number; date?: string }
export type Annexe7Input = AnnexeCommonInput & {
  totals: {
    soldeOuverture: number
    encaissements: number
    decaissements: number
    soldeCloture: number
  }
  encaissements: Annexe7FlowRow[]
  decaissements: Annexe7FlowRow[]
}

export async function generateAnnexe7Pdf(data: Annexe7Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('7', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(doc, '7', 'Mouvements de Trésorerie', logo)
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    {
      label: 'Solde ouverture',
      value: fmtMad(data.totals.soldeOuverture),
      accent: NAVY,
    },
    {
      label: 'Encaissements',
      value: fmtMad(data.totals.encaissements),
      accent: GREEN,
      color: GREEN,
    },
    {
      label: 'Décaissements',
      value: fmtMad(data.totals.decaissements),
      accent: ORANGE,
    },
    {
      label: 'Solde clôture',
      value: fmtMad(data.totals.soldeCloture),
      accent: NAVY,
      color:
        data.totals.soldeCloture >= 0
          ? GREEN
          : ([220, 38, 38] as [number, number, number]),
    },
  ])
  y += 6

  const renderFlowTable = (
    title: string,
    rows: Annexe7FlowRow[],
    accent: [number, number, number],
    yStart: number,
  ): number => {
    let yy = drawSubsectionBand(doc, title, accent, yStart)
    if (rows.length === 0) {
      yy = drawEmptyState(
        doc,
        `Aucun ${title.toLowerCase()} pour cet exercice`,
        yy,
      )
    } else {
      const colW = [110, 30, 42]
      doc.setFillColor(...HEADER_BG)
      doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...NAVY)
      doc.text('LIBELLÉ', MARGIN + 4, yy + 5.5)
      doc.text('DATE', MARGIN + colW[0] + colW[1] - 4, yy + 5.5, {
        align: 'right',
      })
      doc.text('MONTANT', MARGIN + colW[0] + colW[1] + colW[2] - 4, yy + 5.5, {
        align: 'right',
      })
      yy += 8
      rows.forEach((r, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(...ROW_ALT)
          doc.rect(MARGIN, yy, CONTENT_W, 7.5, 'F')
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...TEXT_DARK)
        doc.text(r.libelle, MARGIN + 4, yy + 5)
        doc.text(r.date ?? '—', MARGIN + colW[0] + colW[1] - 4, yy + 5, {
          align: 'right',
        })
        doc.text(
          fmtMad(r.montant),
          MARGIN + colW[0] + colW[1] + colW[2] - 4,
          yy + 5,
          { align: 'right' },
        )
        yy += 7.5
      })
    }
    return yy
  }

  y = renderFlowTable('Encaissements', data.encaissements, GREEN, y)
  y += 4
  y = renderFlowTable('Décaissements', data.decaissements, ORANGE, y)

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe7_${data.exercice}.pdf`)
}

// ─── Annexe 8 — Suivi des Emprunts ───────────────────────────────────────────

export type Annexe8Row = {
  libelle: string
  organisme: string
  dateDebut: string
  montantInitial: number
  paye: number
  reste: number
}

export type Annexe8Input = AnnexeCommonInput & {
  totals: { emprunte: number; paye: number; reste: number }
  rows: Annexe8Row[]
}

export async function generateAnnexe8Pdf(data: Annexe8Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('8', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(doc, '8', 'Suivi des Emprunts', logo)
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    {
      label: 'Total emprunté',
      value: fmtMad(data.totals.emprunte),
      accent: NAVY,
    },
    {
      label: 'Payé cet exercice',
      value: fmtMad(data.totals.paye),
      accent: GREEN,
      color: GREEN,
    },
    {
      label: 'Reste à payer',
      value: fmtMad(data.totals.reste),
      accent: ORANGE,
      color:
        data.totals.reste > 0
          ? ([220, 38, 38] as [number, number, number])
          : TEXT_DARK,
    },
  ])
  y += 6

  if (data.rows.length === 0) {
    y = drawEmptyState(doc, 'Aucun emprunt pour cet exercice', y)
  } else {
    const colW = [55, 35, 22, 24, 24, 22]
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN + 4
    ;['LIBELLÉ', 'ORGANISME', 'DÉBUT', 'INITIAL', 'PAYÉ', 'RESTE'].forEach(
      (h, i) => {
        const align = i <= 2 ? 'left' : 'right'
        const tx = align === 'right' ? cx + colW[i] - 4 : cx
        doc.text(h, tx, y + 6, { align })
        cx += colW[i]
      },
    )
    y += 9
    data.rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT_DARK)
      let rx = MARGIN + 4
      ;[
        r.libelle,
        r.organisme,
        r.dateDebut,
        fmtMad(r.montantInitial),
        fmtMad(r.paye),
        fmtMad(r.reste),
      ].forEach((c, i) => {
        const align = i <= 2 ? 'left' : 'right'
        const tx = align === 'right' ? rx + colW[i] - 4 : rx
        doc.text(c, tx, y + 5.5, { align })
        rx += colW[i]
      })
      y += 8
    })
  }

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe8_${data.exercice}.pdf`)
}

// ─── Annexe 9 — Suivi des Équipements ────────────────────────────────────────

export type Annexe9Row = {
  designation: string
  categorie: string
  dateAcquisition: string
  valeurAcquisition: number
  valeurNette: number
}

export type Annexe9Input = AnnexeCommonInput & {
  totals: {
    nbArticles: number
    valeurTotale: number
    valeurNetteTotale: number
  }
  rows: Annexe9Row[]
}

export async function generateAnnexe9Pdf(data: Annexe9Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('9', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(doc, '9', 'Suivi des Équipements', logo)
  y = drawInfoRow(doc, y + 5, data)
  y = drawKpiRow(doc, y, [
    {
      label: "Nombre d'articles",
      value: String(data.totals.nbArticles),
      accent: NAVY,
    },
    {
      label: 'Valeur acquisition',
      value: fmtMad(data.totals.valeurTotale),
      accent: ORANGE,
    },
    {
      label: 'Valeur nette actuelle',
      value: fmtMad(data.totals.valeurNetteTotale),
      accent: GREEN,
      color: GREEN,
    },
  ])
  y += 6

  if (data.rows.length === 0) {
    y = drawEmptyState(doc, 'Aucun équipement enregistré', y)
  } else {
    const colW = [60, 40, 28, 27, 27]
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN + 4
    ;[
      'DÉSIGNATION',
      'CATÉGORIE',
      'ACQUIS LE',
      'V. ACQUISITION',
      'V. NETTE',
    ].forEach((h, i) => {
      const align = i <= 2 ? 'left' : 'right'
      const tx = align === 'right' ? cx + colW[i] - 4 : cx
      doc.text(h, tx, y + 6, { align })
      cx += colW[i]
    })
    y += 9
    data.rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT_DARK)
      let rx = MARGIN + 4
      ;[
        r.designation,
        r.categorie,
        r.dateAcquisition,
        fmtMad(r.valeurAcquisition),
        fmtMad(r.valeurNette),
      ].forEach((c, i) => {
        const align = i <= 2 ? 'left' : 'right'
        const tx = align === 'right' ? rx + colW[i] - 4 : rx
        doc.text(c, tx, y + 5.5, { align })
        rx += colW[i]
      })
      y += 8
    })
  }

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe9_${data.exercice}.pdf`)
}

// ─── Annexe 11 — État simplifié de la situation financière ───────────────────

export type Annexe11Input = AnnexeCommonInput & {
  totals: { actif: number; passif: number }
  actifRows: Annexe3BilanRow[]
  passifRows: Annexe3BilanRow[]
}

export async function generateAnnexe11Pdf(data: Annexe11Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('11', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(
    doc,
    '11',
    'État simplifié de la situation financière',
    logo,
  )
  y = drawInfoRow(doc, y + 5, data)
  const equilibre = Math.abs(data.totals.actif - data.totals.passif) < 0.01
  y = drawKpiRow(doc, y, [
    { label: 'Total Actif', value: fmtMad(data.totals.actif), accent: ORANGE },
    { label: 'Total Passif', value: fmtMad(data.totals.passif), accent: NAVY },
    {
      label: 'Bilan',
      value: equilibre ? 'Équilibré' : 'Déséquilibré',
      accent: GREEN,
      color: equilibre ? GREEN : ([220, 38, 38] as [number, number, number]),
    },
  ])
  y += 6

  y = drawBigSectionTitle(doc, 'ACTIF', NAVY, y)
  y = drawCodeTableHeader(
    doc,
    ['CODE', 'LIBELLÉ', 'EXERCICE CLOS (N)', 'EXERCICE PRÉCÉDENT / (N-1)'],
    y,
  )
  if (data.actifRows.length === 0) {
    y = drawEmptyState(doc, 'Aucune donnée de bilan', y)
  } else {
    data.actifRows.forEach((r, i) => {
      y = drawCodeRow(
        doc,
        r.code,
        r.libelle,
        [r.currentValue, r.previousValue],
        y,
        { alt: i % 2 === 1 },
      )
    })
  }
  y = drawCodeRow(doc, '', 'Total Actif', [data.totals.actif, 0], y, {
    bold: true,
    highlight: true,
  })
  y += 4

  y = drawBigSectionTitle(doc, 'PASSIF', GREEN, y)
  y = drawCodeTableHeader(
    doc,
    ['CODE', 'LIBELLÉ', 'EXERCICE CLOS (N)', 'EXERCICE PRÉCÉDENT / (N-1)'],
    y,
  )
  if (data.passifRows.length === 0) {
    y = drawEmptyState(doc, 'Aucune donnée de bilan', y)
  } else {
    data.passifRows.forEach((r, i) => {
      y = drawCodeRow(
        doc,
        r.code,
        r.libelle,
        [r.currentValue, r.previousValue],
        y,
        { alt: i % 2 === 1 },
      )
    })
  }
  y = drawCodeRow(doc, '', 'Total Passif', [data.totals.passif, 0], y, {
    bold: true,
    highlight: true,
  })

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe11_${data.exercice}.pdf`)
}

// ─── Annexe 12 — Compte de Résultat Simplifié ────────────────────────────────

export type Annexe12Input = AnnexeCommonInput & {
  resultatFinal: number
  // Charges groupées
  chargesCourantes: Annexe4Row[] // 611, 612, 613/614, 616, 617
  totalChargesCourantes: Quad
  chargesNonCourantes: Annexe4Row[] // 651, 691
  totalChargesNonCourantes: Quad
  // Produits groupés
  produitsCourants: Annexe4Row[] // 711, 712
  totalProduitsCourants: Quad
  produitsNonCourants: Annexe4Row[] // 751, 791
  totalProduitsNonCourants: Quad
  // Computed
  resultatCourant: Quad
  resultatNonCourant: Quad
  resultatFinalQuad: Quad
}

export async function generateAnnexe12Pdf(data: Annexe12Input): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { logo, docCode, verifyUrl, qrDataUri } = await buildPdfBase('12', data)

  startPage(doc, docCode, 1, 1)
  let y = drawHeaderBand(doc, '12', 'Compte de Résultat Simplifié', logo)
  y = drawInfoRow(doc, y + 5, data)

  // Hero card — Résultat Final
  doc.setFillColor(...HEADER_BG)
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(MARGIN, y, 2, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('RÉSULTAT FINAL (VII = III + VI)', MARGIN + 6, y + 7.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(
    ...(data.resultatFinal >= 0
      ? GREEN
      : ([220, 38, 38] as [number, number, number])),
  )
  doc.text(fmtMad(data.resultatFinal), MARGIN + 6, y + 16)
  y += 20 + 6

  const plHeaders = [
    'CODE',
    'LIBELLÉ',
    'BUDGET VOTÉ / (N+1)',
    'RÉALISÉ CLOS / (N)',
    'BUDGET VOTÉ / (N)',
    'APPROUVÉ / (N-1)',
  ]
  y = drawCodeTableHeader(doc, plHeaders, y)

  // CHARGES
  y = drawBigSectionTitle(doc, 'CHARGES', ORANGE, y)
  data.chargesCourantes.forEach((r, i) => {
    y = drawCodeRow(
      doc,
      r.code,
      r.libelle,
      [r.q.n1, r.q.n, r.q.n0, r.q.nMinus1],
      y,
      { alt: i % 2 === 1 },
    )
  })
  y = drawCodeRow(
    doc,
    '',
    'Total Charges Courantes (I)',
    [
      data.totalChargesCourantes.n1,
      data.totalChargesCourantes.n,
      data.totalChargesCourantes.n0,
      data.totalChargesCourantes.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )
  data.chargesNonCourantes.forEach((r, i) => {
    y = drawCodeRow(
      doc,
      r.code,
      r.libelle,
      [r.q.n1, r.q.n, r.q.n0, r.q.nMinus1],
      y,
      { alt: i % 2 === 1 },
    )
  })
  y = drawCodeRow(
    doc,
    '',
    'Total Charges Non Courantes (II)',
    [
      data.totalChargesNonCourantes.n1,
      data.totalChargesNonCourantes.n,
      data.totalChargesNonCourantes.n0,
      data.totalChargesNonCourantes.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )

  // PRODUITS
  y = drawBigSectionTitle(doc, 'PRODUITS', GREEN, y)
  data.produitsCourants.forEach((r, i) => {
    y = drawCodeRow(
      doc,
      r.code,
      r.libelle,
      [r.q.n1, r.q.n, r.q.n0, r.q.nMinus1],
      y,
      { alt: i % 2 === 1 },
    )
  })
  y = drawCodeRow(
    doc,
    '',
    'Total Produits Courants (III)',
    [
      data.totalProduitsCourants.n1,
      data.totalProduitsCourants.n,
      data.totalProduitsCourants.n0,
      data.totalProduitsCourants.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )
  data.produitsNonCourants.forEach((r, i) => {
    y = drawCodeRow(
      doc,
      r.code,
      r.libelle,
      [r.q.n1, r.q.n, r.q.n0, r.q.nMinus1],
      y,
      { alt: i % 2 === 1 },
    )
  })
  y = drawCodeRow(
    doc,
    '',
    'Total Produits Non Courants (IV)',
    [
      data.totalProduitsNonCourants.n1,
      data.totalProduitsNonCourants.n,
      data.totalProduitsNonCourants.n0,
      data.totalProduitsNonCourants.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )

  // Résultats
  y = drawCodeRow(
    doc,
    '',
    'Résultat Courant (III - I)',
    [
      data.resultatCourant.n1,
      data.resultatCourant.n,
      data.resultatCourant.n0,
      data.resultatCourant.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )
  y = drawCodeRow(
    doc,
    '',
    'Résultat Non Courant (IV - II)',
    [
      data.resultatNonCourant.n1,
      data.resultatNonCourant.n,
      data.resultatNonCourant.n0,
      data.resultatNonCourant.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )
  y = drawCodeRow(
    doc,
    '',
    'Résultat Final (VII = III + VI)',
    [
      data.resultatFinalQuad.n1,
      data.resultatFinalQuad.n,
      data.resultatFinalQuad.n0,
      data.resultatFinalQuad.nMinus1,
    ],
    y,
    {
      bold: true,
      highlight: true,
    },
  )

  drawSignatureBox(doc, Math.max(y + 6, 215))
  drawFooter(doc, 1, 1, qrDataUri, verifyUrl)

  emitPdf(doc, `annexe12_${data.exercice}.pdf`)
}

// ─── Public helper: route by annexe number ───────────────────────────────────

/**
 * Generate any of the 11 implemented annexes with zero/empty defaults
 * (real data should be passed directly via the specific generator).
 */
export async function generateAnnexePdf(
  annexeNum: string,
  ctx: AnnexeCommonInput,
): Promise<void> {
  const logoInvertedDataUri =
    ctx.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const enriched = { ...ctx, logoInvertedDataUri }

  const zero4: Quad = { n1: 0, n: 0, n0: 0, nMinus1: 0 }
  const emptyTotal = { currentValue: 0, previousValue: 0 }

  switch (annexeNum) {
    case '3':
      return generateAnnexe3Pdf({
        ...enriched,
        actif: { sections: [], total: emptyTotal },
        passif: { sections: [], total: emptyTotal },
      })
    case '4':
      return generateAnnexe4Pdf({
        ...enriched,
        totals: { charges: 0, produits: 0, resultat: 0 },
        chargesSections: [],
        produitsSections: [],
        totalCharges: zero4,
        totalProduits: zero4,
        resultatNet: zero4,
      })
    case '5':
      return generateAnnexe5Pdf({
        ...enriched,
        totals: { prevu: 0, realise: 0, ecart: 0 },
        rows: [],
      })
    case '6':
      return generateAnnexe6Pdf({
        ...enriched,
        totals: { vote: 0, engage: 0, regle: 0, reste: 0 },
        rows: [],
      })
    case '7':
      return generateAnnexe7Pdf({
        ...enriched,
        totals: {
          soldeOuverture: 0,
          encaissements: 0,
          decaissements: 0,
          soldeCloture: 0,
        },
        encaissements: [],
        decaissements: [],
      })
    case '8':
      return generateAnnexe8Pdf({
        ...enriched,
        totals: { emprunte: 0, paye: 0, reste: 0 },
        rows: [],
      })
    case '9':
      return generateAnnexe9Pdf({
        ...enriched,
        totals: { nbArticles: 0, valeurTotale: 0, valeurNetteTotale: 0 },
        rows: [],
      })
    case '10':
      return generateAnnexe10Pdf({
        ...enriched,
        totals: { soldeInitial: 0, appele: 0, paye: 0, soldeFinal: 0 },
        rows: [],
      })
    case '11':
      return generateAnnexe11Pdf({
        ...enriched,
        totals: { actif: 0, passif: 0 },
        actifRows: [],
        passifRows: [],
      })
    case '12':
      return generateAnnexe12Pdf({
        ...enriched,
        resultatFinal: 0,
        chargesCourantes: [],
        totalChargesCourantes: zero4,
        chargesNonCourantes: [],
        totalChargesNonCourantes: zero4,
        produitsCourants: [],
        totalProduitsCourants: zero4,
        produitsNonCourants: [],
        totalProduitsNonCourants: zero4,
        resultatCourant: zero4,
        resultatNonCourant: zero4,
        resultatFinalQuad: zero4,
      })
    case '13-1':
      return generateAnnexe131Pdf({
        ...enriched,
        current: { fondsReserve: 0, creances: 0, dettes: 0, tresorerie: 0 },
        previous: { fondsReserve: 0, creances: 0, dettes: 0, tresorerie: 0 },
      })
    case '13-2':
      return generateAnnexe132Pdf({
        ...enriched,
        excedent: 0,
        recettes: {
          cotisations: zero4,
          fondsReserve: zero4,
          autresAg: zero4,
          autresProduits: zero4,
        },
        depenses: {
          matieres: zero4,
          servicesExterieurs: zero4,
          impotsTaxes: zero4,
          personnel: zero4,
          autresCharges: zero4,
        },
      })
    default:
      throw new Error(`Annexe ${annexeNum} non encore implémentée`)
  }
}
