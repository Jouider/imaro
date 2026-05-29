import { jsPDF } from 'jspdf'
import type {
  ComptabiliteDashboard,
  EcritureComptable,
  BalanceLigne,
} from '@/services/comptabilite.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' MAD'

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

const todayFr = () => new Date().toLocaleDateString('fr-FR')

// ─── Layout constants ─────────────────────────────────────────────────────────

const MARGIN = 14
const PAGE_W = 210
const CONTENT_W = PAGE_W - MARGIN * 2 // 182
const FOOTER_Y = 285

// ─── Shared drawing helpers ───────────────────────────────────────────────────

function addHeader(
  doc: jsPDF,
  companyName: string,
  reportTitle: string,
  residenceName: string,
  city: string,
): void {
  // Company name in navy blue
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(27, 79, 114)
  doc.text(companyName, MARGIN, 20)

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(127, 140, 141)
  doc.text('Gestionnaire de Copropriété', MARGIN, 26)

  // Separator line
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, 30, PAGE_W - MARGIN, 30)

  // Report title centered
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text(reportTitle, PAGE_W / 2, 40, { align: 'center' })

  // Residence name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text(residenceName, MARGIN, 50)

  // City / address
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(city, MARGIN, 55)
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const y = FOOTER_Y
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(
    'Document établi conformément à la Loi 18-00 relative au statut de la copropriété des immeubles bâtis',
    MARGIN,
    y + 2,
  )
  doc.text(
    'Document généré par Imaro — Plateforme de Gestion de Syndic',
    PAGE_W / 2,
    y + 7,
    { align: 'center' },
  )
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, y + 2, {
    align: 'right',
  })
}

function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(27, 79, 114)
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(title, MARGIN + 3, y + 5.5)
  return y + 8
}

// Draw a simple table.
// headers: array of { label, width } (widths should sum to CONTENT_W)
// rows: array of string arrays aligned to headers
// Returns the Y position after the table.
function drawTable(
  doc: jsPDF,
  headers: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }>,
  rows: string[][],
  startY: number,
  rowHeight = 7,
): number {
  const headerH = 8

  // Header background
  doc.setFillColor(236, 240, 241)
  doc.rect(MARGIN, startY, CONTENT_W, headerH, 'F')

  // Header borders
  doc.setDrawColor(189, 195, 199)
  doc.setLineWidth(0.2)
  doc.rect(MARGIN, startY, CONTENT_W, headerH)

  // Header text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)

  let x = MARGIN
  for (const h of headers) {
    const align = h.align ?? 'left'
    const textX =
      align === 'right'
        ? x + h.width - 2
        : align === 'center'
          ? x + h.width / 2
          : x + 2
    doc.text(h.label, textX, startY + 5.5, { align })
    x += h.width
  }

  // Draw rows
  let y = startY + headerH
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Zebra
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 250)
      doc.rect(MARGIN, y, CONTENT_W, rowHeight, 'F')
    }

    // Row border
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.1)
    doc.rect(MARGIN, y, CONTENT_W, rowHeight)

    // Cell text
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)

    let cx = MARGIN
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j]
      const align = h.align ?? 'left'
      const cellText = row[j] ?? ''
      const textX =
        align === 'right'
          ? cx + h.width - 2
          : align === 'center'
            ? cx + h.width / 2
            : cx + 2
      // Truncate long text
      const maxChars = Math.floor(h.width / 2.2)
      const truncated =
        cellText.length > maxChars
          ? cellText.slice(0, maxChars - 1) + '…'
          : cellText
      doc.text(truncated, textX, y + rowHeight / 2 + 1.5, { align })
      cx += h.width
    }

    y += rowHeight
  }

  return y
}

// Draw a total row (bold, slightly different background)
function drawTotalRow(
  doc: jsPDF,
  headers: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }>,
  cells: string[],
  y: number,
  rowHeight = 7,
): number {
  doc.setFillColor(213, 219, 219)
  doc.rect(MARGIN, y, CONTENT_W, rowHeight, 'F')
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.2)
  doc.rect(MARGIN, y, CONTENT_W, rowHeight)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(27, 79, 114)

  let cx = MARGIN
  for (let j = 0; j < headers.length; j++) {
    const h = headers[j]
    const align = h.align ?? 'left'
    const cellText = cells[j] ?? ''
    const textX =
      align === 'right'
        ? cx + h.width - 2
        : align === 'center'
          ? cx + h.width / 2
          : cx + 2
    doc.text(cellText, textX, y + rowHeight / 2 + 1.5, { align })
    cx += h.width
  }

  return y + rowHeight
}

