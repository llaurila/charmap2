import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { ResultRecord } from '../types/unicode'
import { moveSelection, RESULT_ROW_HEIGHT } from '../utils/resultState'

type UseResultNavigationOptions = {
  displayResults: ResultRecord[]
  gridHeight: number
  gridRef: RefObject<HTMLDivElement | null>
  selectedCp: number | null
  setSelectedCp: React.Dispatch<React.SetStateAction<number | null>>
  virtualColumnCount: number
}

type UseResultNavigationResult = {
  focusResultByOffset: (offset: number) => void
  selectResult: (cp: number, shouldFocus?: boolean) => void
}

export function useResultNavigation({
  displayResults,
  gridHeight,
  gridRef,
  selectedCp,
  setSelectedCp,
  virtualColumnCount,
}: UseResultNavigationOptions): UseResultNavigationResult {
  const selectResult = useCallback(
    (cp: number, shouldFocus = false): void => {
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
    },
    [setSelectedCp],
  )

  const focusResultByOffset = useCallback(
    (offset: number): void => {
      const nextRecord = moveSelection(displayResults, selectedCp, offset)

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
    },
    [displayResults, gridHeight, gridRef, selectResult, selectedCp, virtualColumnCount],
  )

  return {
    focusResultByOffset,
    selectResult,
  }
}
