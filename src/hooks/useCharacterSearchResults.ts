import { useEffect, useMemo } from 'react'
import { findBlockForCodePoint } from '../data/unicode'
import type { BlockIndexEntry, LoadedBlocks, ResultRecord, SearchRecord } from '../types/unicode'
import {
  getDisplayResults,
  getIsDirectLookupLoading,
  getIsDirectLookupOnly,
} from '../utils/resultsViewModel'
import { getSingleCodePointQuery, searchCharacters } from '../utils/search'
import { getSelectedDetailRecord, getSelectedSearchRecord } from '../utils/selectionModel'

type UseCharacterSearchResultsOptions = {
  activeSet: string | undefined
  blockIndex: BlockIndexEntry[]
  detachedSelectionRecord: SearchRecord | null
  hasQuery: boolean
  loadedBlocks: LoadedBlocks
  loadBlock: (block: BlockIndexEntry | undefined) => void
  query: string
  searchIndex: SearchRecord[]
  selectedCp: number | null
  setSelectedCp: React.Dispatch<React.SetStateAction<number | null>>
}

type UseCharacterSearchResultsResult = {
  directLookupCp: number | null
  displayResults: ResultRecord[]
  isDirectLookupLoading: boolean
  isDirectLookupOnly: boolean
  results: SearchRecord[]
  selectedDetailRecord: ResultRecord | null
}

export function useCharacterSearchResults({
  activeSet,
  blockIndex,
  detachedSelectionRecord,
  hasQuery,
  loadedBlocks,
  loadBlock,
  query,
  searchIndex,
  selectedCp,
  setSelectedCp,
}: UseCharacterSearchResultsOptions): UseCharacterSearchResultsResult {
  const results = useMemo(
    () => searchCharacters(searchIndex, query, activeSet),
    [activeSet, query, searchIndex],
  )
  const hasDetachedSelection = useMemo(
    () =>
      !hasQuery &&
      activeSet === undefined &&
      selectedCp !== null &&
      detachedSelectionRecord?.cp === selectedCp &&
      !results.some((record) => record.cp === selectedCp),
    [activeSet, detachedSelectionRecord, hasQuery, results, selectedCp],
  )

  useEffect(() => {
    if (results.length === 0) {
      return
    }

    const currentSelectionExists =
      selectedCp !== null && results.some((record) => record.cp === selectedCp)

    if (!currentSelectionExists && !hasDetachedSelection) {
      setSelectedCp(results[0]?.cp ?? null)
    }
  }, [hasDetachedSelection, results, selectedCp, setSelectedCp])

  const selectedSearchRecord = useMemo(
    () =>
      hasDetachedSelection
        ? detachedSelectionRecord
        : getSelectedSearchRecord(results, searchIndex, selectedCp, hasQuery),
    [detachedSelectionRecord, hasDetachedSelection, hasQuery, results, searchIndex, selectedCp],
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
  const displayResults = useMemo(
    () => getDisplayResults(results, hasQuery, selectedDetailRecord),
    [hasQuery, results, selectedDetailRecord],
  )
  const isDirectLookupOnly = useMemo(
    () => getIsDirectLookupOnly(hasQuery, results.length, displayResults.length),
    [displayResults.length, hasQuery, results.length],
  )
  const isDirectLookupLoading = useMemo(
    () =>
      getIsDirectLookupLoading({
        directLookupBlock,
        directLookupCp,
        displayResultsLength: displayResults.length,
        hasQuery,
        resultsLength: results.length,
      }),
    [directLookupBlock, directLookupCp, displayResults.length, hasQuery, results.length],
  )

  return {
    directLookupCp,
    displayResults,
    isDirectLookupLoading,
    isDirectLookupOnly,
    results,
    selectedDetailRecord,
  }
}
