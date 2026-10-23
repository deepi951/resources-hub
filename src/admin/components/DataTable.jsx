function DataTable({ columns, rows, emptyMessage = 'No records available.', ariaLabel = 'Records' }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state-card">{emptyMessage}</div>
  }

  return (
    <div className="data-table-wrap" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.headerClassName || ''} style={column.width ? { width: column.width } : undefined} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || `${rowIndex}-${row.name || row.title || row.customer}`}>
              {columns.map((column) => (
                <td key={`${row.id || rowIndex}-${column.key}`} className={column.className || ''}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : <span className="data-table-cell-text" title={row[column.key] == null ? '' : String(row[column.key])}>{row[column.key]}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
