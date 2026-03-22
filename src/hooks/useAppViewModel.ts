import { useCallback, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { featuredSets } from '../data/featuredSets'
import type { AppMode, ResultRecord, SearchRecord } from '../types/unicode'
import { useTextInspector } from './useTextInspector'
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
  appMode: AppMode
  detailPanel: {
    isPinned: boolean
    onTogglePinned: () => void
    selectedDetailRecord: ResultRecord | null
  }
  featuredSetsPanel: {
    appMode: AppMode
    activeSet: string | undefined
    isReady: boolean
    items: FeaturedSetItem[]
    loadError: string | null
    onSelectSet: Dispatch<SetStateAction<string | undefined>>
  }
  header: {
    appMode: AppMode
    blockCount: number
    indexedCharacterCount: number
    inspectorInput: string
    onInspectorInputChange: (value: string) => void
    onInspectorReset: () => void
    inspectorMenu?: {
      actions: ReturnType<typeof useTextInspector>['actions']
      filter: ReturnType<typeof useTextInspector>['filter']
      hasInput: boolean
      isOpen: boolean
      onCopyAction: ReturnType<typeof useTextInspector>['onCopyAction']
      onSelectFilter: ReturnType<typeof useTextInspector>['onSelectFilter']
      onToggle: ReturnType<typeof useTextInspector>['onToggleMenu']
    }
  }
  pinnedPanel: {
    items: ResultRecord[]
    onSelectPinned: (cp: number) => void
    selectedCp: number | null
  }
  setAppMode: Dispatch<SetStateAction<AppMode>>
  resultsPanel: {
    model: ResultsPanelViewModel
  }
  searchPanel: {
    appMode: AppMode
    disabled: boolean
    onAppModeChange: Dispatch<SetStateAction<AppMode>>
    onQueryInputChange: Dispatch<SetStateAction<string>>
    onReset: () => void
    onSelectFirstResult: () => void
    queryInput: string
  }
  textInspector: ReturnType<typeof useTextInspector>
}

export function useAppViewModel(): AppViewModel {
  const {
    appMode,
    activeSet,
    hasQuery,
    query,
    queryInput,
    resetSearch,
    searchStatusText,
    setAppMode,
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
  const textInspector = useTextInspector({
    loadedRecordsByCp,
    searchIndex,
    setSelectedCp,
  })
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
    detachedSelectionRecord:
      appMode === 'inspector' ? textInspector.selectedRecord : selectedPinnedRecord,
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
    appMode,
    detailPanel: {
      isPinned: selectedDetailCp !== null ? isPinned(selectedDetailCp) : false,
      onTogglePinned: togglePinnedSelection,
      selectedDetailRecord,
    },
    featuredSetsPanel: {
      appMode,
      activeSet,
      isReady,
      items: featuredSetItems,
      loadError,
      onSelectSet: setActiveSet,
    },
    header: {
      appMode,
      blockCount: blockIndex.length,
      indexedCharacterCount: searchIndex.length,
      inspectorInput: textInspector.input,
      onInspectorInputChange: textInspector.onInputChange,
      onInspectorReset: textInspector.onReset,
      inspectorMenu:
        appMode === 'inspector'
          ? {
              actions: textInspector.actions,
              filter: textInspector.filter,
              hasInput: textInspector.input.length > 0,
              isOpen: textInspector.isMenuOpen,
              onCopyAction: textInspector.onCopyAction,
              onSelectFilter: textInspector.onSelectFilter,
              onToggle: textInspector.onToggleMenu,
            }
          : undefined,
    },
    pinnedPanel: {
      items: pinnedItems,
      onSelectPinned: selectPinnedCharacter,
      selectedCp,
    },
    setAppMode,
    resultsPanel: {
      model: resultsModel,
    },
    searchPanel: {
      appMode,
      disabled: !isReady,
      onAppModeChange: setAppMode,
      onQueryInputChange: setQueryInput,
      onReset: resetSearch,
      onSelectFirstResult: selectFirstResult,
      queryInput,
    },
    textInspector,
  }
}
