import type { KeyboardEvent, RefObject } from 'react'
import type { ResultRecord } from '../types/unicode'
import { formatCodePoint } from '../utils/copyFormats'
import { getPrimaryGlyph } from '../utils/rendering'

const handleResultCardKeyDown = (
  event: KeyboardEvent<HTMLButtonElement>,
  displayResults: ResultRecord[],
  selectResult: (cp: number, shouldFocus?: boolean) => void,
  focusResultByOffset: (offset: number) => void,
  virtualColumnCount: number,
): void => {
  const offsets: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: virtualColumnCount,
    ArrowUp: -virtualColumnCount,
  }
  const offset = offsets[event.key]

  if (offset !== undefined) {
    event.preventDefault()
    focusResultByOffset(offset)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    const first = displayResults[0]

    if (first) {
      selectResult(first.cp, true)
    }

    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    const last = displayResults.at(-1)

    if (last) {
      selectResult(last.cp, true)
    }
  }
}

type ResultsPanelProps = {
  activeSetText: string
  bottomSpacerHeight: number
  directLookupCp: number | null
  displayResults: ResultRecord[]
  gridRef: RefObject<HTMLDivElement | null>
  hasQuery: boolean
  isDirectLookupLoading: boolean
  isDirectLookupOnly: boolean
  isReady: boolean
  onFocusResultByOffset: (offset: number) => void
  onScrollTopChange: (scrollTop: number) => void
  onSelectResult: (cp: number, shouldFocus?: boolean) => void
  resultsStatusText: string
  searchStatusText: string
  selectedCp: number | null
  topSpacerHeight: number
  virtualColumnCount: number
  visibleResults: ResultRecord[]
}

type ResultsPanelContentProps = Omit<
  ResultsPanelProps,
  'activeSetText' | 'hasQuery' | 'isDirectLookupOnly' | 'resultsStatusText' | 'searchStatusText'
>

function ResultsPanelContent({
  bottomSpacerHeight,
  directLookupCp,
  displayResults,
  gridRef,
  isDirectLookupLoading,
  isReady,
  onFocusResultByOffset,
  onScrollTopChange,
  onSelectResult,
  selectedCp,
  topSpacerHeight,
  virtualColumnCount,
  visibleResults,
}: ResultsPanelContentProps) {
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
          const isSelected = selectedCp === record.cp

          return (
            <button
              id={`result-${record.cp}`}
              key={record.cp}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={isSelected ? 'result-card is-selected' : 'result-card'}
              onClick={() => onSelectResult(record.cp)}
              onKeyDown={(event) =>
                handleResultCardKeyDown(
                  event,
                  displayResults,
                  onSelectResult,
                  onFocusResultByOffset,
                  virtualColumnCount,
                )
              }
            >
              <span className={`glyph-tile kind-${record.kind}`}>{getPrimaryGlyph(record)}</span>
              <span className="result-meta">
                <strong>{record.aliases?.[0] ?? record.name}</strong>
                <span>{formatCodePoint(record.cp)}</span>
              </span>
            </button>
          )
        })}
      </div>
      {bottomSpacerHeight > 0 ? (
        <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
      ) : null}
    </div>
  )
}

export function ResultsPanel({
  activeSetText,
  bottomSpacerHeight,
  directLookupCp,
  displayResults,
  gridRef,
  hasQuery,
  isDirectLookupLoading,
  isDirectLookupOnly,
  isReady,
  onFocusResultByOffset,
  onScrollTopChange,
  onSelectResult,
  resultsStatusText,
  searchStatusText,
  selectedCp,
  topSpacerHeight,
  virtualColumnCount,
  visibleResults,
}: ResultsPanelProps) {
  return (
    <section className="panel results-panel">
      <div className="panel-heading results-heading">
        <div>
          <h2>Results</h2>
          <p>{resultsStatusText}</p>
          <p id="search-status" className="search-status">
            {searchStatusText}
          </p>
        </div>
        <div className="inline-badges">
          <span>{activeSetText}</span>
          <span>{hasQuery ? 'Filtered' : 'Browse mode'}</span>
          {isDirectLookupOnly ? <span>Exact code point lookup</span> : null}
          {displayResults.length > 80 ? <span>Virtualized</span> : null}
        </div>
      </div>

      <ResultsPanelContent
        bottomSpacerHeight={bottomSpacerHeight}
        directLookupCp={directLookupCp}
        displayResults={displayResults}
        gridRef={gridRef}
        isDirectLookupLoading={isDirectLookupLoading}
        isReady={isReady}
        onFocusResultByOffset={onFocusResultByOffset}
        onScrollTopChange={onScrollTopChange}
        onSelectResult={onSelectResult}
        selectedCp={selectedCp}
        topSpacerHeight={topSpacerHeight}
        virtualColumnCount={virtualColumnCount}
        visibleResults={visibleResults}
      />
    </section>
  )
}
