import { useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { featuredSets } from '../data/featuredSets'
import type { ResultRecord } from '../types/unicode'
import { useCharacterSearchResults } from './useCharacterSearchResults'
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
  const selectedDetailCp = selectedDetailRecord?.cp ?? null
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
    selectedCp: selectedDetailCp,
    setSelectedCp,
  })

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
