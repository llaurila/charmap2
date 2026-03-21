import { useCallback, useEffect, useMemo, useState } from 'react'

const QUERY_DEBOUNCE_MS = 500

type UseSearchControlsResult = {
  activeSet: string | undefined
  hasQuery: boolean
  query: string
  queryInput: string
  resetSearch: () => void
  searchStatusText: string
  setActiveSet: React.Dispatch<React.SetStateAction<string | undefined>>
  setQueryInput: React.Dispatch<React.SetStateAction<string>>
}

export function useSearchControls(): UseSearchControlsResult {
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
    activeSet,
    hasQuery,
    query,
    queryInput,
    resetSearch,
    searchStatusText,
    setActiveSet,
    setQueryInput,
  }
}
