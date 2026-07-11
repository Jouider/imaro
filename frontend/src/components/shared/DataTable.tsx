import { useState, useMemo, type ReactNode, type ChangeEvent } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Column<T> = {
  /** Clé du champ (ou clé unique si renderCell fourni) */
  key: string
  /** En-tête de colonne */
  header: string
  /** Rendu personnalisé de la cellule */
  renderCell?: (row: T) => ReactNode
  /** Activer le tri sur cette colonne (nécessite que T[key] soit comparable) */
  sortable?: boolean
  /** Classes CSS de la colonne */
  className?: string
}

type SortDir = 'asc' | 'desc'

type Props<T> = {
  data: T[]
  columns: Column<T>[]
  /** Clé unique par ligne (ex: 'id') */
  rowKey: keyof T
  /** Activer la recherche globale */
  searchable?: boolean
  /** Placeholder de la barre de recherche */
  searchPlaceholder?: string
  /** Activer la sélection multiple (les IDs sélectionnés sont transmis via onSelectionChange) */
  selectable?: boolean
  onSelectionChange?: (selected: T[keyof T][]) => void
  /** Activer l'export CSV */
  exportable?: boolean
  exportFilename?: string
  /** Taille de page. Défaut: 10 */
  pageSize?: number
  /** État de chargement */
  isLoading?: boolean
  /** Icône pour l'état vide */
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  onEmptyAction?: () => void
  emptyActionLabel?: string
  className?: string
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCsv<T>(data: T[], columns: Column<T>[], filename: string) {
  const headers = columns.map((c) => c.header).join(';')
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = (row as Record<string, unknown>)[col.key]
        return typeof val === 'string'
          ? `"${val.replace(/"/g, '""')}"`
          : String(val ?? '')
      })
      .join(';'),
  )
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Table de données universelle : tri, recherche, pagination, sélection, export CSV.
 *
 * @example
 * <DataTable
 *   data={coproprietaires}
 *   columns={[
 *     { key: 'name', header: 'Nom', sortable: true },
 *     { key: 'phone', header: 'Téléphone' },
 *     { key: 'statut', header: 'Statut', renderCell: (r) => <StatutBadge statut={r.statut} /> },
 *   ]}
 *   rowKey="id"
 *   searchable
 *   exportable
 *   exportFilename="coproprietaires"
 * />
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchable = false,
  searchPlaceholder = 'Rechercher…',
  selectable = false,
  onSelectionChange,
  exportable = false,
  exportFilename = 'export',
  pageSize = 10,
  isLoading = false,
  emptyIcon,
  emptyTitle = 'Aucun résultat',
  emptyDescription,
  onEmptyAction,
  emptyActionLabel,
  className,
}: Props<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<T[keyof T]>>(new Set())
  const [page, setPage] = useState(1)

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const val = (row as Record<string, unknown>)[col.key]
        return String(val ?? '')
          .toLowerCase()
          .includes(q)
      }),
    )
  }, [data, columns, search])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av === bv) return 0
      const cmp = av! < bv! ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  // Selection helpers
  const allPageSelected =
    paginated.length > 0 && paginated.every((row) => selected.has(row[rowKey]))

  function toggleRow(id: T[keyof T]) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      onSelectionChange?.([...next])
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        paginated.forEach((row) => next.delete(row[rowKey]))
      } else {
        paginated.forEach((row) => next.add(row[rowKey]))
      }
      onSelectionChange?.([...next])
      return next
    })
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (sortKey !== colKey)
      return <ChevronsUpDown className="size-3.5 opacity-40" />
    return sortDir === 'asc' ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    )
  }

  if (isLoading) return <LoadingSkeleton variant="table" count={pageSize} />

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {searchable && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCsv(sorted, columns, exportFilename)}
            >
              <Download className="me-1.5 size-4" />
              CSV
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.sortable && 'cursor-pointer select-none',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-0"
                >
                  <EmptyState
                    icon={emptyIcon ?? <Search className="size-12" />}
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    className="rounded-none border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => {
                const id = row[rowKey]
                return (
                  <TableRow
                    key={String(id)}
                    data-state={selected.has(id) ? 'selected' : undefined}
                  >
                    {selectable && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleRow(id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.renderCell
                          ? col.renderCell(row)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? '',
                            )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, sorted.length)} sur {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
