import { useMemo, useRef } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { FeaturedSetsPanel } from './components/FeaturedSetsPanel'
import { InstallPanel } from './components/InstallPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { UNICODE_VERSION } from './constants/unicode'
import { useCharacterSearchResults } from './hooks/useCharacterSearchResults'
import { useDetailCopyFormats } from './hooks/useDetailCopyFormats'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useResultNavigation } from './hooks/useResultNavigation'
import { useResultsGrid } from './hooks/useResultsGrid'
import { useSearchControls } from './hooks/useSearchControls'
import { useUnicodeData } from './hooks/useUnicodeData'
import { getVirtualizationState } from './utils/resultState'
import { getActiveSetText, getResultsStatusText } from './utils/resultsViewModel'

export default function App() {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const {
    activeSet,
    hasQuery,
    query,
    queryInput,
    resetSearch,
    searchStatusText,
    setActiveSet,
    setQueryInput,
  } = useSearchControls()
  const {
    blockIndex,
    isReady,
    loadedBlocks,
    loadBlock,
    loadError,
    searchIndex,
    selectedCp,
    setSelectedCp,
  } = useUnicodeData()
  const { deferredInstallPrompt, handleInstallClick, installSurface, shouldShowInstallPanel } =
    useInstallPrompt()
  const {
    directLookupCp,
    displayResults,
    isDirectLookupLoading,
    isDirectLookupOnly,
    results,
    selectedDetailRecord,
  } = useCharacterSearchResults({
      activeSet,
      blockIndex,
      hasQuery,
      loadedBlocks,
      loadBlock,
      query,
      searchIndex,
      selectedCp,
      setSelectedCp,
    })
  const { gridHeight, gridScrollTop, gridWidth, setGridScrollTop } = useResultsGrid({
    activeSet,
    gridRef,
    isReady,
    query,
  })
  const { bottomSpacerHeight, topSpacerHeight, virtualColumnCount, visibleResults } = useMemo(
    () => getVirtualizationState(displayResults, gridHeight, gridWidth, gridScrollTop),
    [displayResults, gridHeight, gridScrollTop, gridWidth],
  )
  const selectedDetailCp = selectedDetailRecord?.cp ?? null
  const resultsStatusText = getResultsStatusText(isReady, results.length)
  const activeSetText = getActiveSetText(activeSet)
  const { announceMessage, copiedLabel, copyFormats, handleCopyFormat } =
    useDetailCopyFormats(selectedDetailRecord)
  const { focusResultByOffset, selectResult } = useResultNavigation({
    displayResults,
    gridHeight,
    gridRef,
    selectedCp: selectedDetailCp,
    setSelectedCp,
    virtualColumnCount,
  })

  return (
    <div className="app-shell">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announceMessage}
      </div>
      <header className="hero">
        <div>
          <p className="eyebrow">Unicode {UNICODE_VERSION}</p>
          <h1>Charmap2</h1>
          <p className="hero-copy">
            A static Unicode character map with build-time data generation, fast search, and lazy
            detail loading by block.
          </p>
        </div>
        <div className="hero-metrics" aria-label="Project goals">
          <span>{searchIndex.length.toLocaleString()} indexed characters</span>
          <span>{blockIndex.length.toLocaleString()} block files</span>
        </div>
      </header>

      {shouldShowInstallPanel ? (
        <InstallPanel
          hasPrompt={deferredInstallPrompt !== null}
          installSurface={installSurface}
          onInstallClick={handleInstallClick}
        />
      ) : null}

      <section className="search-panel">
        <label className="search-field">
          <span className="sr-only">Search characters</span>
          <input
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown') {
                return
              }

              const first = displayResults[0]

              if (!first) {
                return
              }

              event.preventDefault()
              selectResult(first.cp, true)
            }}
            placeholder="Search by character, U+00A0, alias, block, script, or keyword"
            disabled={!isReady}
            aria-describedby="search-status"
          />
        </label>
        <button
          type="button"
          className="ghost-button"
          onClick={resetSearch}
          disabled={!isReady}
        >
          Reset
        </button>
      </section>

      <main className="workspace">
        <FeaturedSetsPanel
          activeSet={activeSet}
          isReady={isReady}
          loadError={loadError}
          onSelectSet={setActiveSet}
          searchIndex={searchIndex}
        />

        <ResultsPanel
          activeSetText={activeSetText}
          bottomSpacerHeight={bottomSpacerHeight}
          directLookupCp={directLookupCp}
          displayResults={displayResults}
          gridRef={gridRef}
          hasQuery={hasQuery}
          isDirectLookupLoading={isDirectLookupLoading}
          isDirectLookupOnly={isDirectLookupOnly}
          isReady={isReady}
          onFocusResultByOffset={focusResultByOffset}
          onScrollTopChange={setGridScrollTop}
          onSelectResult={selectResult}
          resultsStatusText={resultsStatusText}
          searchStatusText={searchStatusText}
          selectedCp={selectedDetailCp}
          topSpacerHeight={topSpacerHeight}
          virtualColumnCount={virtualColumnCount}
          visibleResults={visibleResults}
        />

        <DetailPanel
          copiedLabel={copiedLabel}
          copyFormats={copyFormats}
          onCopyFormat={handleCopyFormat}
          selectedDetailRecord={selectedDetailRecord}
        />
      </main>

      <footer className="app-footer">© Copyright 2026 Vincent Laurila</footer>
    </div>
  )
}