// ─── 1. Rapport Financier ─────────────────────────────────────────────────────

export type RapportFinancierParams = {
  companyName: string
  residenceName: string
  city: string
  annee: number
  dashboard: ComptabiliteDashboard
  nbLots: number
}

export function generateRapportFinancier(params: RapportFinancierParams): void {
  const { companyName, residenceName, city, annee, dashboard, nbLots } = params
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const title = `RAPPORT FINANCIER — EXERCICE ${annee}`

  // ── PAGE 1: Synthèse financière ──────────────────────────────────────────────
  addHeader(doc, companyName, title, residenceName, city)

  // Blue banner "Situation au {date}"
  let y = 62
  doc.setFillColor(27, 79, 114)
  doc.roundedRect(MARGIN, y, CONTENT_W, 9, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(`Situation au ${todayFr()}`, PAGE_W / 2, y + 6, { align: 'center' })
  y += 14

  // Section header
  y = addSectionHeader(doc, 'SYNTHÈSE FINANCIÈRE', y) + 6

  // KPI boxes in 2×2 grid
  const boxW = (CONTENT_W - 6) / 2
  const boxH = 28

  type KpiBox = {
    label: string
    value: string
    r: number
    g: number
    b: number
  }

  const resultatColor: [number, number, number] =
    dashboard.resultat >= 0 ? [39, 174, 96] : [231, 76, 60]

  const kpiBoxes: KpiBox[] = [
    {
      label: 'Total Encaissements',
      value: fmt(dashboard.produits),
      r: 39,
      g: 174,
      b: 96,
    },
    {
      label: 'Total Charges (Dépenses)',
      value: fmt(dashboard.charges),
      r: 231,
      g: 76,
      b: 60,
    },
    {
      label: 'Excédent / Déficit',
      value: fmt(dashboard.resultat),
      r: resultatColor[0],
      g: resultatColor[1],
      b: resultatColor[2],
    },
    {
      label: "Trésorerie en fin d'exercice",
      value: fmt(dashboard.tresorerie),
      r: 39,
      g: 174,
      b: 96,
    },
  ]

  const boxPositions = [
    { x: MARGIN, row: 0 },
    { x: MARGIN + boxW + 6, row: 0 },
    { x: MARGIN, row: 1 },
    { x: MARGIN + boxW + 6, row: 1 },
  ]

  for (let i = 0; i < kpiBoxes.length; i++) {
    const box = kpiBoxes[i]
    const pos = boxPositions[i]
    const bx = pos.x
    const by = y + pos.row * (boxH + 4)

    // Border
    doc.setDrawColor(box.r, box.g, box.b)
    doc.setLineWidth(0.6)
    doc.roundedRect(bx, by, boxW, boxH, 2, 2)

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text(box.label, bx + boxW / 2, by + 9, { align: 'center' })

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(box.r, box.g, box.b)
    doc.text(box.value, bx + boxW / 2, by + 21, { align: 'center' })
  }

  y += 2 * (boxH + 4) + 8

  // Small note
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  doc.text(
    'Encaissements = cotisations effectivement reçues (hors avances). Charges = dépenses décaissées. Base de caisse.',
    MARGIN,
    y,
  )
  y += 6

  // Solde début
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  doc.text("Solde en début d'exercice : 0,00 MAD", MARGIN, y)
  y += 6
  doc.text(`${nbLots} lots`, MARGIN, y)

  addFooter(doc, 1, 3)

  // ── PAGE 2: Répartition des charges ──────────────────────────────────────────
  doc.addPage()
  addHeader(doc, companyName, title, residenceName, city)
  y = 65

  y = addSectionHeader(doc, 'RÉPARTITION DES CHARGES', y) + 4

  const chargeHeaders: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }> = [
    { label: 'CATÉGORIE', width: 110 },
    { label: 'MONTANT', width: 42, align: 'right' },
    { label: '%', width: 30, align: 'right' },
  ]

  const totalCharges = dashboard.charges_par_categorie.reduce(
    (s, c) => s + c.montant,
    0,
  )
  const chargeRows = dashboard.charges_par_categorie.map((c) => [
    c.categorie,
    fmt(c.montant),
    totalCharges > 0
      ? ((c.montant / totalCharges) * 100).toFixed(1) + '%'
      : '0.0%',
  ])

  y = drawTable(doc, chargeHeaders, chargeRows, y)
  drawTotalRow(doc, chargeHeaders, ['TOTAL', fmt(totalCharges), '100%'], y)

  addFooter(doc, 2, 3)

  // ── PAGE 3: Analyse des impayés ───────────────────────────────────────────────
  doc.addPage()
  addHeader(doc, companyName, title, residenceName, city)
  y = 65

  y = addSectionHeader(doc, 'ANALYSE DES IMPAYÉS', y) + 4

  // Table headers
  const impayeHeaders: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }> = [
    { label: 'ANCIENNETÉ', width: 68 },
    { label: 'NB. LOTS', width: 30, align: 'right' },
    { label: 'MONTANT', width: 54, align: 'right' },
    { label: '%', width: 30, align: 'right' },
  ]

  // Mock rows — all at "À jour" for now
  const impayeRows = [
    ['À jour', String(nbLots), fmt(dashboard.produits), '100%'],
    ['Retard ≤ 3 mois', '0', fmt(0), '0%'],
    ['Retard 4-6 mois', '0', fmt(0), '0%'],
    ['Retard 7-12 mois', '0', fmt(0), '0%'],
    ['Retard > 1 an', '0', fmt(0), '0%'],
  ]

  // Draw header
  const impayeHeaderH = 8
  doc.setFillColor(236, 240, 241)
  doc.rect(MARGIN, y, CONTENT_W, impayeHeaderH, 'F')
  doc.setDrawColor(189, 195, 199)
  doc.setLineWidth(0.2)
  doc.rect(MARGIN, y, CONTENT_W, impayeHeaderH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)
  let hx = MARGIN
  for (const h of impayeHeaders) {
    const align = h.align ?? 'left'
    const tx = align === 'right' ? hx + h.width - 2 : hx + 2
    doc.text(h.label, tx, y + 5.5, { align })
    hx += h.width
  }
  y += impayeHeaderH

  // Dot colors per row
  const dotColors: Array<[number, number, number]> = [
    [39, 174, 96], // À jour — green
    [241, 196, 15], // ≤ 3 mois — yellow
    [230, 126, 34], // 4-6 mois — orange
    [231, 76, 60], // 7-12 mois — red
    [136, 14, 14], // > 1 an — dark red
  ]

  const rowH = 7
  for (let i = 0; i < impayeRows.length; i++) {
    const row = impayeRows[i]

    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 250)
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
    }
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.1)
    doc.rect(MARGIN, y, CONTENT_W, rowH)

    // Draw colored dot
    const dc = dotColors[i]
    doc.setFillColor(dc[0], dc[1], dc[2])
    doc.circle(MARGIN + 4, y + rowH / 2, 1.5, 'F')

    // Ancienneté text (after dot)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)
    doc.text(row[0], MARGIN + 9, y + rowH / 2 + 1.5)

    // Other columns
    let cx = MARGIN + impayeHeaders[0].width
    for (let j = 1; j < impayeHeaders.length; j++) {
      const h = impayeHeaders[j]
      const align = h.align ?? 'left'
      const tx = align === 'right' ? cx + h.width - 2 : cx + 2
      doc.text(row[j] ?? '', tx, y + rowH / 2 + 1.5, { align })
      cx += h.width
    }

    y += rowH
  }

  y =
    drawTotalRow(
      doc,
      impayeHeaders,
      ['TOTAL', String(nbLots), fmt(dashboard.produits), '100%'],
      y,
    ) + 8

  // Legal text block
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 60, 60)

  const legalLines = [
    "Conformément à l'article 37 de la Loi 18-00, tout copropriétaire est tenu de contribuer aux charges",
    'communes proportionnellement à ses quotes-parts. Le syndic est habilité à engager des procédures de',
    "recouvrement à l'encontre de tout copropriétaire défaillant, incluant les intérêts de retard au taux légal.",
    '',
    "Les impayés supérieurs à 3 mois font l'objet d'une mise en demeure formelle. Les impayés supérieurs à",
    '6 mois peuvent engager des procédures judiciaires conformément aux articles 30 à 42 de la Loi 18-00.',
  ]

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.rect(MARGIN, y - 2, CONTENT_W, legalLines.length * 5 + 4)

  for (const line of legalLines) {
    if (line !== '') {
      doc.text(line, MARGIN + 3, y + 2)
    }
    y += 5
  }

  addFooter(doc, 3, 3)

  doc.save(`RapportFinancier_${annee}.pdf`)
}

