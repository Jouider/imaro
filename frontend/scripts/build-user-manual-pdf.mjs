/**
 * Imaro — Manuel utilisateur (PDF builder)
 *
 * Generates a ~70 page branded French user manual covering every page, every
 * concept, and every workflow of the Imaro gestionnaire app. Uses jsPDF
 * (already in dependencies) and the official Imaro logo from public/.
 *
 *   Run: cd frontend && node scripts/build-user-manual-pdf.mjs
 *   Output: docs/Imaro-Manuel-Utilisateur.pdf
 */
import { jsPDF } from 'jspdf'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const PUBLIC = join(ROOT, 'frontend', 'public')
const OUT = join(ROOT, 'docs', 'Imaro-Manuel-Utilisateur.pdf')

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY = [27, 79, 114]
const NAVY_DEEP = [18, 56, 84]
const NAVY_TINT = [232, 240, 247]
const ORANGE = [230, 126, 34]
const ORANGE_SOFT = [253, 240, 226]
const GREEN = [39, 174, 96]
const GREEN_SOFT = [220, 240, 230]
const RED = [231, 76, 60]
const RED_SOFT = [254, 226, 226]
const PURPLE = [142, 68, 173]
const PURPLE_SOFT = [240, 230, 250]
const TEXT = [44, 62, 80]
const MUTED = [127, 140, 141]
const BORDER = [228, 232, 237]
const ROW_ALT = [249, 250, 251]

// ─── Page geometry ────────────────────────────────────────────────────────────
const PAGE_W = 210
const PAGE_H = 297
const M_L = 20
const M_R = 20
const M_TOP = 25
const M_BOTTOM = 22
const CONTENT_W = PAGE_W - M_L - M_R
const BODY_TOP = M_TOP
const BODY_BOTTOM = PAGE_H - M_BOTTOM

// ─── Logo ─────────────────────────────────────────────────────────────────────
function loadLogo(invertedPdf = true) {
  const file = invertedPdf
    ? 'logo-horizontal-inverted-pdf.png'
    : 'logo-horizontal.png'
  const buf = readFileSync(join(PUBLIC, file))
  return 'data:image/png;base64,' + buf.toString('base64')
}

// ─── Renderer state ───────────────────────────────────────────────────────────
const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
let cursorY = BODY_TOP
let currentChapter = ''
let currentPart = ''
let chapterStarts = [] // {title, partTitle, page}
let inTOC = false

// ─── Utilities ────────────────────────────────────────────────────────────────
function rgb(c) {
  return c
}
function setFill(c) {
  doc.setFillColor(c[0], c[1], c[2])
}
function setStroke(c) {
  doc.setDrawColor(c[0], c[1], c[2])
}
function setText(c) {
  doc.setTextColor(c[0], c[1], c[2])
}
function font(weight = 'normal') {
  doc.setFont('helvetica', weight)
}

function newPage() {
  doc.addPage()
  cursorY = BODY_TOP
  drawRunningHeader()
  drawRunningFooter()
}

function ensureSpace(needed) {
  if (cursorY + needed > BODY_BOTTOM) newPage()
}

// ─── Running header / footer ──────────────────────────────────────────────────
function drawRunningHeader() {
  if (doc.getCurrentPageInfo().pageNumber === 1) return
  // Thin orange accent strip on top
  setFill(ORANGE)
  doc.rect(0, 0, PAGE_W, 1.5, 'F')
  // Header bar
  font('normal')
  doc.setFontSize(8)
  setText(MUTED)
  doc.text('IMARO', M_L, 12)
  if (currentChapter) {
    doc.text(currentChapter, PAGE_W - M_R, 12, { align: 'right' })
  } else if (currentPart) {
    doc.text(currentPart, PAGE_W - M_R, 12, { align: 'right' })
  }
  setStroke(BORDER)
  doc.setLineWidth(0.2)
  doc.line(M_L, 15, PAGE_W - M_R, 15)
}

