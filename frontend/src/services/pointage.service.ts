/**
 * Pointage bancaire — service côté frontend.
 * Parse les relevés bancaires CSV/Excel des 10 banques marocaines majeures et
 * auto-matche les lignes avec les paiements/dépenses Imaro.
 *
 * Backend (Abdellah) — futur : MAJ vers un endpoint qui :
 *   POST /api/residences/:id/pointage/import  → upload + parse + persist
 *   POST /api/residences/:id/pointage/match   → mark matches as confirmed
 *   GET  /api/residences/:id/pointage         → liste des sessions de pointage
 *
 * Pour le MVP front, on mocke un dataset réaliste et on garde l'algo de matching
 * client-side. Ça permet à l'utilisateur de tester immédiatement sans backend.
 */
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Banque =
  | 'attijariwafa' | 'bp' | 'boa' | 'cih' | 'sg' | 'bmci'
  | 'cdm' | 'ca' | 'cfg' | 'albarid' | 'autre'

export const BANQUES: { code: Banque; label: string }[] = [
  { code: 'attijariwafa', label: 'Attijariwafa Bank' },
  { code: 'bp',           label: 'Banque Populaire' },
  { code: 'boa',          label: 'Bank of Africa' },
  { code: 'cih',          label: 'CIH Bank' },
  { code: 'sg',           label: 'Société Générale' },
  { code: 'bmci',         label: 'BMCI' },
  { code: 'cdm',          label: 'Crédit du Maroc' },
  { code: 'ca',           label: 'Crédit Agricole' },
  { code: 'cfg',          label: 'CFG Bank' },
  { code: 'albarid',      label: 'Al Barid Bank' },
  { code: 'autre',        label: 'Autre (format générique)' },
]

export type BankLine = {
  id: string           // hash unique de date+libelle+montant
  date: string         // ISO YYYY-MM-DD
  libelle: string
  debit: number        // > 0 si sortie d'argent (dépense)
  credit: number       // > 0 si entrée d'argent (paiement reçu)
  balance?: number     // solde après opération (optionnel)
  banque: Banque
}

export type Match = {
  bankLineId: string
  targetType: 'paiement' | 'depense'
  targetId: number
  targetLabel: string      // ex: "Karim Benali — Lot A-01" ou "Facture nettoyage avril"
  confidence: 'auto' | 'suggested' | 'manual'
  score: number            // 0-1, plus c'est élevé plus le match est sûr
  reasons: string[]        // ex: ["Montant exact", "+/- 2j", "Nom détecté"]
  status: 'pending' | 'confirmed' | 'rejected'
}

export type ParseResult = {
  banque: Banque
  fileName: string
  totalLines: number
  totalDebit: number
  totalCredit: number
  periode: { from: string; to: string }
  lines: BankLine[]
}

export type PointageStats = {
  total_lines: number
  auto_matched: number
  suggested: number
  unmatched: number
  total_debit: number
  total_credit: number
}

// ─── Fingerprint helper (line id) ─────────────────────────────────────────────

