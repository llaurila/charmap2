import { useCallback, useMemo, useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue'

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
  const [activeSet, setActiveSet] = useState<string | undefined>()
  const query = useDebouncedValue(queryInput, 500)

  const hasQuery = query.length > 0
  const searchStatusText = useMemo(
    () =>
      queryInput === query ? 'Search results are current.' : 'Waiting for typing to pause.',
    [query, queryInput],
  )

  const resetSearch = useCallback((): void => {
    setQueryInput('')
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
