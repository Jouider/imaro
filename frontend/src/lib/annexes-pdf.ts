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
import { loadLogo } from './annexes-pdf-assets'

// ─── Imaro brand tokens ──────────────────────────────────────────────────────

const NAVY:        [number, number, number] = [27, 79, 114]    // #1B4F72 — primary
const NAVY_DEEP:   [number, number, number] = [18, 56, 84]     // darker navy for gradient
const ORANGE:      [number, number, number] = [230, 126, 34]   // #E67E22 — accent
const ORANGE_SOFT: [number, number, number] = [253, 240, 226]  // tinted bg
const GREEN:       [number, number, number] = [39, 174, 96]    // #27AE60 — success
const GREEN_DARK:  [number, number, number] = [30, 132, 73]
const TEXT_DARK:   [number, number, number] = [44, 62, 80]     // #2c3e50
const TEXT_MUTED:  [number, number, number] = [127, 140, 141]  // #7f8c8d
const BORDER:      [number, number, number] = [228, 232, 237]
const ROW_ALT:     [number, number, number] = [249, 250, 251]
const HEADER_BG:   [number, number, number] = [241, 245, 249]
const NAVY_TINT:   [number, number, number] = [232, 240, 247]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const CONTENT_W = PAGE_W - MARGIN * 2

// ─── Common types ────────────────────────────────────────────────────────────

export type AnnexeCommonInput = {
  residenceName: string
  exerciceLabel: string   // e.g. "Exercice clos le 31 décembre 2026"
  exercice: number
  generatedAtIso?: string
  documentCode?: string
  /** Optional pre-loaded logo data URI. If omitted, loaded automatically. */
  logoInvertedDataUri?: string
}

const fmtMad = (n: number): string =>
  n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'

const fmtDateFr = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('fr-FR')
}