// ─── 2. Journal PDF ───────────────────────────────────────────────────────────

export type JournalPdfParams = {
  companyName: string
  residenceName: string
  city: string
  annee: number
  ecritures: EcritureComptable[]
}

export function generateJournalPdf(params: JournalPdfParams): void {
  const { companyName, residenceName, city, annee, ecritures } = params
  const title = `JOURNAL COMPTABLE — EXERCICE ${annee}`

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const headers: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }> = [
    { label: 'DATE', width: 22 },
    { label: 'N° PIÈCE', width: 20 },
    { label: 'COMPTE', width: 40 },
    { label: 'LIBELLÉ', width: 56 },
    { label: 'DÉBIT', width: 22, align: 'right' },
    { label: 'CRÉDIT', width: 22, align: 'right' },
  ]

  const rows: string[][] = ecritures.map((e) => [
    fmtDate(e.date),
    e.piece_justificative ?? '—',
    `${e.numero_compte} — ${e.libelle_compte}`,
    e.description,
    e.debit > 0 ? fmt(e.debit) : '—',
    e.credit > 0 ? fmt(e.credit) : '—',
  ])

  const totalDebit = ecritures.reduce((s, e) => s + e.debit, 0)
  const totalCredit = ecritures.reduce((s, e) => s + e.credit, 0)

  // Split into pages
  const rowsPerPage = 30
  const totalChunks = Math.max(1, Math.ceil(rows.length / rowsPerPage))

  for (let page = 0; page < totalChunks; page++) {
    if (page > 0) doc.addPage()

    addHeader(doc, companyName, title, residenceName, city)
    let y = 65
    y = addSectionHeader(doc, 'ÉCRITURES COMPTABLES', y) + 4

    const chunk = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
    const isLastPage = page === totalChunks - 1

    y = drawTable(doc, headers, chunk, y)

    if (isLastPage) {
      drawTotalRow(
        doc,
        headers,
        ['TOTAUX', '', '', '', fmt(totalDebit), fmt(totalCredit)],
        y,
      )
    }

    addFooter(doc, page + 1, totalChunks)
  }

  doc.save(`Journal_${annee}.pdf`)
}

