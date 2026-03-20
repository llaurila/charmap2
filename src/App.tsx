import { useEffect, useMemo, useState } from 'react'
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

export default function App() {
  const [query, setQuery] = useState('')
  const [activeSet, setActiveSet] = useState<string | undefined>()
  const [searchIndex, setSearchIndex] = useState<SearchRecord[]>([])
  const [blockIndex, setBlockIndex] = useState<BlockIndexEntry[]>([])
  const [loadedBlocks, setLoadedBlocks] = useState<Record<string, CharacterRecord[]>>({})
  const [selectedCp, setSelectedCp] = useState<number | null>(null)
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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
    if (query.trim() && results.length === 0) {
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

  const requestedBlock = selectedBlock ?? (query.trim() ? directLookupBlock : undefined)

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

    const timeout = window.setTimeout(() => setCopiedLabel(null), 1600)
    return () => window.clearTimeout(timeout)
  }, [copiedLabel])

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

  const resultList = results.slice(0, 240)
  const directLookupResult =
    query.trim() && resultList.length === 0 && selectedDetailRecord ? [selectedDetailRecord] : []
  const displayResults = resultList.length > 0 ? resultList : directLookupResult
  const activeSetLabel = activeSet
    ? featuredSets.find((set) => set.id === activeSet)?.label ?? 'Featured set'
    : 'All sets'
  const totalMatchesLabel = results.length.toLocaleString()
  const isReady = searchIndex.length > 0
  const copyFormats = selectedDetailRecord ? getCopyFormats(selectedDetailRecord) : []
  const isDirectLookupOnly = query.trim().length > 0 && resultList.length === 0 && directLookupResult.length > 0
  const isDirectLookupLoading =
    query.trim().length > 0 &&
    resultList.length === 0 &&
    directLookupCp !== null &&
    directLookupBlock !== undefined &&
    directLookupResult.length === 0

  return (
    <div className="app-shell">
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
          <span>Static hosting</span>
        </div>
      </header>

      <section className="search-panel">
        <label className="search-field">
          <span className="sr-only">Search characters</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by character, U+00A0, alias, block, script, or keyword"
            disabled={!isReady}
          />
        </label>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
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
            </div>
            <div className="inline-badges">
              <span>{activeSetLabel}</span>
              <span>{query.trim() ? 'Filtered' : 'Browse mode'}</span>
              {isDirectLookupOnly ? <span>Exact code point lookup</span> : null}
              {results.length > resultList.length ? <span>Showing first {resultList.length}</span> : null}
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
            <div className="results-grid" role="list" aria-label="Character results">
              {displayResults.map((record) => {
                const isSelected = selectedDetailRecord?.cp === record.cp

                return (
                  <button
                    key={record.cp}
                    type="button"
                    role="listitem"
                    className={isSelected ? 'result-card is-selected' : 'result-card'}
                    onClick={() => setSelectedCp(record.cp)}
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
