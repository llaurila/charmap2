import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { FeaturedSetsPanel } from './components/FeaturedSetsPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { UNICODE_VERSION } from './constants/unicode'
import { featuredSets } from './data/featuredSets'
import { findBlockForCodePoint } from './data/unicode'
import { useCopyFeedback } from './hooks/useCopyFeedback'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useResultsGrid } from './hooks/useResultsGrid'
import { useUnicodeData } from './hooks/useUnicodeData'
import { getCopyFormats } from './utils/copyFormats'
import {
  getSelectedDetailRecord,
  getSelectedSearchRecord,
  getVirtualizationState,
  moveSelection,
  RESULT_ROW_HEIGHT,
} from './utils/resultState'
import { getSingleCodePointQuery, searchCharacters } from './utils/search'

// eslint-disable-next-line complexity
export default function App() {
  const [queryInput, setQueryInput] = useState('')
  const [activeSet, setActiveSet] = useState<string | undefined>()
  const gridRef = useRef<HTMLDivElement | null>(null)
  const query = useDebouncedValue(queryInput, 500)
  const hasQuery = query.length > 0
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
  const { announceMessage, copiedLabel, copyValue } = useCopyFeedback()
  const { gridHeight, gridScrollTop, gridWidth, setGridScrollTop } = useResultsGrid({
    activeSet,
    gridRef,
    isReady,
    query,
  })

  const results = useMemo(
    () => searchCharacters(searchIndex, query, activeSet),
    [activeSet, query, searchIndex],
  )

  useEffect(() => {
    if (results.length === 0) {
      return
    }

    const currentSelectionExists =
      selectedCp !== null && results.some((record) => record.cp === selectedCp)

    if (!currentSelectionExists) {
      setSelectedCp(results[0]?.cp ?? null)
    }
  }, [results, selectedCp, setSelectedCp])

  const selectedSearchRecord = useMemo(
    () => getSelectedSearchRecord(results, searchIndex, selectedCp, hasQuery),
    [hasQuery, results, searchIndex, selectedCp],
  )
  const directLookupCp = useMemo(() => getSingleCodePointQuery(query), [query])
  const directLookupBlock = useMemo(
    () => (directLookupCp !== null ? findBlockForCodePoint(blockIndex, directLookupCp) : undefined),
    [blockIndex, directLookupCp],
  )
  const selectedBlock = useMemo(
    () =>
      selectedSearchRecord
        ? findBlockForCodePoint(blockIndex, selectedSearchRecord.cp)
        : undefined,
    [blockIndex, selectedSearchRecord],
  )
  const effectiveRequestedBlock = selectedBlock ?? (hasQuery ? directLookupBlock : undefined)

  useEffect(() => {
    loadBlock(effectiveRequestedBlock)
  }, [effectiveRequestedBlock, loadBlock])

  const selectedDetailRecord = useMemo(
    () =>
      getSelectedDetailRecord(
        loadedBlocks,
        selectedSearchRecord,
        selectedBlock,
        directLookupCp,
        directLookupBlock,
      ),
    [directLookupBlock, directLookupCp, loadedBlocks, selectedBlock, selectedSearchRecord],
  )
  const displayResults = useMemo(() => {
    if (results.length > 0) {
      return results
    }

    if (hasQuery && selectedDetailRecord) {
      return [selectedDetailRecord]
    }

    return []
  }, [hasQuery, results, selectedDetailRecord])
  const isDirectLookupOnly = hasQuery && results.length === 0 && displayResults.length > 0
  const isDirectLookupLoading =
    hasQuery &&
    results.length === 0 &&
    directLookupCp !== null &&
    directLookupBlock !== undefined &&
    displayResults.length === 0
  const { bottomSpacerHeight, topSpacerHeight, virtualColumnCount, visibleResults } = useMemo(
    () => getVirtualizationState(displayResults, gridHeight, gridWidth, gridScrollTop),
    [displayResults, gridHeight, gridScrollTop, gridWidth],
  )
  const copyFormats = selectedDetailRecord ? getCopyFormats(selectedDetailRecord) : []
  const selectedDetailCp = selectedDetailRecord?.cp ?? null
  const resultsStatusText = isReady
    ? `${results.length.toLocaleString()} matching characters.`
    : 'Loading generated search index.'
  const searchStatusText =
    queryInput === query ? 'Search results are current.' : 'Waiting for typing to pause.'
  const activeSetText = activeSet
    ? featuredSets.find((set) => set.id === activeSet)?.label ?? 'Featured set'
    : 'All sets'

  const selectResult = useCallback((cp: number, shouldFocus = false): void => {
    setSelectedCp(cp)

    if (!shouldFocus) {
      return
    }

    window.requestAnimationFrame(() => {
      const element = document.getElementById(`result-${cp}`)

      if (element instanceof HTMLButtonElement) {
        element.focus()
      }
    })
  }, [setSelectedCp])

  const focusResultByOffset = useCallback((offset: number): void => {
    const nextRecord = moveSelection(displayResults, selectedDetailCp, offset)

    if (!nextRecord) {
      return
    }

    selectResult(nextRecord.cp, true)

    if (displayResults.length > 80 && gridRef.current) {
      const nextIndex = displayResults.findIndex((record) => record.cp === nextRecord.cp)
      const nextRow = Math.floor(nextIndex / virtualColumnCount)
      const rowTop = nextRow * RESULT_ROW_HEIGHT
      const rowBottom = rowTop + RESULT_ROW_HEIGHT

      if (rowTop < gridRef.current.scrollTop) {
        gridRef.current.scrollTop = rowTop
      } else if (rowBottom > gridRef.current.scrollTop + gridHeight) {
        gridRef.current.scrollTop = rowBottom - gridHeight
      }
    }
  }, [displayResults, gridHeight, gridRef, selectResult, selectedDetailCp, virtualColumnCount])

  const handleCopyFormat = useCallback(
    async (entry: (typeof copyFormats)[number]): Promise<void> =>
      copyValue(entry.label, entry.value),
    [copyValue],
  )

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
          onClick={() => {
            setQueryInput('')
            setActiveSet(undefined)
          }}
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
    </div>
  )
}