function drawRunningFooter() {
  if (doc.getCurrentPageInfo().pageNumber === 1) return
  setStroke(BORDER)
  doc.setLineWidth(0.2)
  doc.line(M_L, PAGE_H - 16, PAGE_W - M_R, PAGE_H - 16)
  font('normal')
  doc.setFontSize(8)
  setText(MUTED)
  doc.text('Manuel utilisateur · v1.0', M_L, PAGE_H - 11)
  doc.text(
    String(doc.getCurrentPageInfo().pageNumber),
    PAGE_W - M_R,
    PAGE_H - 11,
    { align: 'right' },
  )
  doc.text('imaro.ma', PAGE_W / 2, PAGE_H - 11, { align: 'center' })
}

// ─── Cover page ───────────────────────────────────────────────────────────────
function drawCover(logoInverted) {
  // Navy gradient bleed
  const steps = 80
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const r = NAVY_DEEP[0] + (NAVY[0] - NAVY_DEEP[0]) * (1 - t)
    const g = NAVY_DEEP[1] + (NAVY[1] - NAVY_DEEP[1]) * (1 - t)
    const b = NAVY_DEEP[2] + (NAVY[2] - NAVY_DEEP[2]) * (1 - t)
    doc.setFillColor(r, g, b)
    doc.rect(0, (i * PAGE_H) / steps, PAGE_W, PAGE_H / steps + 0.3, 'F')
  }
  // Orange accent diagonal
  setFill(ORANGE)
  doc.rect(0, 0, PAGE_W, 4, 'F')
  doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F')

  // Logo top-center
  try {
    doc.addImage(logoInverted, 'PNG', PAGE_W / 2 - 32, 35, 64, 22)
  } catch {}

  // Decorative orange dot pattern
  setFill(ORANGE)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 16; c++) {
      doc.circle(15 + c * 12, 95 + r * 6, 0.6, 'F')
    }
  }

  // Big title
  font('bold')
  doc.setFontSize(40)
  setText([255, 255, 255])
  doc.text('Manuel', PAGE_W / 2, 145, { align: 'center' })
  doc.text('Utilisateur', PAGE_W / 2, 162, { align: 'center' })

  // Subtitle
  font('normal')
  doc.setFontSize(14)
  setText([200, 220, 240])
  doc.text('Le guide complet du gestionnaire de copropriété', PAGE_W / 2, 178, {
    align: 'center',
  })

  // Orange CTA block
  setFill(ORANGE)
  doc.roundedRect(PAGE_W / 2 - 45, 195, 90, 14, 2, 2, 'F')
  font('bold')
  doc.setFontSize(11)
  setText([255, 255, 255])
  doc.text('Conforme Décret 2.23.700', PAGE_W / 2, 204, { align: 'center' })

  // Bottom info
  font('normal')
  doc.setFontSize(9)
  setText([200, 220, 240])
  doc.text('Édition 2026 · Sprint 1 à 8 · Tous modules', PAGE_W / 2, 260, {
    align: 'center',
  })
  font('bold')
  doc.setFontSize(11)
  setText([255, 255, 255])
  doc.text('imaro.ma', PAGE_W / 2, 273, { align: 'center' })
}

// ─── Inline text blocks ───────────────────────────────────────────────────────
function paragraph(text, opts = {}) {
  const size = opts.size ?? 10.5
  const lh = opts.lh ?? 5.4
  const color = opts.color ?? TEXT
  font(opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal')
  doc.setFontSize(size)
  setText(color)
  const lines = doc.splitTextToSize(text, CONTENT_W)
  for (const line of lines) {
    ensureSpace(lh)
    doc.text(line, M_L, cursorY)
    cursorY += lh
  }
  cursorY += 1.6
}

function lead(text) {
  paragraph(text, { size: 11.5, lh: 6, color: NAVY })
  cursorY += 1
}

function h1(text) {
  ensureSpace(20)
  font('bold')
  doc.setFontSize(22)
  setText(NAVY)
  doc.text(text, M_L, cursorY + 8)
  cursorY += 13
  setFill(ORANGE)
  doc.rect(M_L, cursorY, 26, 1.2, 'F')
  cursorY += 7
}

function h2(text) {
  ensureSpace(14)
  cursorY += 3
  font('bold')
  doc.setFontSize(14)
  setText(NAVY)
  doc.text(text, M_L, cursorY + 5)
  cursorY += 9
  setFill(NAVY_TINT)
  doc.rect(M_L, cursorY - 2, CONTENT_W, 0.4, 'F')
  cursorY += 3
}

function h3(text) {
  ensureSpace(10)
  cursorY += 1.5
  font('bold')
  doc.setFontSize(11.5)
  setText(NAVY)
  doc.text(text, M_L, cursorY + 4)
  cursorY += 8
}

function list(items, opts = {}) {
  font('normal')
  doc.setFontSize(10.5)
  setText(TEXT)
  for (const item of items) {
    const bullet = opts.numbered
      ? `${items.indexOf(item) + 1}.`
      : opts.checklist
        ? '☐'
        : '•'
    const lines = doc.splitTextToSize(item, CONTENT_W - 7)
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(5.4)
      if (i === 0) {
        font('bold')
        setText(ORANGE)
        doc.text(bullet, M_L + 1, cursorY)
        font('normal')
        setText(TEXT)
      }
      doc.text(lines[i], M_L + 7, cursorY)
      cursorY += 5.2
    }
    cursorY += 0.5
  }
  cursorY += 1.2
}

