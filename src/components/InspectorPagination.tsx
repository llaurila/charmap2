type InspectorPaginationProps = {
  label: string
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function InspectorPagination({
  label, page, pageSize, total, onPageChange,
}: InspectorPaginationProps) {
  if (total <= pageSize) return null
  const pageCount = Math.ceil(total / pageSize)
  return (
    <nav className="inspector-pagination" aria-label={`${label} pages`}>
      <button
        type="button" className="ghost-button" disabled={page === 0}
        aria-label={`Previous ${label.toLowerCase()} page`}
        onClick={() => onPageChange(page - 1)}
      >Previous</button>
      <span>
        {(page * pageSize + 1).toLocaleString()}–
        {Math.min((page + 1) * pageSize, total).toLocaleString()} of {total.toLocaleString()}
      </span>
      <button
        type="button" className="ghost-button" disabled={page + 1 >= pageCount}
        aria-label={`Next ${label.toLowerCase()} page`}
        onClick={() => onPageChange(page + 1)}
      >Next</button>
    </nav>
  )
}
