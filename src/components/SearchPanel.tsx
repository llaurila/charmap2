type SearchPanelProps = {
  disabled: boolean
  onQueryInputChange: (value: string) => void
  onReset: () => void
  onSelectFirstResult: () => void
  queryInput: string
}

export function SearchPanel({
  disabled,
  onQueryInputChange,
  onReset,
  onSelectFirstResult,
  queryInput,
}: SearchPanelProps) {
  return (
    <section className="search-panel">
      <label className="search-field">
        <span className="sr-only">Search characters</span>
        <input
          type="search"
          value={queryInput}
          onChange={(event) => onQueryInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown') {
              return
            }

            event.preventDefault()
            onSelectFirstResult()
          }}
          placeholder="Search by character, U+00A0, alias, block, script, or keyword"
          disabled={disabled}
          aria-describedby="search-status"
        />
        {queryInput.length > 0 ? (
          <button
            type="button"
            className="ghost-button search-reset-button"
            onClick={onReset}
            disabled={disabled}
            aria-label="Reset search"
          >
            <span className="search-reset-button__label">Reset</span>
            <span className="search-reset-button__icon" aria-hidden="true">
              ×
            </span>
          </button>
        ) : null}
      </label>
    </section>
  )
}