function definition(term, def) {
  ensureSpace(7)
  font('bold')
  doc.setFontSize(10.5)
  setText(NAVY)
  doc.text(term + ' — ', M_L, cursorY)
  const tw = doc.getTextWidth(term + ' — ')
  font('normal')
  setText(TEXT)
  const lines = doc.splitTextToSize(def, CONTENT_W - tw)
  doc.text(lines[0], M_L + tw, cursorY)
  cursorY += 5.2
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(5.2)
    doc.text(lines[i], M_L, cursorY)
    cursorY += 5.2
  }
  cursorY += 1.2
}

// ─── Callouts ────────────────────────────────────────────────────────────────
function callout({ kind = 'tip', title, text }) {
  const colors = {
    tip: { bg: ORANGE_SOFT, accent: ORANGE, icon: '◆' },
    warning: { bg: RED_SOFT, accent: RED, icon: '!' },
    legal: { bg: NAVY_TINT, accent: NAVY, icon: '§' },
    ai: { bg: PURPLE_SOFT, accent: PURPLE, icon: '✦' },
    success: { bg: GREEN_SOFT, accent: GREEN, icon: '✓' },
  }
  const c = colors[kind]
  font('normal')
  doc.setFontSize(10)
  const lines = doc.splitTextToSize(text, CONTENT_W - 12)
  const boxH = Math.max(14, 7 + lines.length * 4.8 + 2)
  ensureSpace(boxH + 2)
  setFill(c.bg)
  doc.roundedRect(M_L, cursorY, CONTENT_W, boxH, 1.5, 1.5, 'F')
  setFill(c.accent)
  doc.rect(M_L, cursorY, 1.5, boxH, 'F')
  // Icon badge
  setFill(c.accent)
  doc.circle(M_L + 7, cursorY + 6, 2.7, 'F')
  font('bold')
  setText([255, 255, 255])
  doc.setFontSize(9)
  doc.text(c.icon, M_L + 7, cursorY + 7.3, { align: 'center' })
  // Title
  font('bold')
  doc.setFontSize(10)
  setText(c.accent)
  doc.text(title, M_L + 13, cursorY + 6.5)
  // Text
  font('normal')
  doc.setFontSize(9.5)
  setText(TEXT)
  let y = cursorY + 11.5
  for (const ln of lines) {
    doc.text(ln, M_L + 13, y)
    y += 4.6
  }
  cursorY += boxH + 3
}