// ─── 3. Balance PDF ───────────────────────────────────────────────────────────

export type BalancePdfParams = {
  companyName: string
  residenceName: string
  city: string
  annee: number
  balance: BalanceLigne[]
}

export function generateBalancePdf(params: BalancePdfParams): void {
  const { companyName, residenceName, city, annee, balance } = params
  const title = `BALANCE DES COMPTES — EXERCICE ${annee}`

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const CLASS_LABELS: Record<number, string> = {
    1: 'Classe 1 — Comptes de financement permanent',
    2: "Classe 2 — Comptes d'actif immobilisé",
    3: 'Classe 3 — Comptes de stocks',
    4: 'Classe 4 — Comptes de tiers',
    5: 'Classe 5 — Trésorerie',
    6: 'Classe 6 — Comptes de charges',
    7: 'Classe 7 — Comptes de produits',
  }

  const headers: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }> = [
    { label: 'N° COMPTE', width: 24 },
    { label: 'LIBELLÉ', width: 60 },
    { label: 'TOTAL DÉBIT', width: 28, align: 'right' },
    { label: 'TOTAL CRÉDIT', width: 28, align: 'right' },
    { label: 'SOLDE DÉBIT.', width: 24, align: 'right' },
    { label: 'SOLDE CRÉD.', width: 18, align: 'right' },
  ]

  addHeader(doc, companyName, title, residenceName, city)
  let y = 65

  let totalDebit = 0
  let totalCredit = 0
  let totalSoldeDeb = 0
  let totalSoldeCred = 0
  let lastClasse = -1

  // Rows per page budget
  const MAX_Y = FOOTER_Y - 20
  let pageNum = 1
  // Count total pages (approximate)
  const estimatedPages = Math.max(1, Math.ceil(balance.length / 28))

  for (const ligne of balance) {
    // Section header when class changes
    if (ligne.classe !== lastClasse) {
      const classLabel = CLASS_LABELS[ligne.classe] ?? `Classe ${ligne.classe}`

      // Need space for section header (8) + at least one row (7)
      if (y + 20 > MAX_Y) {
        addFooter(doc, pageNum, estimatedPages)
        doc.addPage()
        pageNum++
        addHeader(doc, companyName, title, residenceName, city)
        y = 65
      }

      y = addSectionHeader(doc, classLabel, y) + 2
      lastClasse = ligne.classe

      // Draw column headers after section header
      const headerH = 7
      doc.setFillColor(236, 240, 241)
      doc.rect(MARGIN, y, CONTENT_W, headerH, 'F')
      doc.setDrawColor(189, 195, 199)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN, y, CONTENT_W, headerH)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(30, 30, 30)
      let hx = MARGIN
      for (const h of headers) {
        const align = h.align ?? 'left'
        const tx = align === 'right' ? hx + h.width - 2 : hx + 2
        doc.text(h.label, tx, y + 5, { align })
        hx += h.width
      }
      y += headerH
    }

    // Page break check
    if (y + 7 > MAX_Y) {
      addFooter(doc, pageNum, estimatedPages)
      doc.addPage()
      pageNum++
      addHeader(doc, companyName, title, residenceName, city)
      y = 65
      lastClasse = -1 // Force section header reprint
    }

    // Data row
    const rowH = 6
    const rowIdx = balance.indexOf(ligne)
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 249, 250)
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
    }
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.1)
    doc.rect(MARGIN, y, CONTENT_W, rowH)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(50, 50, 50)

    const cells = [
      ligne.numero,
      ligne.libelle,
      fmt(ligne.total_debit),
      fmt(ligne.total_credit),
      ligne.solde_debiteur > 0 ? fmt(ligne.solde_debiteur) : '—',
      ligne.solde_crediteur > 0 ? fmt(ligne.solde_crediteur) : '—',
    ]

    let cx = MARGIN
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j]
      const align = h.align ?? 'left'
      const tx = align === 'right' ? cx + h.width - 2 : cx + 2
      const maxChars = Math.floor(h.width / 2)
      const cellText = cells[j] ?? ''
      const truncated =
        cellText.length > maxChars
          ? cellText.slice(0, maxChars - 1) + '…'
          : cellText
      doc.text(truncated, tx, y + rowH / 2 + 1.5, { align })
      cx += h.width
    }

    totalDebit += ligne.total_debit
    totalCredit += ligne.total_credit
    totalSoldeDeb += ligne.solde_debiteur
    totalSoldeCred += ligne.solde_crediteur

    y += rowH
  }

  // Total row
  if (y + 10 > MAX_Y) {
    addFooter(doc, pageNum, estimatedPages)
    doc.addPage()
    pageNum++
    addHeader(doc, companyName, title, residenceName, city)
    y = 65
  }

  drawTotalRow(
    doc,
    headers,
    [
      '',
      'TOTAUX GÉNÉRAUX',
      fmt(totalDebit),
      fmt(totalCredit),
      fmt(totalSoldeDeb),
      fmt(totalSoldeCred),
    ],
    y,
  )

  addFooter(doc, pageNum, pageNum)

  doc.save(`Balance_${annee}.pdf`)
}