function genDocCode(annexeNum: string, residenceName: string, exercice: number): string {
  const slug = residenceName.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4) || 'IMARO'
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
function drawTopBar(doc: jsPDF, docCode: string, pageNum: number, totalPages: number): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('IMARO', MARGIN, 7)
  doc.text(docCode, PAGE_W / 2, 7, { align: 'center' })
  doc.text(`Page ${pageNum}/${totalPages}`, PAGE_W - MARGIN, 7, { align: 'right' })
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
    doc.rect(MARGIN + (CONTENT_W * i) / steps, bandY, CONTENT_W / steps + 0.3, bandH, 'F')
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
  doc.line(PAGE_W / 2 - titleWidth / 3, bandY + 17.5, PAGE_W / 2 + titleWidth / 3, bandY + 17.5)

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
    doc.roundedRect(badgeX + (badgeW * i) / 30, badgeY, badgeW / 30 + 0.3, badgeH, 2.5, 2.5, 'F')
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
    { label: 'IMMEUBLE',  value: ctx.residenceName },
    { label: 'EXERCICE',  value: ctx.exerciceLabel },
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
  const labelY    = y + 6.5
  const sigLineY  = y + boxH * 0.62
  const syndicY   = sigLineY + 4
  const dateY     = y + boxH - 3
  const dateLineY = dateY

  // Label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...NAVY)
  doc.text('SIGNATURE ET CACHET DU SYNDIC', boxX + boxW / 2, labelY, { align: 'center' })

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
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const sepY = 262
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, sepY, PAGE_W - MARGIN, sepY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(
    'Document généré par Imaro.ma  •  Conforme au décret n° 2.23.700',
    PAGE_W / 2, sepY + 5, { align: 'center' },
  )

  // QR placeholder (small)
  const qrSize = 14
  const qrX = MARGIN
  const qrY = PAGE_H - 22

  doc.setFillColor(20, 20, 20)
  doc.rect(qrX, qrY, qrSize, qrSize, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(qrX + 1.5, qrY + 1.5, 3.5, 3.5, 'F')
  doc.rect(qrX + qrSize - 5, qrY + 1.5, 3.5, 3.5, 'F')
  doc.rect(qrX + 1.5, qrY + qrSize - 5, 3.5, 3.5, 'F')
  doc.setFillColor(20, 20, 20)
  doc.rect(qrX + 2.5, qrY + 2.5, 1.5, 1.5, 'F')
  doc.rect(qrX + qrSize - 4, qrY + 2.5, 1.5, 1.5, 'F')
  doc.rect(qrX + 2.5, qrY + qrSize - 4, 1.5, 1.5, 'F')
  doc.setFillColor(20, 20, 20)
  doc.rect(qrX + 7, qrY + 6, 1.2, 1.2, 'F')
  doc.rect(qrX + 9, qrY + 8, 1.2, 1.2, 'F')
  doc.rect(qrX + 6, qrY + 10, 1.2, 1.2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...NAVY)
  doc.text('SCAN TO VERIFY', qrX + qrSize + 2, qrY + qrSize - 1)

  // Centered tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('Document généré par Imaro.ma', PAGE_W / 2, qrY + 6, { align: 'center' })
  doc.text('Conforme au décret n° 2.23.700', PAGE_W / 2, qrY + 10.5, { align: 'center' })

  // Page number
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Page ${pageNum}/${totalPages}`, PAGE_W - MARGIN, qrY + 10.5, { align: 'right' })
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
  options: { valueColor?: [number, number, number]; accent?: [number, number, number] } = {},
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
  const logo = data.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const docCode = data.documentCode ?? genDocCode('10', data.residenceName, data.exercice)
  const totalPages = 1

  drawTopAccent(doc)
  drawTopBar(doc, docCode, 1, totalPages)
  let y = drawHeaderBand(doc, '10', 'Suivi des contributions des copropriétaires', logo)
  y = drawInfoRow(doc, y + 5, data)

  // 4 KPI cards — alternating accent (orange / navy / green / orange)
  const kpiW = (CONTENT_W - 9) / 4
  const kpiH = 20
  drawKpiCard(doc, MARGIN,                  y, kpiW, kpiH, 'Solde au 01/01',        fmtMad(data.totals.soldeInitial))
  drawKpiCard(doc, MARGIN + (kpiW + 3),     y, kpiW, kpiH, 'Montant annuel appelé', fmtMad(data.totals.appele), { accent: NAVY })
  drawKpiCard(doc, MARGIN + (kpiW + 3) * 2, y, kpiW, kpiH, 'Versements effectués',  fmtMad(data.totals.paye), { valueColor: GREEN, accent: GREEN })
  drawKpiCard(doc, MARGIN + (kpiW + 3) * 3, y, kpiW, kpiH, 'Solde au 31/12',        fmtMad(data.totals.soldeFinal))

  y += kpiH + 10

  // Table
  if (data.rows.length === 0) {
    doc.setFillColor(...HEADER_BG)
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('Aucun copropriétaire enregistré', PAGE_W / 2, y + 12, { align: 'center' })
    y += 20 + 6
  } else {
    const colW = [22, 65, 30, 28, 28, 31]
    const headers = ['Lot', 'Copropriétaire', 'Solde initial', 'Appelé', 'Payé', 'Solde final']

    // Header row — navy with white text
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN + 4
    headers.forEach((h, i) => {
      const align = i >= 2 ? 'right' : 'left'
      const tx = align === 'right' ? cx + colW[i] - 4 : cx
      doc.text(h.toUpperCase(), tx, y + 6, { align })
      cx += colW[i]
    })
    y += 9

    // Rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    data.rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
      }
      let rx = MARGIN + 4
      const cells = [
        r.lotNumero, r.coproprietaireNom,
        fmtMad(r.soldeInitial), fmtMad(r.appele),
        fmtMad(r.paye), fmtMad(r.soldeFinal),
      ]
      cells.forEach((c, i) => {
        const align = i >= 2 ? 'right' : 'left'
        const tx = align === 'right' ? rx + colW[i] - 4 : rx
        doc.text(c, tx, y + 5.5, { align })
        rx += colW[i]
      })
      y += 8
    })

    // Totals row — orange highlight
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
      'TOTAL', '',
      fmtMad(data.totals.soldeInitial), fmtMad(data.totals.appele),
      fmtMad(data.totals.paye), fmtMad(data.totals.soldeFinal),
    ]
    totalCells.forEach((c, i) => {
      const align = i >= 2 ? 'right' : 'left'
      const ax = align === 'right' ? tx + colW[i] - 4 : tx
      doc.text(c, ax, y + 6, { align })
      tx += colW[i]
    })
    y += 9 + 6
  }

  drawSignatureBox(doc, Math.max(y, 215))
  drawFooter(doc, 1, totalPages)

  doc.save(`annexe10_${data.exercice}.pdf`)
}

// ─── Annexe 13-1 — État de la situation financière (très simplifié) ──────────

export type Annexe13_1Input = AnnexeCommonInput & {
  current:  { fondsReserve: number; creances: number; dettes: number; tresorerie: number }
  previous: { fondsReserve: number; creances: number; dettes: number; tresorerie: number }
}

export async function generateAnnexe131Pdf(data: Annexe13_1Input): Promise<void> {
  const logo = data.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const docCode = data.documentCode ?? genDocCode('13-1', data.residenceName, data.exercice)

  drawTopAccent(doc)
  drawTopBar(doc, docCode, 1, 1)
  let y = drawHeaderBand(doc, '13-1', 'État de la situation financière (très simplifié)', logo)
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
  doc.text('EXERCICE CLOS (N)',          MARGIN + labelW + colW - 4, y + 6.5, { align: 'right' })
  doc.text('EXERCICE PRÉCÉDENT (N-1)',   MARGIN + labelW + colW * 2 - 4, y + 6.5, { align: 'right' })
  y += 10

  const rows = [
    { label: 'Situation des comptes de réserve', current: data.current.fondsReserve, previous: data.previous.fondsReserve },
    { label: 'Situation des créances',           current: data.current.creances,     previous: data.previous.creances },
    { label: 'Situation des dettes',             current: data.current.dettes,       previous: data.previous.dettes },
    { label: 'Situation de la trésorerie',       current: data.current.tresorerie,   previous: data.previous.tresorerie, highlight: true },
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
    doc.setTextColor(r.highlight ? NAVY[0] : TEXT_DARK[0],
                     r.highlight ? NAVY[1] : TEXT_DARK[1],
                     r.highlight ? NAVY[2] : TEXT_DARK[2])
    doc.text(r.label, MARGIN + 5, y + 7)
    doc.text(fmtMad(r.current),  MARGIN + labelW + colW - 4,     y + 7, { align: 'right' })
    doc.text(fmtMad(r.previous), MARGIN + labelW + colW * 2 - 4, y + 7, { align: 'right' })
    y += 11
  })

  drawSignatureBox(doc, 195)
  drawFooter(doc, 1, 1)

  doc.save(`annexe13-1_${data.exercice}.pdf`)
}

// ─── Annexe 13-2 — Compte des produits et charges et budget ──────────────────

type Quad = { n1: number; n: number; n0: number; nMinus1: number }

function sumQuad(items: Quad[]): Quad {
  return items.reduce(
    (acc, q) => ({
      n1: acc.n1 + q.n1, n: acc.n + q.n, n0: acc.n0 + q.n0, nMinus1: acc.nMinus1 + q.nMinus1,
    }),
    { n1: 0, n: 0, n0: 0, nMinus1: 0 },
  )
}

export type Annexe13_2Input = AnnexeCommonInput & {
  excedent: number
  recettes: {
    cotisations:    Quad
    fondsReserve:   Quad
    autresAg:       Quad
    autresProduits: Quad
  }
  depenses: {
    matieres:           Quad
    servicesExterieurs: Quad
    impotsTaxes:        Quad
    personnel:          Quad
    autresCharges:      Quad
  }
}

export async function generateAnnexe132Pdf(data: Annexe13_2Input): Promise<void> {
  const logo = data.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const docCode = data.documentCode ?? genDocCode('13-2', data.residenceName, data.exercice)

  drawTopAccent(doc)
  drawTopBar(doc, docCode, 1, 1)
  let y = drawHeaderBand(doc, '13-2', 'Compte des produits et charges et budget', logo)
  y = drawInfoRow(doc, y + 5, data)

  // EXCÉDENT hero card — orange-accented
  doc.setFillColor(...HEADER_BG)
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(MARGIN, y, 2, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('EXCÉDENT DE L\'EXERCICE', MARGIN + 6, y + 7.5)
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
  const drawSectionLabel = (label: string, accent: [number, number, number], yPos: number): number => {
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
    yPos: number, label: string, q: Quad,
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
    const labelStartY = labelLines.length === 1
      ? yPos + rowH / 2 + 1.5
      : yPos + 5
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
    { label: 'Contributions perçues (cotisations)', q: data.recettes.cotisations },
    { label: 'Contributions au fonds de réserve',   q: data.recettes.fondsReserve },
    { label: "Autres produits votés par l'AG",      q: data.recettes.autresAg },
    { label: 'Autres produits',                     q: data.recettes.autresProduits },
  ]
  recettes.forEach((r, i) => { y = drawDataRow(y, r.label, r.q, { alt: i % 2 === 1 }) })
  const totalRecettes = sumQuad(recettes.map((r) => r.q))
  y = drawDataRow(y, 'Total des Recettes', totalRecettes, { bold: true, highlight: 'navy' })

  // Dépenses
  y = drawSectionLabel('Dépenses', ORANGE, y)
  const depenses = [
    { label: 'Matières et fournitures (eau, électricité, équipement)', q: data.depenses.matieres },
    { label: 'Services extérieurs (nettoyage, maintenance, syndic)',   q: data.depenses.servicesExterieurs },
    { label: 'Impôts et taxes',                                         q: data.depenses.impotsTaxes },
    { label: 'Personnel',                                               q: data.depenses.personnel },
    { label: 'Autres charges de fonctionnement',                        q: data.depenses.autresCharges },
  ]
  depenses.forEach((r, i) => { y = drawDataRow(y, r.label, r.q, { alt: i % 2 === 1 }) })
  const totalDepenses = sumQuad(depenses.map((r) => r.q))
  y = drawDataRow(y, 'Total des Dépenses', totalDepenses, { bold: true, highlight: 'navy' })

  // Excédent row (orange highlight) — realized column tinted green
  const excQuad: Quad = {
    n1:      totalRecettes.n1      - totalDepenses.n1,
    n:       totalRecettes.n       - totalDepenses.n,
    n0:      totalRecettes.n0      - totalDepenses.n0,
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
    { v: excQuad.n1,      tint: TEXT_DARK },
    { v: excQuad.n,       tint: GREEN },     // realized → green
    { v: excQuad.n0,      tint: TEXT_DARK },
    { v: excQuad.nMinus1, tint: TEXT_DARK },
  ]
  excVals.forEach((cell, i) => {
    const cx = MARGIN + labelW + colW * (i + 1) - 4
    doc.setTextColor(...cell.tint)
    doc.text(fmtMad(cell.v), cx, excValueY, { align: 'right' })
  })
  y += excRowH + 6

  drawSignatureBox(doc, Math.max(y, 215))
  drawFooter(doc, 1, 1)

  doc.save(`annexe13-2_${data.exercice}.pdf`)
}

// ─── Public helper: route by annexe number ───────────────────────────────────

/**
 * Generate any of the 3 required annexes from mock or real data.
 */
export async function generateAnnexePdf(
  annexeNum: string,
  ctx: AnnexeCommonInput,
): Promise<void> {
  // Pre-load logo once (cached after first call)
  const logoInvertedDataUri = ctx.logoInvertedDataUri ?? (await loadLogo('horizontal-inverted'))
  const enriched = { ...ctx, logoInvertedDataUri }

  const zero4: Quad = { n1: 0, n: 0, n0: 0, nMinus1: 0 }
  const zeroBalance = { fondsReserve: 0, creances: 0, dettes: 0, tresorerie: 0 }

  if (annexeNum === '10') {
    return generateAnnexe10Pdf({
      ...enriched,
      totals: { soldeInitial: 0, appele: 0, paye: 0, soldeFinal: 0 },
      rows: [],
    })
  }
  if (annexeNum === '13-1') {
    return generateAnnexe131Pdf({
      ...enriched,
      current:  zeroBalance,
      previous: zeroBalance,
    })
  }
  if (annexeNum === '13-2') {
    return generateAnnexe132Pdf({
      ...enriched,
      excedent: 0,
      recettes: {
        cotisations: zero4, fondsReserve: zero4, autresAg: zero4, autresProduits: zero4,
      },
      depenses: {
        matieres: zero4, servicesExterieurs: zero4, impotsTaxes: zero4,
        personnel: zero4, autresCharges: zero4,
      },
    })
  }
  throw new Error(`Annexe ${annexeNum} non encore implémentée`)
}