// ─── Table ───────────────────────────────────────────────────────────────────
function table({ headers, rows, widths }) {
  const total = widths.reduce((a, b) => a + b, 0)
  const factor = CONTENT_W / total
  const W = widths.map((w) => w * factor)
  const rowH = 7.5

  ensureSpace(rowH + 4)
  // Header row
  setFill(NAVY)
  doc.rect(M_L, cursorY, CONTENT_W, rowH, 'F')
  font('bold')
  doc.setFontSize(9.5)
  setText([255, 255, 255])
  let x = M_L
  headers.forEach((h, i) => {
    doc.text(h, x + 2, cursorY + 5)
    x += W[i]
  })
  cursorY += rowH

  font('normal')
  doc.setFontSize(9.5)
  setText(TEXT)
  rows.forEach((row, ri) => {
    // Compute wrap heights
    const lines = row.map((cell, i) =>
      doc.splitTextToSize(String(cell ?? ''), W[i] - 4),
    )
    const h = Math.max(
      rowH,
      Math.max(...lines.map((l) => l.length)) * 4.8 + 2.5,
    )
    ensureSpace(h)
    if (ri % 2 === 0) {
      setFill(ROW_ALT)
      doc.rect(M_L, cursorY, CONTENT_W, h, 'F')
    }
    setStroke(BORDER)
    doc.setLineWidth(0.15)
    doc.line(M_L, cursorY + h, PAGE_W - M_R, cursorY + h)
    let xx = M_L
    lines.forEach((cellLines, i) => {
      cellLines.forEach((ln, li) => {
        doc.text(ln, xx + 2, cursorY + 5 + li * 4.5)
      })
      xx += W[i]
    })
    cursorY += h
  })
  cursorY += 2
}

// ─── Chapter opener ──────────────────────────────────────────────────────────
function partOpener(num, title, blurb) {
  currentChapter = ''
  currentPart = title
  newPage()
  // Navy band full bleed top half
  setFill(NAVY)
  doc.rect(0, 0, PAGE_W, 130, 'F')
  setFill(ORANGE)
  doc.rect(0, 130, PAGE_W, 4, 'F')
  font('normal')
  doc.setFontSize(11)
  setText(ORANGE)
  doc.text(`PARTIE ${num}`, M_L, 55)
  font('bold')
  doc.setFontSize(28)
  setText([255, 255, 255])
  const titleLines = doc.splitTextToSize(title, CONTENT_W)
  let y = 75
  for (const t of titleLines) {
    doc.text(t, M_L, y)
    y += 13
  }
  font('normal')
  doc.setFontSize(11.5)
  setText([200, 220, 240])
  const lines = doc.splitTextToSize(blurb, CONTENT_W)
  let yy = y + 8
  for (const ln of lines) {
    doc.text(ln, M_L, yy)
    yy += 6
  }
  cursorY = BODY_BOTTOM // jump to bottom so next chapter starts fresh page
}

function chapterOpener(num, title, intro) {
  currentChapter = `Chapitre ${num} · ${title}`
  newPage()
  // Big chapter number watermark
  font('bold')
  doc.setFontSize(64)
  setText(NAVY_TINT)
  doc.text(String(num).padStart(2, '0'), PAGE_W - M_R, 50, { align: 'right' })
  // Chapter label
  font('normal')
  doc.setFontSize(11)
  setText(ORANGE)
  doc.text(`CHAPITRE ${num}`, M_L, 35)
  // Title
  font('bold')
  doc.setFontSize(22)
  setText(NAVY)
  const titleLines = doc.splitTextToSize(title, CONTENT_W - 30)
  let y = 47
  for (const t of titleLines) {
    doc.text(t, M_L, y)
    y += 9
  }
  // Orange tab under title
  setFill(ORANGE)
  doc.rect(M_L, y + 1, 24, 1.5, 'F')
  cursorY = y + 10
  chapterStarts.push({
    title,
    partTitle: currentPart,
    page: doc.getCurrentPageInfo().pageNumber,
    num,
  })
  if (intro) {
    paragraph(intro, { size: 11, color: MUTED })
    cursorY += 2
  }
}

// ─── TOC (rendered in a second pass) ─────────────────────────────────────────
function reserveTOCPages(count) {
  for (let i = 0; i < count; i++) doc.addPage()
}

