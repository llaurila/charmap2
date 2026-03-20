import type { ResultsPanelHeaderViewModel } from '../hooks/useResultsPanelViewModel'

type ResultsPanelHeaderProps = ResultsPanelHeaderViewModel

export function ResultsPanelHeader({
  activeSetText,
  hasQuery,
  isDirectLookupOnly,
  isVirtualized,
  resultsStatusText,
  searchStatusText,
}: ResultsPanelHeaderProps) {
  return (
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
        {isVirtualized ? <span>Virtualized</span> : null}
      </div>
    </div>
  )
}
