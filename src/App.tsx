import { useEffect, useMemo, useRef, useState } from 'react'
import { UNICODE_VERSION } from './constants/unicode'
import { featuredSets } from './data/featuredSets'
import {
  findBlockForCodePoint,
  loadBlockIndex,
  loadBlockRecords,
  loadSearchIndex,
} from './data/unicode'
import type { BlockIndexEntry, CharacterRecord, SearchRecord } from './types/unicode'
import { getCopyFormats } from './utils/copyFormats'
import { getGlyphCaption, getPrimaryGlyph } from './utils/rendering'
import { getSingleCodePointQuery, searchCharacters } from './utils/search'

const formatCodePointDisplay = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

const fallbackCopy = async (value: string): Promise<void> => {
  const helper = document.createElement('textarea')
  helper.value = value
  helper.setAttribute('readonly', 'true')
  helper.style.position = 'absolute'
  helper.style.left = '-9999px'
  document.body.appendChild(helper)
  helper.select()
  document.execCommand('copy')
  document.body.removeChild(helper)
}

const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  await fallbackCopy(value)
}

const isLoadedCharacterRecord = (record: CharacterRecord | SearchRecord): record is CharacterRecord =>
  'category' in record

const summarizeCaseMap = (record: CharacterRecord): string => {
  if (!record.caseMap) {
    return 'None'
  }

  return Object.entries(record.caseMap)
    .map(([key, value]) => `${key}: ${formatCodePointDisplay(value)}`)
    .join(' | ')
}

const summarizeFlags = (record: CharacterRecord): string => record.flags?.join(', ') ?? 'None'
const RESULT_ROW_HEIGHT = 196
const VIRTUAL_OVERSCAN_ROWS = 2
const RESULT_GRID_GAP = 14
const RESULT_CARD_MIN_WIDTH = 180
const RESULT_CARD_MIN_WIDTH_NARROW = 150

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