function renderTOCInto(startPage, count, parts) {
  // Build flat list of entries
  const entries = []
  let partIdx = 0
  for (const p of parts) {
    entries.push({ type: 'part', title: p.title, num: ++partIdx })
    for (const c of p.chapters) {
      const found = chapterStarts.find((cs) => cs.title === c.title)
      entries.push({
        type: 'chapter',
        num: found ? found.num : 0,
        title: c.title,
        page: found ? found.page : '-',
      })
    }
  }

  // Clear running-header state so TOC pages don't inherit last chapter
  currentChapter = ''
  currentPart = 'Table des matières'
  // Compute pagination
  const perPage = 36 // approx
  let i = 0
  for (let pg = 0; pg < count; pg++) {
    doc.setPage(startPage + pg)
    cursorY = BODY_TOP
    drawRunningHeader()
    drawRunningFooter()
    if (pg === 0) {
      font('bold')
      doc.setFontSize(26)
      setText(NAVY)
      doc.text('Table des matières', M_L, cursorY + 8)
      cursorY += 13
      setFill(ORANGE)
      doc.rect(M_L, cursorY, 26, 1.2, 'F')
      cursorY += 7
      font('normal')
      doc.setFontSize(10.5)
      setText(MUTED)
      doc.text(
        'Suivez les numéros de page pour naviguer dans le manuel.',
        M_L,
        cursorY,
      )
      cursorY += 8
    }
    while (i < entries.length && cursorY < BODY_BOTTOM - 8) {
      const e = entries[i]
      if (e.type === 'part') {
        ensureSpace(12)
        cursorY += 3
        font('bold')
        doc.setFontSize(12)
        setText(ORANGE)
        doc.text(e.title, M_L, cursorY)
        cursorY += 6.5
        setStroke(ORANGE)
        doc.setLineWidth(0.3)
        doc.line(M_L, cursorY - 1, PAGE_W - M_R, cursorY - 1)
        cursorY += 2
      } else {
        ensureSpace(6)
        font('normal')
        doc.setFontSize(10)
        setText(TEXT)
        const numStr = String(e.num).padStart(2, '0')
        doc.text(`${numStr}.`, M_L + 4, cursorY)
        doc.text(e.title, M_L + 13, cursorY)
        font('bold')
        setText(NAVY)
        doc.text(String(e.page), PAGE_W - M_R - 2, cursorY, { align: 'right' })
        // Dotted leader
        font('normal')
        setText(BORDER)
        const titleW = doc.getTextWidth(e.title)
        const pageW = doc.getTextWidth(String(e.page))
        const x1 = M_L + 13 + titleW + 2
        const x2 = PAGE_W - M_R - pageW - 4
        let xd = x1
        while (xd < x2) {
          doc.text('.', xd, cursorY)
          xd += 1.6
        }
        cursorY += 5.6
      }
      i++
    }
  }
}

// ─── Inner page de garde ─────────────────────────────────────────────────────
function pageDeGarde() {
  currentChapter = ''
  currentPart = 'Avant-propos'
  newPage()
  // Logo small top-left
  // Drop the inverted logo on a small navy badge
  setFill(NAVY)
  doc.roundedRect(M_L, 25, 60, 18, 2, 2, 'F')
  try {
    const logo = loadLogo(true)
    doc.addImage(logo, 'PNG', M_L + 4, 28, 52, 13)
  } catch {}

  cursorY = 60
  font('bold')
  doc.setFontSize(20)
  setText(NAVY)
  doc.text('À propos de ce manuel', M_L, cursorY)
  cursorY += 12
  setFill(ORANGE)
  doc.rect(M_L, cursorY - 8, 18, 1, 'F')

  paragraph(
    "Ce manuel est le guide officiel d'Imaro pour les gestionnaires de copropriété (syndics). Il couvre chaque module, chaque page et chaque concept clé de la plateforme — de la première connexion jusqu'à la clôture de l'exercice et la génération des annexes réglementaires.",
  )
  paragraph(
    "Il a été conçu pour deux usages : (1) la formation rapide d'un nouveau gestionnaire qui découvre l'outil, et (2) la consultation ponctuelle pendant le travail quotidien — chaque chapitre est lisible indépendamment.",
  )

  h2("À qui s'adresse ce manuel ?")
  list([
    'Syndic Owner — le dirigeant du cabinet syndic, responsable du tenant et de la facturation.',
    'Gestionnaire (Manager) — le collaborateur au quotidien, qui pilote les copropriétés.',
    'Agent de recouvrement — focalisé sur les impayés et les mises en demeure.',
    'Conseil syndical — accès consultatif aux états et documents.',
  ])

  h2('Comment lire ce manuel ?')
  callout({
    kind: 'tip',
    title: 'Astuce de lecture',
    text: "Les chapitres sont organisés en 8 parties thématiques. La Partie I est essentielle pour les nouveaux utilisateurs. Les parties suivantes peuvent être consultées dans l'ordre qui correspond à votre cycle annuel.",
  })

  list([
    'Les pavés orange (◆ Astuce) signalent un gain de temps ou une bonne pratique.',
    'Les pavés navy (§ Légal) renvoient à un texte réglementaire (Décret 2.23.700, Loi 18-00, Plan Comptable Marocain).',
    'Les pavés rouges (! Attention) signalent un risque ou une action irréversible.',
    "Les pavés violets (✦ IA) décrivent ce que vous pouvez accélérer avec l'Assistant IA.",
    'Les pavés verts (✓ Bonne pratique) confirment une démarche conforme.',
  ])

  h2('Versions et mises à jour')
  paragraph(
    "Ce manuel correspond à la version 1.0 d'Imaro (Sprints 1 à 8). Les futures évolutions seront documentées dans des suppléments téléchargeables depuis le centre d'aide.",
  )
  callout({
    kind: 'legal',
    title: 'Cadre légal',
    text: 'Imaro applique le Décret 2.23.700 du 24 mai 2023, la Loi 18-00 sur la copropriété, et le Plan Comptable Marocain (CGNC). Toute référence légale dans ce manuel pointe vers le texte officiel.',
  })
}

