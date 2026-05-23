// ─── Import Module — Shared Types ───────────────────────────────────────────

export type ColumnType = 'string' | 'number' | 'date' | 'email' | 'phone'

export type ColumnDef = {
  key: string
  label: string
  aliases: string[]
  type: ColumnType
  required: boolean
}

export type ImportConfig<T = Record<string, unknown>> = {
  id: string
  labelKey: string
  icon: string
  columns: ColumnDef[]
  validate: (row: Record<string, unknown>, ctx: ImportContext) => string[]
  transform: (row: Record<string, unknown>, ctx: ImportContext) => T
  endpoint: string
  method: 'POST'
  chunkSize: number
  templateFileName: string
  templateExampleRows: Record<string, string | number>[]
}

export type ImportContext = {
  residenceId: number
  existingLots: { id: number; numero: string; tantieme: number }[]
  existingCoproprietaires: { id: number; name: string; phone: string; lot_id?: number }[]
  existingImmeubles: { id: number; nom: string }[]
}

export type RowStatus = 'pending' | 'valid' | 'error' | 'importing' | 'success' | 'failed'

export type ImportRow = {
  _index: number
  _status: RowStatus
  _errors: string[]
  [key: string]: unknown
}

export type ColumnMapping = {
  sourceHeader: string
  targetKey: string | null
  confidence: 'high' | 'medium' | 'low' | 'manual'
}

export type ImportResult = {
  total: number
  success: number
  failed: number
  errors: { row: number; message: string }[]
}