export default function App() {
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [activeSet, setActiveSet] = useState<string | undefined>()
  const [searchIndex, setSearchIndex] = useState<SearchRecord[]>([])
  const [blockIndex, setBlockIndex] = useState<BlockIndexEntry[]>([])
  const [loadedBlocks, setLoadedBlocks] = useState<Record<string, CharacterRecord[]>>({})
  const [selectedCp, setSelectedCp] = useState<number | null>(null)
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [announceMessage, setAnnounceMessage] = useState('')
  const [gridHeight, setGridHeight] = useState(720)
  const [gridWidth, setGridWidth] = useState(900)
  const [gridScrollTop, setGridScrollTop] = useState(0)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const hasQuery = query.length > 0

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(queryInput)
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [queryInput])

  useEffect(() => {
    let isCancelled = false

    Promise.all([loadSearchIndex(), loadBlockIndex()])
      .then(([searchRecords, blockEntries]) => {
        if (isCancelled) {
          return
        }

        setSearchIndex(searchRecords)
        setBlockIndex(blockEntries)
        setSelectedCp(searchRecords[0]?.cp ?? null)
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setLoadError(error instanceof Error ? error.message : String(error))
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const results = useMemo(
    () => searchCharacters(searchIndex, query, activeSet),
    [activeSet, query, searchIndex],
  )
  const isReady = searchIndex.length > 0

  useEffect(() => {
    if (results.length === 0) {
      return
    }

    const currentSelectionExists = selectedCp !== null && results.some((record) => record.cp === selectedCp)

    if (!currentSelectionExists) {
      setSelectedCp(results[0]?.cp ?? null)
    }
  }, [results, selectedCp])

  const selectedSearchRecord = useMemo(() => {
    if (hasQuery && results.length === 0) {
      return null
    }

    if (selectedCp === null) {
      return results[0] ?? searchIndex[0] ?? null
    }

    return (
      results.find((record) => record.cp === selectedCp) ??
      searchIndex.find((record) => record.cp === selectedCp) ??
      results[0] ??
      searchIndex[0] ??
      null
    )
  }, [query, results, searchIndex, selectedCp])

  const directLookupCp = useMemo(() => getSingleCodePointQuery(query), [query])

  const directLookupBlock = useMemo(
    () =>
      directLookupCp !== null
        ? findBlockForCodePoint(blockIndex, directLookupCp)
        : undefined,
    [blockIndex, directLookupCp],
  )

  const selectedBlock = useMemo(
    () =>
      selectedSearchRecord
        ? findBlockForCodePoint(blockIndex, selectedSearchRecord.cp)
        : undefined,
    [blockIndex, selectedSearchRecord],
  )

  const requestedBlock = selectedBlock ?? (hasQuery ? directLookupBlock : undefined)

  useEffect(() => {
    if (!requestedBlock || loadedBlocks[requestedBlock.id]) {
      return
    }

    let isCancelled = false

    loadBlockRecords(requestedBlock.file)
      .then((records) => {
        if (isCancelled) {
          return
        }

        setLoadedBlocks((current) => ({
          ...current,
          [requestedBlock.id]: records,
        }))
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setLoadError(error instanceof Error ? error.message : String(error))
      })

    return () => {
      isCancelled = true
    }
  }, [loadedBlocks, requestedBlock])

  useEffect(() => {
    if (!copiedLabel) {
      return
    }

    setAnnounceMessage(`${copiedLabel} copied`)
    const timeout = window.setTimeout(() => setCopiedLabel(null), 1600)
    return () => window.clearTimeout(timeout)
  }, [copiedLabel])

  useEffect(() => {
    if (!announceMessage) {
      return
    }

    const timeout = window.setTimeout(() => setAnnounceMessage(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [announceMessage])

  useEffect(() => {
    const updateGridMetrics = (): void => {
      const element = gridRef.current

      if (!element) {
        return
      }

      setGridHeight(Math.max(320, Math.round(element.clientHeight)))
      setGridWidth(Math.max(220, Math.round(element.clientWidth)))
    }

    updateGridMetrics()

    const element = gridRef.current

    if (!element || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateGridMetrics)

      return () => window.removeEventListener('resize', updateGridMetrics)
    }

    const observer = new ResizeObserver(() => updateGridMetrics())
    observer.observe(element)

    return () => observer.disconnect()
  }, [isReady, query, activeSet])

  useEffect(() => {
    setGridScrollTop(0)

    if (gridRef.current) {
      gridRef.current.scrollTop = 0
    }
  }, [activeSet, query])

  const selectedDetailRecord = useMemo(() => {
    if (selectedSearchRecord && !selectedBlock) {
      return selectedSearchRecord
    }

    if (selectedSearchRecord && selectedBlock) {
      const blockRecords = loadedBlocks[selectedBlock.id]

      if (!blockRecords) {
        return selectedSearchRecord
      }

      return blockRecords.find((record) => record.cp === selectedSearchRecord.cp) ?? selectedSearchRecord
    }

    if (directLookupCp === null || !directLookupBlock) {
      return null
    }

    const blockRecords = loadedBlocks[directLookupBlock.id]

    if (!blockRecords) {
      return null
    }

    return blockRecords.find((record) => record.cp === directLookupCp) ?? null
  }, [directLookupBlock, directLookupCp, loadedBlocks, selectedBlock, selectedSearchRecord])

  const directLookupResult = hasQuery && results.length === 0 && selectedDetailRecord ? [selectedDetailRecord] : []
  const displayResults = results.length > 0 ? results : directLookupResult
  const activeSetLabel = activeSet
    ? featuredSets.find((set) => set.id === activeSet)?.label ?? 'Featured set'
    : 'All sets'
  const totalMatchesLabel = results.length.toLocaleString()
  const copyFormats = selectedDetailRecord ? getCopyFormats(selectedDetailRecord) : []
  const isDirectLookupOnly = hasQuery && results.length === 0 && directLookupResult.length > 0
  const isDirectLookupLoading =
    hasQuery &&
    results.length === 0 &&
    directLookupCp !== null &&
    directLookupBlock !== undefined &&
    directLookupResult.length === 0
  const resultCardMinWidth = gridWidth <= 640 ? RESULT_CARD_MIN_WIDTH_NARROW : RESULT_CARD_MIN_WIDTH
  const virtualColumnCount = useMemo(() => {
    return Math.max(1, Math.floor((gridWidth + RESULT_GRID_GAP) / (resultCardMinWidth + RESULT_GRID_GAP)))
  }, [gridWidth, resultCardMinWidth])
  const totalRows = Math.ceil(displayResults.length / virtualColumnCount)
  const visibleRowCount = Math.max(1, Math.ceil(gridHeight / RESULT_ROW_HEIGHT))
  const startRow = clamp(
    Math.floor(gridScrollTop / RESULT_ROW_HEIGHT) - VIRTUAL_OVERSCAN_ROWS,
    0,
    Math.max(0, totalRows - 1),
  )
  const endRow = clamp(
    startRow + visibleRowCount + VIRTUAL_OVERSCAN_ROWS * 2,
    0,
    totalRows,
  )
  const visibleResults =
    displayResults.length > 80
      ? displayResults.slice(startRow * virtualColumnCount, endRow * virtualColumnCount)
      : displayResults
  const topSpacerHeight = displayResults.length > 80 ? startRow * RESULT_ROW_HEIGHT : 0
  const bottomSpacerHeight =
    displayResults.length > 80 ? Math.max(0, (totalRows - endRow) * RESULT_ROW_HEIGHT) : 0

  const focusResultElement = (cp: number): void => {
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`result-${cp}`)

      if (element instanceof HTMLButtonElement) {
        element.focus()
      }
    })
  }

  const selectResult = (cp: number, shouldFocus = false): void => {
    setSelectedCp(cp)

    if (shouldFocus) {
      focusResultElement(cp)
    }
  }

  const focusResultByOffset = (offset: number): void => {
    if (displayResults.length === 0) {
      return
    }

    const currentIndex = displayResults.findIndex((record) => record.cp === selectedDetailRecord?.cp)
    const nextIndex = currentIndex === -1 ? 0 : clamp(currentIndex + offset, 0, displayResults.length - 1)
    const nextRecord = displayResults[nextIndex]

    if (!nextRecord) {
      return
    }

    selectResult(nextRecord.cp, true)

    if (displayResults.length > 80 && gridRef.current) {
      const nextRow = Math.floor(nextIndex / virtualColumnCount)
      const rowTop = nextRow * RESULT_ROW_HEIGHT
      const rowBottom = rowTop + RESULT_ROW_HEIGHT

      if (rowTop < gridRef.current.scrollTop) {
        gridRef.current.scrollTop = rowTop
      } else if (rowBottom > gridRef.current.scrollTop + gridHeight) {
        gridRef.current.scrollTop = rowBottom - gridHeight
      }
    }
  }

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
              if (event.key === 'ArrowDown') {
                const first = displayResults[0]

                if (!first) {
                  return
                }

                event.preventDefault()
                selectResult(first.cp, true)
              }
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
            setQuery('')
            setActiveSet(undefined)
          }}
          disabled={!isReady}
        >
          Reset
        </button>
      </section>

      <main className="workspace">
        <aside className="panel side-panel">
          <div className="panel-heading">
            <h2>Featured Sets</h2>
            <p>Spec-driven shortcuts for high-frequency symbol families.</p>
          </div>

          <div className="chip-list">
            <button
              type="button"
              className={activeSet === undefined ? 'chip is-active' : 'chip'}
              onClick={() => setActiveSet(undefined)}
              disabled={!isReady}
            >
              <span>All characters</span>
            </button>

            {featuredSets.map((set) => {
              const count = searchIndex.filter((record) => record.featuredIn?.includes(set.id)).length

              return (
                <button
                  key={set.id}
                  type="button"
                  className={activeSet === set.id ? 'chip is-active' : 'chip'}
                  onClick={() => setActiveSet(set.id)}
                  disabled={!isReady}
                >
                  <span>{set.label}</span>
                  <small>{count.toLocaleString()}</small>
                </button>
              )
            })}
          </div>

          <div className="note-card">
            <h3>Data source</h3>
            <p>
              Generated from vendored UCD files in `vendor/unicode/{UNICODE_VERSION}/` and served as
              static JSON from `public/unicode/{UNICODE_VERSION}/`.
            </p>
          </div>

          {loadError ? (
            <div className="note-card note-error">
              <h3>Load issue</h3>
              <p>{loadError}</p>
            </div>
          ) : null}
        </aside>

        <section className="panel results-panel">
          <div className="panel-heading results-heading">
            <div>
              <h2>Results</h2>
              <p>
                {isReady ? `${totalMatchesLabel} matching characters.` : 'Loading generated search index.'}
              </p>
              <p id="search-status" className="search-status">
                {queryInput === query ? 'Search results are current.' : 'Waiting for typing to pause.'}
              </p>
            </div>
            <div className="inline-badges">
              <span>{activeSetLabel}</span>
              <span>{hasQuery ? 'Filtered' : 'Browse mode'}</span>
              {isDirectLookupOnly ? <span>Exact code point lookup</span> : null}
              {displayResults.length > 80 ? <span>Virtualized</span> : null}
            </div>
          </div>

          {!isReady ? (
            <div className="empty-state">
              <h3>Loading Unicode data</h3>
              <p>Building the search experience from generated static assets.</p>
            </div>
          ) : isDirectLookupLoading ? (
            <div className="empty-state">
              <h3>Loading exact lookup</h3>
              <p>Fetching the block file for {formatCodePointDisplay(directLookupCp ?? 0)}.</p>
            </div>
          ) : displayResults.length === 0 ? (
            <div className="empty-state">
              <h3>No matches yet</h3>
              <p>Try a direct character, a `U+` lookup, an alias like `nbsp`, or a block name.</p>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="results-scroller"
              onScroll={(event) => setGridScrollTop(event.currentTarget.scrollTop)}
            >
              {topSpacerHeight > 0 ? <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" /> : null}
              <div
                className="results-grid"
                style={{ gridTemplateColumns: `repeat(${virtualColumnCount}, minmax(0, 1fr))` }}
                role="listbox"
                aria-label="Character results"
                aria-activedescendant={selectedDetailRecord ? `result-${selectedDetailRecord.cp}` : undefined}
              >
                {visibleResults.map((record) => {
                  const isSelected = selectedDetailRecord?.cp === record.cp

                  return (
                    <button
                      id={`result-${record.cp}`}
                      key={record.cp}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      className={isSelected ? 'result-card is-selected' : 'result-card'}
                      onClick={() => selectResult(record.cp)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowRight') {
                          event.preventDefault()
                          focusResultByOffset(1)
                        }

                        if (event.key === 'ArrowLeft') {
                          event.preventDefault()
                          focusResultByOffset(-1)
                        }

                        if (event.key === 'ArrowDown') {
                          event.preventDefault()
                          focusResultByOffset(virtualColumnCount)
                        }

                        if (event.key === 'ArrowUp') {
                          event.preventDefault()
                          focusResultByOffset(-virtualColumnCount)
                        }

                        if (event.key === 'Home') {
                          event.preventDefault()
                          const first = displayResults[0]
                          if (first) {
                            selectResult(first.cp, true)
                          }
                        }

                        if (event.key === 'End') {
                          event.preventDefault()
                          const last = displayResults.at(-1)
                          if (last) {
                            selectResult(last.cp, true)
                          }
                        }
                      }}
                    >
                      <span className={`glyph-tile kind-${record.kind}`}>{getPrimaryGlyph(record)}</span>
                      <span className="result-meta">
                        <strong>{record.aliases?.[0] ?? record.name}</strong>
                        <span>{formatCodePointDisplay(record.cp)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {bottomSpacerHeight > 0 ? <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" /> : null}
            </div>
          )}
        </section>

        <aside className="panel detail-panel">
          {selectedDetailRecord ? (
            <>
              <div className="detail-preview">
                <div className={`detail-glyph kind-${selectedDetailRecord.kind}`}>
                  {getPrimaryGlyph(selectedDetailRecord)}
                </div>
                <div>
                  <p className="detail-caption">{getGlyphCaption(selectedDetailRecord)}</p>
                  <h2>{selectedDetailRecord.name}</h2>
                  <p className="detail-description">
                    {isLoadedCharacterRecord(selectedDetailRecord)
                      ? selectedDetailRecord.description ??
                        'Generated metadata is loaded, but this character does not need a custom description.'
                      : 'Loading block detail data for richer metadata.'}
                  </p>
                </div>
              </div>

              <div className="inline-badges detail-badges">
                <span>{formatCodePointDisplay(selectedDetailRecord.cp)}</span>
                <span>{selectedDetailRecord.block}</span>
                <span>{selectedDetailRecord.script}</span>
                {isLoadedCharacterRecord(selectedDetailRecord) ? (
                  <>
                    <span>{selectedDetailRecord.category}</span>
                    <span>{selectedDetailRecord.kind}</span>
                  </>
                ) : (
                  <span>{selectedDetailRecord.kind}</span>
                )}
              </div>

              <dl className="detail-list">
                <div>
                  <dt>Aliases</dt>
                  <dd>{selectedDetailRecord.aliases?.join(', ') ?? 'None'}</dd>
                </div>

                <div>
                  <dt>Unicode age</dt>
                  <dd>
                    {isLoadedCharacterRecord(selectedDetailRecord)
                      ? selectedDetailRecord.age ?? 'Unknown'
                      : 'Loading'}
                  </dd>
                </div>

                <div>
                  <dt>Flags</dt>
                  <dd>
                    {isLoadedCharacterRecord(selectedDetailRecord)
                      ? summarizeFlags(selectedDetailRecord)
                      : 'Loading'}
                  </dd>
                </div>

                <div>
                  <dt>Case map</dt>
                  <dd>
                    {isLoadedCharacterRecord(selectedDetailRecord)
                      ? summarizeCaseMap(selectedDetailRecord)
                      : 'Loading'}
                  </dd>
                </div>
              </dl>

              <div className="copy-section">
                <div className="panel-heading compact">
                  <h3>Copy Formats</h3>
                  <p>{copiedLabel ? `${copiedLabel} copied` : 'One-click output variants for common workflows.'}</p>
                </div>

                <div className="copy-grid">
                  {copyFormats.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="copy-card"
                      aria-label={`Copy ${entry.label} for ${selectedDetailRecord.name}`}
                      onClick={async () => {
                        await copyText(entry.value)
                        setCopiedLabel(entry.label)
                      }}
                    >
                      <span>{entry.label}</span>
                      <code>{entry.value}</code>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state detail-empty">
              <h3>No character selected</h3>
              <p>Choose a result to inspect metadata and copy formats.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