// ─── Block renderer ──────────────────────────────────────────────────────────
function renderBlocks(blocks) {
  for (const b of blocks) {
    if (typeof b === 'string') {
      paragraph(b)
      continue
    }
    switch (b.type) {
      case 'p':
        paragraph(b.text, b.opts || {})
        break
      case 'lead':
        lead(b.text)
        break
      case 'h2':
        h2(b.text)
        break
      case 'h3':
        h3(b.text)
        break
      case 'list':
        list(b.items, b.opts || {})
        break
      case 'check':
        list(b.items, { checklist: true })
        break
      case 'num':
        list(b.items, { numbered: true })
        break
      case 'tip':
        callout({ kind: 'tip', title: b.title || 'Astuce', text: b.text })
        break
      case 'warn':
        callout({
          kind: 'warning',
          title: b.title || 'Attention',
          text: b.text,
        })
        break
      case 'legal':
        callout({
          kind: 'legal',
          title: b.title || 'Référence légale',
          text: b.text,
        })
        break
      case 'ai':
        callout({ kind: 'ai', title: b.title || "Avec l'IA", text: b.text })
        break
      case 'ok':
        callout({
          kind: 'success',
          title: b.title || 'Bonne pratique',
          text: b.text,
        })
        break
      case 'def':
        for (const [term, def] of b.items) definition(term, def)
        break
      case 'table':
        table({ headers: b.headers, rows: b.rows, widths: b.widths })
        break
      case 'space':
        cursorY += b.h ?? 4
        break
    }
  }
}

// ─── Main driver ─────────────────────────────────────────────────────────────
async function main() {
  console.log('▶  Building Imaro user manual…')
  const logo = loadLogo(true)

  // Page 1 — Cover (full bleed)
  drawCover(logo)

  // Page 2 — Page de garde
  pageDeGarde()

  // Pages 3..N — TOC (placeholder, filled at the end)
  const TOC_PAGES = 4
  const TOC_START_PAGE = doc.getCurrentPageInfo().pageNumber + 1
  reserveTOCPages(TOC_PAGES)

  // Content
  const { PARTS } = await import('./manual-content.mjs')

  let partNum = 0
  let chapterNum = 0
  for (const part of PARTS) {
    partNum++
    partOpener(partNum, part.title, part.blurb)
    for (const chapter of part.chapters) {
      chapterNum++
      chapterOpener(chapterNum, chapter.title, chapter.intro)
      renderBlocks(chapter.blocks)
    }
  }

  // Back-fill TOC
  renderTOCInto(TOC_START_PAGE, TOC_PAGES, PARTS)

  // Save
  try {
    mkdirSync(dirname(OUT), { recursive: true })
  } catch {}
  const buf = doc.output('arraybuffer')
  writeFileSync(OUT, Buffer.from(buf))
  const pages = doc.getNumberOfPages()
  console.log(
    `✅  Wrote ${OUT} — ${pages} pages, ${(buf.byteLength / 1024).toFixed(0)} KB`,
  )
}

main().catch((err) => {
  console.error('❌  Build failed:', err)
  process.exit(1)
})
