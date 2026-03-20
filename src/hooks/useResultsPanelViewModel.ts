import { useCallback, useMemo, useRef } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useResultNavigation } from './useResultNavigation'
import { useResultsGrid } from './useResultsGrid'
import type { ResultRecord } from '../types/unicode'
import { getVirtualizationState } from '../utils/resultState'
import { getActiveSetText, getResultsStatusText } from '../utils/resultsViewModel'

export type ResultsPanelHeaderViewModel = {
  activeSetText: string
  hasQuery: boolean
  isDirectLookupOnly: boolean
  isVirtualized: boolean
  resultsStatusText: string
  searchStatusText: string
}

export type ResultsPanelBodyViewModel = {
  bottomSpacerHeight: number
  directLookupCp: number | null
  displayResults: ResultRecord[]
  gridRef: RefObject<HTMLDivElement | null>
  isDirectLookupLoading: boolean
  isReady: boolean
  onResultCardKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  onScrollTopChange: (scrollTop: number) => void
  onSelectResult: (cp: number, shouldFocus?: boolean) => void
  selectedCp: number | null
  topSpacerHeight: number
  virtualColumnCount: number
  visibleResults: ResultRecord[]
}

export type ResultsPanelViewModel = {
  body: ResultsPanelBodyViewModel
  header: ResultsPanelHeaderViewModel
}

type UseResultsPanelViewModelOptions = {
  activeSet: string | undefined
  directLookupCp: number | null
  displayResults: ResultRecord[]
  hasQuery: boolean
  isDirectLookupLoading: boolean
  isDirectLookupOnly: boolean
  isReady: boolean
  query: string
  resultsCount: number
  searchStatusText: string
  selectedCp: number | null
  setSelectedCp: Dispatch<SetStateAction<number | null>>
}

type UseResultsPanelViewModelResult = {
  panel: ResultsPanelViewModel
  selectFirstResult: () => void
}

export function useResultsPanelViewModel({
  activeSet,
  directLookupCp,
  displayResults,
  hasQuery,
  isDirectLookupLoading,
  isDirectLookupOnly,
  isReady,
  query,
  resultsCount,
  searchStatusText,
  selectedCp,
  setSelectedCp,
}: UseResultsPanelViewModelOptions): UseResultsPanelViewModelResult {
  const gridRef = useRef<HTMLDivElement | null>(null)
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
  const { handleResultCardKeyDown, selectResult } = useResultNavigation({
    displayResults,
    gridHeight,
    gridRef,
    selectedCp,
    setSelectedCp,
    virtualColumnCount,
  })

  const selectFirstResult = useCallback((): void => {
    const first = displayResults[0]

    if (!first) {
      return
    }

    selectResult(first.cp, true)
  }, [displayResults, selectResult])

  const panel = useMemo(
    () => ({
      body: {
        bottomSpacerHeight,
        directLookupCp,
        displayResults,
        gridRef,
        isDirectLookupLoading,
        isReady,
        onResultCardKeyDown: handleResultCardKeyDown,
        onScrollTopChange: setGridScrollTop,
        onSelectResult: selectResult,
        selectedCp,
        topSpacerHeight,
        virtualColumnCount,
        visibleResults,
      },
      header: {
        activeSetText: getActiveSetText(activeSet),
        hasQuery,
        isDirectLookupOnly,
        isVirtualized: displayResults.length > 80,
        resultsStatusText: getResultsStatusText(isReady, resultsCount),
        searchStatusText,
      },
    }),
    [
      activeSet,
      bottomSpacerHeight,
      directLookupCp,
      displayResults,
      gridRef,
      handleResultCardKeyDown,
      hasQuery,
      isDirectLookupLoading,
      isDirectLookupOnly,
      isReady,
      resultsCount,
      searchStatusText,
      selectResult,
      selectedCp,
      setGridScrollTop,
      topSpacerHeight,
      virtualColumnCount,
      visibleResults,
    ],
  )

  return {
    panel,
    selectFirstResult,
  }
}
