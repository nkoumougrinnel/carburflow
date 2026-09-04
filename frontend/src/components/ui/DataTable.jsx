import React, { useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

function DataTable({
  data = [],
  columns = [],
  searchPlaceholder = 'Rechercher…',
  searchable = true,
  sortable = true,
  paginated = true,
  exportable = true,
  pageSize = 8,
  exportFilename = 'export',
  emptyState,
  onRowClick,
  rowClassName,
  rowKey = 'id',
  className,
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)

  const searchableColumns = useMemo(() => columns.filter((col) => col.searchable !== false), [columns])

  const filtered = useMemo(() => {
    if (!query.trim()) return data
    const q = query.trim().toLowerCase()
    return data.filter((row) =>
      searchableColumns.some((col) => {
        const raw = col.searchValue ? col.searchValue(row) : row?.[col.key]
        if (raw == null) return false
        return String(raw).toLowerCase().includes(q)
      }),
    )
  }, [data, query, searchableColumns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const col = columns.find((c) => c.key === sortKey)
    const getValue = (row) => (col?.sortValue ? col.sortValue(row) : row?.[sortKey])
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb), 'fr', { numeric: true }) * dir
    })
  }, [filtered, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = paginated ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted

  const toggleSort = (key) => {
    if (!sortable) return
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown size={14} className="datatable-sort-icon" aria-hidden="true" />
    return sortDir === 'asc'
      ? <ArrowUp size={14} className="datatable-sort-icon datatable-sort-icon--active" aria-hidden="true" />
      : <ArrowDown size={14} className="datatable-sort-icon datatable-sort-icon--active" aria-hidden="true" />
  }

  const exportCsv = () => {
    const header = columns.map((c) => c.label)
    const rows = filtered.map((row) =>
      columns.map((col) => {
        const val = col.exportValue ? col.exportValue(row) : row?.[col.key]
        if (val == null) return ''
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(';'),
    )
    const csv = [header.join(';'), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFilename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const pageNumbers = useMemo(() => {
    const total = totalPages
    const current = safePage
    const pages = new Set([0, total - 1, current - 1, current, current + 1])
    return [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b)
  }, [totalPages, safePage])
  return (
    <div className={cn('datatable', className)}>
      {(searchable || exportable) && (
        <div className="datatable-toolbar">
          {searchable && (
            <div className="datatable-search">
              <Search size={16} className="datatable-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="datatable-search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {exportable && (
            <button type="button" className="datatable-export-btn" onClick={exportCsv} title="Exporter en CSV">
              <Download size={16} aria-hidden="true" />
              <span>Exporter</span>
            </button>
          )}
        </div>
      )}

      <div className="datatable-scroll">
        <table className="datatable-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ textAlign: col.align || 'left' }}
                  className={cn('datatable-th', col.sortable !== false && sortable && 'datatable-th--sortable')}
                  onClick={() => col.sortable !== false && sortable && toggleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="datatable-th-content">
                    {col.label}
                    {col.sortable !== false && sortable && sortIcon(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row?.[rowKey] ?? JSON.stringify(row)}
                className={cn(onRowClick && 'datatable-row--clickable', rowClassName?.(row))}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(row) }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row, row?.[col.key]) : (row?.[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="datatable-empty-cell">
                  {emptyState || (
                    <div className="datatable-empty">
                      <FileText size={32} className="datatable-empty-icon" aria-hidden="true" />
                      <p>Aucune donnée à afficher</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginated && totalPages > 1 && (
        <div className="datatable-footer">
          <span className="datatable-count">{sorted.length} résultat{sorted.length !== 1 ? 's' : ''}</span>
          <div className="datatable-pagination">
            <button type="button" className="datatable-page-btn" onClick={() => setPage(0)} disabled={safePage === 0} aria-label="Première page">
              <ChevronsLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" className="datatable-page-btn" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} aria-label="Page précédente">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            {pageNumbers.map((p, i) => {
              const prev = pageNumbers[i - 1]
              return (
                <React.Fragment key={p}>
                  {prev != null && p - prev > 1 && <span className="datatable-page-ellipsis">…</span>}
                  <button type="button" className={cn('datatable-page-btn', p === safePage && 'is-active')} onClick={() => setPage(p)} aria-current={p === safePage ? 'page' : undefined}>
                    {p + 1}
                  </button>
                </React.Fragment>
              )
            })}
            <button type="button" className="datatable-page-btn" onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1} aria-label="Page suivante">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="datatable-page-btn" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1} aria-label="Dernière page">
              <ChevronsRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
export { DataTable }