import { useCallback, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { featuredSets } from '../data/featuredSets'
import type { ResultRecord, SearchRecord } from '../types/unicode'
import { useCharacterSearchResults } from './useCharacterSearchResults'
import { usePinnedCharacters } from './usePinnedCharacters'
import { useResultsPanelViewModel } from './useResultsPanelViewModel'
import type { ResultsPanelViewModel } from './useResultsPanelViewModel'
import { useSearchControls } from './useSearchControls'
import { useUnicodeData } from './useUnicodeData'

export type FeaturedSetItem = {
  count: number
  id: string
  label: string
}

type AppViewModel = {
  detailPanel: {
    isPinned: boolean
    onTogglePinned: () => void
    selectedDetailRecord: ResultRecord | null
  }
  featuredSetsPanel: {
    activeSet: string | undefined
    isReady: boolean
    items: FeaturedSetItem[]
    loadError: string | null
    onSelectSet: Dispatch<SetStateAction<string | undefined>>
  }
  header: {
    blockCount: number
    indexedCharacterCount: number
  }
  pinnedPanel: {
    items: ResultRecord[]
    onSelectPinned: (cp: number) => void
    selectedCp: number | null
  }
  resultsPanel: {
    model: ResultsPanelViewModel
  }
  searchPanel: {
    disabled: boolean
    onQueryInputChange: Dispatch<SetStateAction<string>>
    onReset: () => void
    onSelectFirstResult: () => void
    queryInput: string
  }
}

export function useAppViewModel(): AppViewModel {
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
  const { isPinned, pinnedRecords, togglePinned } = usePinnedCharacters()
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
  const searchIndexByCp = useMemo(
    () => new Map<number, SearchRecord>(searchIndex.map((record) => [record.cp, record])),
    [searchIndex],
  )
  const loadedRecordsByCp = useMemo(() => {
    const map = new Map<number, ResultRecord>()

    for (const records of Object.values(loadedBlocks)) {
      for (const record of records) {
        map.set(record.cp, record)
      }
    }

    return map
  }, [loadedBlocks])
  const selectedPinnedRecord = useMemo(
    () =>
      selectedCp !== null
        ? pinnedRecords.find((record) => record.cp === selectedCp) ?? null
        : null,
    [pinnedRecords, selectedCp],
  )
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
    detachedSelectionRecord: selectedPinnedRecord,
    hasQuery,
    loadedBlocks,
    loadBlock,
    query,
    searchIndex,
    selectedCp,
    setSelectedCp,
  })
  const selectedDetailCp = selectedDetailRecord?.cp ?? null
  const selectedResultsCp = useMemo(
    () =>
      selectedDetailCp !== null && displayResults.some((record) => record.cp === selectedDetailCp)
        ? selectedDetailCp
        : null,
    [displayResults, selectedDetailCp],
  )
  const { panel: resultsModel, selectFirstResult } = useResultsPanelViewModel({
    activeSet,
    displayResults,
    directLookupCp,
    hasQuery,
    isDirectLookupLoading,
    isDirectLookupOnly,
    isReady,
    query,
    resultsCount: results.length,
    searchStatusText,
    selectedCp: selectedResultsCp,
    setSelectedCp,
  })
  const pinnedItems = useMemo(
    () =>
      pinnedRecords.map(
        (record) => loadedRecordsByCp.get(record.cp) ?? searchIndexByCp.get(record.cp) ?? record,
      ),
    [loadedRecordsByCp, pinnedRecords, searchIndexByCp],
  )
  const selectPinnedCharacter = useCallback(
    (cp: number): void => {
      resetSearch()
      setSelectedCp(cp)
    },
    [resetSearch, setSelectedCp],
  )
  const togglePinnedSelection = useCallback((): void => {
    if (!selectedDetailRecord) {
      return
    }

    togglePinned(selectedDetailRecord)
  }, [selectedDetailRecord, togglePinned])

  const featuredSetItems = useMemo(() => {
    const countsById = new Map<string, number>()

    for (const record of searchIndex) {
      for (const setId of record.featuredIn ?? []) {
        countsById.set(setId, (countsById.get(setId) ?? 0) + 1)
      }
    }

    return featuredSets.map((set) => ({
      count: countsById.get(set.id) ?? 0,
      id: set.id,
      label: set.label,
    }))
  }, [searchIndex])

  return {
    detailPanel: {
      isPinned: selectedDetailCp !== null ? isPinned(selectedDetailCp) : false,
      onTogglePinned: togglePinnedSelection,
      selectedDetailRecord,
    },
    featuredSetsPanel: {
      activeSet,
      isReady,
      items: featuredSetItems,
      loadError,
      onSelectSet: setActiveSet,
    },
    header: {
      blockCount: blockIndex.length,
      indexedCharacterCount: searchIndex.length,
    },
    pinnedPanel: {
      items: pinnedItems,
      onSelectPinned: selectPinnedCharacter,
      selectedCp,
    },
    resultsPanel: {
      model: resultsModel,
    },
    searchPanel: {
      disabled: !isReady,
      onQueryInputChange: setQueryInput,
      onReset: resetSearch,
      onSelectFirstResult: selectFirstResult,
      queryInput,
    },
  }
}
