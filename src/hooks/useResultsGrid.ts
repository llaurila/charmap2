import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

type UseResultsGridOptions = {
  activeSet: string | undefined
  gridRef: RefObject<HTMLDivElement | null>
  isReady: boolean
  query: string
}

type UseResultsGridResult = {
  gridHeight: number
  gridScrollTop: number
  gridWidth: number
  setGridScrollTop: React.Dispatch<React.SetStateAction<number>>
}

export function useResultsGrid({
  activeSet,
  gridRef,
  isReady,
  query,
}: UseResultsGridOptions): UseResultsGridResult {
  const [gridHeight, setGridHeight] = useState(720)
  const [gridWidth, setGridWidth] = useState(900)
  const [gridScrollTop, setGridScrollTop] = useState(0)

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
  }, [activeSet, gridRef, isReady, query])

  useEffect(() => {
    setGridScrollTop(0)

    if (gridRef.current) {
      gridRef.current.scrollTop = 0
    }
  }, [activeSet, gridRef, query])

  return {
    gridHeight,
    gridScrollTop,
    gridWidth,
    setGridScrollTop,
  }
}