// ─── 4. Grand Livre PDF ───────────────────────────────────────────────────────

export type GrandLivrePdfParams = {
  companyName: string
  residenceName: string
  city: string
  annee: number
  ecritures: EcritureComptable[]
}

export function generateGrandLivrePdf(params: GrandLivrePdfParams): void {
  const { companyName, residenceName, city, annee, ecritures } = params
  const title = `GRAND LIVRE — EXERCICE ${annee}`

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Group ecritures by compte
  const grouped = new Map<
    string,
    { libelle: string; lignes: EcritureComptable[] }
  >()
  for (const e of ecritures) {
    const key = e.numero_compte
    if (!grouped.has(key)) {
      grouped.set(key, { libelle: e.libelle_compte, lignes: [] })
    }
    grouped.get(key)!.lignes.push(e)
  }

  const comptes = [...grouped.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )

  const headers: Array<{
    label: string
    width: number
    align?: 'left' | 'right' | 'center'
  }> = [
    { label: 'DATE', width: 24 },
    { label: 'LIBELLÉ', width: 74 },
    { label: 'DÉBIT', width: 28, align: 'right' },
    { label: 'CRÉDIT', width: 28, align: 'right' },
    { label: 'SOLDE', width: 28, align: 'right' },
  ]

  const MAX_Y = FOOTER_Y - 20
  let pageNum = 1
  const totalPages = Math.max(1, Math.ceil(ecritures.length / 25))
  let firstPage = true

  for (const [numero, { libelle, lignes }] of comptes) {
    // Determine starting Y for this compte section.
    // On the first page, add the page header. On subsequent comptes, force a page break
    // check by treating y as beyond MAX_Y so the block below does the break.
    let y: number
    if (firstPage) {
      addHeader(doc, companyName, title, residenceName, city)
      y = 65
      firstPage = false
    } else {
      // Force page break check: set y past limit so next block opens a new page
      y = MAX_Y + 1
    }

    if (y + 25 > MAX_Y) {
      addFooter(doc, pageNum, totalPages)
      doc.addPage()
      pageNum++
      addHeader(doc, companyName, title, residenceName, city)
      y = 65
    }

    // Compte sub-header
    doc.setFillColor(232, 239, 245)
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
    doc.setDrawColor(27, 79, 114)
    doc.setLineWidth(0.3)
    doc.rect(MARGIN, y, CONTENT_W, 9)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(27, 79, 114)
    doc.text(`${numero} — ${libelle}`, MARGIN + 3, y + 6)
    y += 9

    // Column headers
    const colH = 7
    doc.setFillColor(236, 240, 241)
    doc.rect(MARGIN, y, CONTENT_W, colH, 'F')
    doc.setDrawColor(189, 195, 199)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN, y, CONTENT_W, colH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 30, 30)
    let hx = MARGIN
    for (const h of headers) {
      const align = h.align ?? 'left'
      const tx = align === 'right' ? hx + h.width - 2 : hx + 2
      doc.text(h.label, tx, y + 5, { align })
      hx += h.width
    }
    y += colH

    // Rows with running solde
    let runningBalance = 0
    for (let i = 0; i < lignes.length; i++) {
      const e = lignes[i]
      runningBalance += e.debit - e.credit

      if (y + 6 > MAX_Y) {
        addFooter(doc, pageNum, totalPages)
        doc.addPage()
        pageNum++
        addHeader(doc, companyName, title, residenceName, city)
        y = 65

        // Reprint column headers on new page
        doc.setFillColor(236, 240, 241)
        doc.rect(MARGIN, y, CONTENT_W, colH, 'F')
        doc.setDrawColor(189, 195, 199)
        doc.setLineWidth(0.2)
        doc.rect(MARGIN, y, CONTENT_W, colH)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(30, 30, 30)
        let rhx = MARGIN
        for (const h of headers) {
          const align = h.align ?? 'left'
          const tx = align === 'right' ? rhx + h.width - 2 : rhx + 2
          doc.text(h.label, tx, y + 5, { align })
          rhx += h.width
        }
        y += colH
      }

      const rowH = 6
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 250)
        doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
      }
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      doc.rect(MARGIN, y, CONTENT_W, rowH)

      const cells = [
        fmtDate(e.date),
        e.description,
        e.debit > 0 ? fmt(e.debit) : '—',
        e.credit > 0 ? fmt(e.credit) : '—',
        fmt(Math.abs(runningBalance)) + (runningBalance < 0 ? ' C' : ' D'),
      ]

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(50, 50, 50)

      let cx = MARGIN
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j]
        const align = h.align ?? 'left'
        const tx = align === 'right' ? cx + h.width - 2 : cx + 2
        const maxChars = Math.floor(h.width / 2)
        const cellText = cells[j] ?? ''
        const truncated =
          cellText.length > maxChars
            ? cellText.slice(0, maxChars - 1) + '…'
            : cellText
        doc.text(truncated, tx, y + rowH / 2 + 1.5, { align })
        cx += h.width
      }

      y += rowH
    }

    // Account total row
    const acctDebit = lignes.reduce((s, e) => s + e.debit, 0)
    const acctCredit = lignes.reduce((s, e) => s + e.credit, 0)
    drawTotalRow(
      doc,
      headers,
      [
        '',
        `Total ${numero}`,
        fmt(acctDebit),
        fmt(acctCredit),
        fmt(Math.abs(runningBalance)),
      ],
      y,
    )
  }

  addFooter(doc, pageNum, pageNum)

  doc.save(`GrandLivre_${annee}.pdf`)
}
