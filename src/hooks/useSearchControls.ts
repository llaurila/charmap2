import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppMode } from '../types/unicode'

const QUERY_DEBOUNCE_MS = 500

type UseSearchControlsResult = {
  appMode: AppMode
  activeSet: string | undefined
  hasQuery: boolean
  query: string
  queryInput: string
  resetSearch: () => void
  searchStatusText: string
  setAppMode: React.Dispatch<React.SetStateAction<AppMode>>
  setActiveSet: React.Dispatch<React.SetStateAction<string | undefined>>
  setQueryInput: React.Dispatch<React.SetStateAction<string>>
}

export function useSearchControls(): UseSearchControlsResult {
  const [appMode, setAppMode] = useState<AppMode>('search')
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [activeSet, setActiveSet] = useState<string | undefined>()

  useEffect(() => {
    if (queryInput === query) {
      return
    }

    const timeout = window.setTimeout(() => {
      setQuery(queryInput)
    }, QUERY_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [query, queryInput])

  const hasQuery = query.length > 0
  const searchStatusText = useMemo(
    () =>
      queryInput === query ? 'Search results are current.' : 'Waiting for typing to pause.',
    [query, queryInput],
  )

  const resetSearch = useCallback((): void => {
    setQueryInput('')
    setQuery('')
    setActiveSet(undefined)
  }, [])

  return {
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
  }
}