function hashLine(date: string, libelle: string, amount: number): string {
  const str = `${date}|${libelle}|${amount}`
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

// ─── Date parsing (multiple formats) ──────────────────────────────────────────

function parseDateAny(raw: string | number | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  if (typeof raw === 'number') {
    // Excel serial date
    const ms = (raw - 25569) * 86400 * 1000
    return new Date(ms).toISOString().slice(0, 10)
  }
  const s = String(raw).trim()
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m1) {
    const [, d, mo] = m1
    let y = m1[3]
    if (y.length === 2) y = '20' + y
    return `${y.padStart(4, '20')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // YYYY-MM-DD already
  const m2 = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (m2) {
    const [, y, mo, d] = m2
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s
}

// ─── Number parsing (FR format with "," and spaces) ───────────────────────────

function parseAmount(raw: string | number | undefined): number {
  if (raw === undefined || raw === null || raw === '') return 0
  if (typeof raw === 'number') return raw
  const s = String(raw)
    .replace(/\s/g, '')          // remove spaces (FR thousand separators)
    .replace(/[^\d,.-]/g, '')    // remove currency symbols
    .replace(/\./g, '')          // remove dot thousand sep (FR uses .)
    .replace(',', '.')           // FR decimal → JS
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// ─── Generic CSV/Excel parser ─────────────────────────────────────────────────
// Le format peut varier énormément entre banques (colonnes, ordres, séparateurs).
// On utilise xlsx (qui lit CSV aussi) puis on cherche les colonnes par mots-clés.

async function readWorkbook(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

const COLUMN_ALIASES = {
  date:    ['date', 'date opération', 'date operation', 'date valeur', 'date d\'opération', 'dt op'],
  libelle: ['libellé', 'libelle', 'description', 'designation', 'opération', 'operation', 'détail', 'detail', 'motif'],
  debit:   ['débit', 'debit', 'montant débit', 'montant debit', 'sortie', 'retrait', 'dr'],
  credit:  ['crédit', 'credit', 'montant crédit', 'montant credit', 'entrée', 'entree', 'versement', 'cr'],
  amount:  ['montant', 'amount', 'mt', 'somme'],
  sens:    ['sens', 'type', 'd/c', 'nature'],
  balance: ['solde', 'balance', 'solde après opération', 'solde apres operation'],
} as const

function findColumn(headers: string[], aliases: readonly string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zéèàâêîôûç]/g, '')
  for (const alias of aliases) {
    const target = norm(alias)
    const found = headers.find((h) => norm(h).includes(target) || target.includes(norm(h)))
    if (found) return found
  }
  return null
}

export async function parseBankStatement(
  file: File,
  banque: Banque,
): Promise<ParseResult> {
  const rows = await readWorkbook(file)
  if (rows.length === 0) {
    return { banque, fileName: file.name, totalLines: 0, totalDebit: 0, totalCredit: 0,
             periode: { from: '', to: '' }, lines: [] }
  }

  const headers = Object.keys(rows[0])

  const dateCol    = findColumn(headers, COLUMN_ALIASES.date)
  const libelleCol = findColumn(headers, COLUMN_ALIASES.libelle)
  const debitCol   = findColumn(headers, COLUMN_ALIASES.debit)
  const creditCol  = findColumn(headers, COLUMN_ALIASES.credit)
  const amountCol  = findColumn(headers, COLUMN_ALIASES.amount)
  const sensCol    = findColumn(headers, COLUMN_ALIASES.sens)
  const balanceCol = findColumn(headers, COLUMN_ALIASES.balance)

  if (!dateCol || !libelleCol) {
    throw new Error(
      `Colonnes manquantes dans le relevé. Colonnes détectées : ${headers.join(', ')}\n` +
      'Imaro a besoin au minimum d\'une colonne "Date" et "Libellé".',
    )
  }

  const lines: BankLine[] = rows
    .map((r): BankLine | null => {
      const date = parseDateAny(r[dateCol] as string)
      const libelle = String(r[libelleCol] ?? '').trim()
      if (!libelle) return null

      let debit  = 0
      let credit = 0

      if (debitCol && creditCol) {
        debit  = parseAmount(r[debitCol] as string)
        credit = parseAmount(r[creditCol] as string)
      } else if (amountCol) {
        const amt = parseAmount(r[amountCol] as string)
        if (sensCol) {
          const s = String(r[sensCol] ?? '').toUpperCase()
          if (s.startsWith('D')) debit = Math.abs(amt)
          else credit = Math.abs(amt)
        } else {
          // Convention: négatif = débit, positif = crédit
          if (amt < 0) debit = Math.abs(amt)
          else credit = amt
        }
      }

      if (debit === 0 && credit === 0) return null

      const balance = balanceCol ? parseAmount(r[balanceCol] as string) : undefined
      const total = debit > 0 ? -debit : credit
      return {
        id: hashLine(date, libelle, total),
        date, libelle, debit, credit, balance, banque,
      }
    })
    .filter((l): l is BankLine => l !== null)

  const totalDebit  = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  const dates = lines.map((l) => l.date).sort()
  return {
    banque,
    fileName: file.name,
    totalLines: lines.length,
    totalDebit,
    totalCredit,
    periode: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
    lines,
  }
}

// ─── Auto-matching algorithm ──────────────────────────────────────────────────

export type MatchableTarget =
  | { type: 'paiement'; id: number; montant: number; date: string; label: string; tags: string[] }
  | { type: 'depense';  id: number; montant: number; date: string; label: string; tags: string[] }

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.abs(da - db) / (86400 * 1000)
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fuzzyContains(haystack: string, needle: string): boolean {
  if (needle.length < 3) return false
  return normalize(haystack).includes(normalize(needle))
}

/** Match a single bank line against all candidate targets and return best match. */
export function findBestMatch(
  line: BankLine,
  candidates: MatchableTarget[],
): Match | null {
  const isCredit = line.credit > 0
  const isDebit = line.debit > 0
  if (!isCredit && !isDebit) return null

  const want = isCredit ? 'paiement' : 'depense'
  const amount = isCredit ? line.credit : line.debit

  let bestScore = 0
  let bestTarget: MatchableTarget | null = null
  let bestReasons: string[] = []

  candidates.filter((c) => c.type === want).forEach((c) => {
    let score = 0
    const reasons: string[] = []

    // Amount: required match within 0.01
    const amountDiff = Math.abs(c.montant - amount)
    if (amountDiff < 0.01) {
      score += 0.55
      reasons.push('Montant exact')
    } else if (amountDiff / amount < 0.02) {
      score += 0.4
      reasons.push('Montant proche')
    } else {
      return // amount mismatch → no point continuing
    }

    // Date proximity (within 14 days)
    const dayDiff = daysBetween(c.date, line.date)
    if (dayDiff <= 1) {
      score += 0.25
      reasons.push('Même jour')
    } else if (dayDiff <= 7) {
      score += 0.2 - (dayDiff / 7) * 0.05
      reasons.push(`+/- ${Math.round(dayDiff)} j`)
    } else if (dayDiff <= 14) {
      score += 0.05
      reasons.push(`+/- ${Math.round(dayDiff)} j`)
    }

    // Tag fuzzy match (libelle ou nom dans la ligne bancaire)
    let nameMatch = false
    for (const tag of c.tags) {
      if (fuzzyContains(line.libelle, tag)) {
        nameMatch = true
        reasons.push(`«${tag}» détecté`)
        break
      }
    }
    if (nameMatch) score += 0.2

    if (score > bestScore) {
      bestScore = score
      bestTarget = c
      bestReasons = reasons
    }
  })

  if (!bestTarget || bestScore < 0.4) return null

  const matchedTarget = bestTarget as MatchableTarget
  return {
    bankLineId: line.id,
    targetType: matchedTarget.type,
    targetId: matchedTarget.id,
    targetLabel: matchedTarget.label,
    confidence: bestScore >= 0.8 ? 'auto' : 'suggested',
    score: bestScore,
    reasons: bestReasons,
    status: 'pending',
  }
}

/** Match all bank lines against all candidates. */
export function autoMatchAll(
  lines: BankLine[],
  candidates: MatchableTarget[],
): Record<string, Match | null> {
  const result: Record<string, Match | null> = {}
  const usedTargetIds = new Set<string>()
  // Sort candidates by recency (newer first) for deterministic preference
  const sortedLines = [...lines].sort((a, b) => b.date.localeCompare(a.date))
  for (const line of sortedLines) {
    const available = candidates.filter((c) => !usedTargetIds.has(`${c.type}:${c.id}`))
    const m = findBestMatch(line, available)
    result[line.id] = m
    if (m && m.confidence === 'auto') {
      usedTargetIds.add(`${m.targetType}:${m.targetId}`)
    }
  }
  return result
}

// ─── Mock data for the page (until backend ready) ─────────────────────────────

const MOCK_BANK_LINES: BankLine[] = [
  { id: 'a1', date: '2026-04-22', libelle: 'VIRT KARIM BENALI RESIDENCE ATLAS',  debit:    0, credit: 850.00, banque: 'attijariwafa', balance: 25850 },
  { id: 'a2', date: '2026-04-22', libelle: 'VIRT FATIMA Z IDRISSI',              debit:    0, credit:1700.00, banque: 'attijariwafa', balance: 27550 },
  { id: 'a3', date: '2026-04-23', libelle: 'CHEQUE 0042 HASSAN BENALI',          debit:    0, credit: 850.00, banque: 'attijariwafa', balance: 28400 },
  { id: 'a4', date: '2026-04-25', libelle: 'PRLV ATTIJARIWAFA FRAIS BANQUE',     debit:   25, credit:    0,    banque: 'attijariwafa', balance: 28375 },
  { id: 'a5', date: '2026-04-28', libelle: 'VIRT NETTOYAGE COMMUNS AVRIL CLEAN PRO MAROC', debit: 1200, credit: 0, banque: 'attijariwafa', balance: 27175 },
  { id: 'a6', date: '2026-04-30', libelle: 'PRLV TECHELEV MAINTENANCE ASCENSEUR', debit:  800, credit:    0,    banque: 'attijariwafa', balance: 26375 },
  { id: 'a7', date: '2026-05-02', libelle: 'VIRT INCONNU REF XK-292',            debit:    0, credit:1200.00, banque: 'attijariwafa', balance: 27575 },
  { id: 'a8', date: '2026-05-03', libelle: 'VIRT YASSINE TAZI',                  debit:    0, credit: 850.00, banque: 'attijariwafa', balance: 28425 },
  { id: 'a9', date: '2026-05-05', libelle: 'CHEQUE 0091 LEILA CHERKAOUI',        debit:    0, credit: 950.00, banque: 'attijariwafa', balance: 29375 },
  { id: 'aA', date: '2026-05-08', libelle: 'PRLV LYDEC EAU AVRIL',                debit:  340, credit:    0,    banque: 'attijariwafa', balance: 29035 },
]

const MOCK_TARGETS: MatchableTarget[] = [
  { type: 'paiement', id: 101, montant:  850, date: '2026-04-22', label: 'Karim Benali — Lot A-01',     tags: ['Karim Benali', 'Karim', 'Benali'] },
  { type: 'paiement', id: 102, montant: 1700, date: '2026-04-21', label: 'Fatima Idrissi — Lot A-02',   tags: ['Fatima Idrissi', 'Fatima', 'Idrissi'] },
  { type: 'paiement', id: 103, montant:  850, date: '2026-04-24', label: 'Hassan Benali — Lot A-03',    tags: ['Hassan Benali', 'Hassan'] },
  { type: 'paiement', id: 104, montant:  850, date: '2026-05-03', label: 'Yassine Tazi — Lot B-01',     tags: ['Yassine Tazi', 'Yassine', 'Tazi'] },
  { type: 'paiement', id: 105, montant:  950, date: '2026-05-05', label: 'Leila Cherkaoui — Lot C-01',  tags: ['Leila Cherkaoui', 'Leila', 'Cherkaoui'] },
  { type: 'depense',  id: 201, montant: 1200, date: '2026-04-28', label: 'Nettoyage parties communes — avril', tags: ['Clean Pro Maroc', 'nettoyage', 'CleanPro'] },
  { type: 'depense',  id: 202, montant:  800, date: '2026-04-30', label: 'Maintenance ascenseur',       tags: ['TechElev', 'ascenseur', 'maintenance'] },
  { type: 'depense',  id: 203, montant:  340, date: '2026-05-08', label: 'Eau Lydec — avril',           tags: ['Lydec', 'eau'] },
  // Note: pas de match pour ligne a4 (frais bancaires 25 DH) ni a7 (virt inconnu 1200)
]

const MOCK_PARSE_RESULT: ParseResult = {
  banque: 'attijariwafa',
  fileName: 'releve-atlas-avril-2026.csv',
  totalLines: MOCK_BANK_LINES.length,
  totalDebit: MOCK_BANK_LINES.reduce((s, l) => s + l.debit, 0),
  totalCredit: MOCK_BANK_LINES.reduce((s, l) => s + l.credit, 0),
  periode: { from: '2026-04-22', to: '2026-05-08' },
  lines: MOCK_BANK_LINES,
}

export function getMockParseResult(): ParseResult { return MOCK_PARSE_RESULT }
export function getMockTargets(): MatchableTarget[] { return MOCK_TARGETS }

/** Compute aggregate stats from matches for the KPI row. */
export function computeStats(
  parsed: ParseResult,
  matches: Record<string, Match | null>,
): PointageStats {
  const totalLines = parsed.totalLines
  let auto = 0, suggested = 0, unmatched = 0
  parsed.lines.forEach((l) => {
    const m = matches[l.id]
    if (!m) unmatched++
    else if (m.confidence === 'auto') auto++
    else suggested++
  })
  return {
    total_lines: totalLines,
    auto_matched: auto,
    suggested,
    unmatched,
    total_debit:  parsed.totalDebit,
    total_credit: parsed.totalCredit,
  }
}
