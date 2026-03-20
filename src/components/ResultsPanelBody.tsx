import type { ResultsPanelBodyViewModel } from '../hooks/useResultsPanelViewModel'
import { ResultCard } from './ResultCard'
import { formatCodePoint } from '../utils/copyFormats'

type ResultsPanelBodyProps = ResultsPanelBodyViewModel

export function ResultsPanelBody({
  bottomSpacerHeight,
  directLookupCp,
  displayResults,
  gridRef,
  isDirectLookupLoading,
  isReady,
  onResultCardKeyDown,
  onScrollTopChange,
  onSelectResult,
  selectedCp,
  topSpacerHeight,
  virtualColumnCount,
  visibleResults,
}: ResultsPanelBodyProps) {
  if (!isReady) {
    return (
      <div className="empty-state">
        <h3>Loading Unicode data</h3>
        <p>Building the search experience from generated static assets.</p>
      </div>
    )
  }

  if (isDirectLookupLoading) {
    return (
      <div className="empty-state">
        <h3>Loading exact lookup</h3>
        <p>Fetching the block file for {formatCodePoint(directLookupCp ?? 0)}.</p>
      </div>
    )
  }

  if (displayResults.length === 0) {
    return (
      <div className="empty-state">
        <h3>No matches yet</h3>
        <p>Try a direct character, a `U+` lookup, an alias like `nbsp`, or a block name.</p>
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className="results-scroller"
      onScroll={(event) => onScrollTopChange(event.currentTarget.scrollTop)}
    >
      {topSpacerHeight > 0 ? (
        <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
      ) : null}
      <div
        className="results-grid"
        style={{ gridTemplateColumns: `repeat(${virtualColumnCount}, minmax(0, 1fr))` }}
        role="listbox"
        aria-label="Character results"
        aria-activedescendant={selectedCp !== null ? `result-${selectedCp}` : undefined}
      >
        {visibleResults.map((record) => {
          return (
            <ResultCard
              key={record.cp}
              isSelected={selectedCp === record.cp}
              onKeyDown={onResultCardKeyDown}
              onSelect={onSelectResult}
              record={record}
            />
          )
        })}
      </div>
      {bottomSpacerHeight > 0 ? (
        <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
      ) : null}
    </div>
  )
}
