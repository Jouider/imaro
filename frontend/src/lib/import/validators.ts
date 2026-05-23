// ─── Import Module — Validation & Parsing Utilities ─────────────────────────

/** Remove accents: é→e, è→e, ê→e, à→a, etc. */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Normalize a header string for comparison: lowercase, no accents, trimmed, collapsed whitespace */
export function normalizeHeader(header: string): string {
  return removeAccents(header.toLowerCase().trim()).replace(/\s+/g, ' ')
}

// ─── Phone ──────────────────────────────────────────────────────────────────

const MA_PHONE_RE = /^(?:\+?212|0)[5-7]\d{8}$/

export function validatePhone(v: string): boolean {
  const cleaned = v.replace(/[\s\-().]/g, '')
  return MA_PHONE_RE.test(cleaned)
}

export function normalizePhone(v: string): string {
  const cleaned = v.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('0')) return '+212' + cleaned.slice(1)
  if (cleaned.startsWith('212')) return '+' + cleaned
  return cleaned
}

// ─── Email ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}

// ─── Date ───────────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const FR_DATE_RE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/

export function validateDate(v: string): boolean {
  const trimmed = v.trim()
  if (ISO_DATE_RE.test(trimmed)) return !isNaN(Date.parse(trimmed))
  const m = FR_DATE_RE.exec(trimmed)
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return !isNaN(Date.parse(iso))
  }
  return false
}

/** Normalize any accepted date format to YYYY-MM-DD */
export function parseFlexDate(v: string): string {
  const trimmed = v.trim()
  if (ISO_DATE_RE.test(trimmed)) return trimmed
  const m = FR_DATE_RE.exec(trimmed)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return trimmed
}

// ─── Number ─────────────────────────────────────────────────────────────────

/**
 * Validate a numeric string. Accepts:
 * - Standard: "1234.56"
 * - French: "1 234,56" or "1234,56"
 * - Negative: "-500"
 */
export function validateNumber(v: string): boolean {
  const cleaned = v.replace(/\s/g, '').replace(',', '.')
  return !isNaN(Number(cleaned)) && cleaned.length > 0
}

/** Parse a flexible number string to a JS number */
export function parseNumber(v: string): number {
  const cleaned = v.replace(/\s/g, '').replace(',', '.')
  return Number(cleaned)
}
