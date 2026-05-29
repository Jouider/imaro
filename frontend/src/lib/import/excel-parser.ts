// ─── Import Module — Excel/CSV Parser & Column Auto-Mapper ──────────────────

import * as XLSX from 'xlsx'
import type { ColumnDef, ColumnMapping, ImportConfig } from './types'
import { normalizeHeader } from './validators'

// ─── Parse file ─────────────────────────────────────────────────────────────

export type ParsedFile = {
  headers: string[]
  rows: Record<string, string>[]
}

export async function parseExcelFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Fichier vide — aucune feuille trouvée')

  const sheet = workbook.Sheets[sheetName]
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  if (jsonRows.length === 0) throw new Error('Aucune ligne de données trouvée')

  const headers = Object.keys(jsonRows[0])
  const rows = jsonRows.map((row) => {
    const cleaned: Record<string, string> = {}
    for (const key of headers) {
      cleaned[key] = String(row[key] ?? '').trim()
    }
    return cleaned
  })

  return { headers, rows }
}

// ─── Auto-map columns ───────────────────────────────────────────────────────

export function autoMapColumns(
  headers: string[],
  columns: ColumnDef[],
): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  const usedTargets = new Set<string>()

  for (const header of headers) {
    const normalized = normalizeHeader(header)
    let bestMatch: { key: string; confidence: 'high' | 'medium' } | null = null

    for (const col of columns) {
      if (usedTargets.has(col.key)) continue

      // Exact alias match → high confidence
      const hasExact = col.aliases.some(
        (a) => normalizeHeader(a) === normalized,
      )
      if (hasExact) {
        bestMatch = { key: col.key, confidence: 'high' }
        break
      }

      // Partial match → medium confidence (header contains alias or vice versa)
      if (!bestMatch) {
        const hasPartial = col.aliases.some(
          (a) =>
            normalized.includes(normalizeHeader(a)) ||
            normalizeHeader(a).includes(normalized),
        )
        if (hasPartial) {
          bestMatch = { key: col.key, confidence: 'medium' }
        }
      }
    }

    if (bestMatch) {
      usedTargets.add(bestMatch.key)
      mappings.push({
        sourceHeader: header,
        targetKey: bestMatch.key,
        confidence: bestMatch.confidence,
      })
    } else {
      mappings.push({
        sourceHeader: header,
        targetKey: null,
        confidence: 'low',
      })
    }
  }

  return mappings
}

// ─── Apply mappings to raw rows ─────────────────────────────────────────────

export function applyMappings(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = {}
    for (const m of mappings) {
      if (m.targetKey) {
        mapped[m.targetKey] = row[m.sourceHeader] ?? ''
      }
    }
    return mapped
  })
}

// ─── Generate template ──────────────────────────────────────────────────────

export function generateTemplate(config: ImportConfig): void {
  const headers = config.columns.map((c) => c.label)
  const exampleRows = config.templateExampleRows.map((ex) =>
    config.columns.map((c) => ex[c.key] ?? ''),
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])

  // Auto-size columns
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 15) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Import')
  XLSX.writeFile(wb, config.templateFileName)
}
