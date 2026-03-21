import { useCallback, useEffect, useRef, useState } from 'react'
import { loadBlockIndex, loadBlockRecords, loadSearchIndex } from '../data/unicode'
import type { BlockIndexEntry, LoadedBlocks, SearchRecord } from '../types/unicode'

type UseUnicodeDataResult = {
  blockIndex: BlockIndexEntry[]
  isReady: boolean
  loadedBlocks: LoadedBlocks
  loadBlock: (block: BlockIndexEntry | undefined) => void
  loadError: string | null
  searchIndex: SearchRecord[]
  selectedCp: number | null
  setSelectedCp: React.Dispatch<React.SetStateAction<number | null>>
}

export function useUnicodeData(): UseUnicodeDataResult {
  const [searchIndex, setSearchIndex] = useState<SearchRecord[]>([])
  const [blockIndex, setBlockIndex] = useState<BlockIndexEntry[]>([])
  const [loadedBlocks, setLoadedBlocks] = useState<LoadedBlocks>({})
  const [selectedCp, setSelectedCp] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    Promise.all([loadSearchIndex(), loadBlockIndex()])
      .then(([searchRecords, blockEntries]) => {
        if (isCancelled) {
          return
        }

        setSearchIndex(searchRecords)
        setBlockIndex(blockEntries)
        setSelectedCp((current) => current ?? searchRecords[0]?.cp ?? null)
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setLoadError(error instanceof Error ? error.message : String(error))
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const loadBlock = useCallback((block: BlockIndexEntry | undefined): void => {
    if (!block || loadedBlocks[block.id]) {
      return
    }

    loadBlockRecords(block.file)
      .then((records) => {
        if (!isMountedRef.current) {
          return
        }

        setLoadedBlocks((current) => ({
          ...current,
          [block.id]: records,
        }))
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) {
          return
        }

        setLoadError(error instanceof Error ? error.message : String(error))
      })
  }, [loadedBlocks])

  return {
    blockIndex,
    isReady: searchIndex.length > 0,
    loadedBlocks,
    loadBlock,
    loadError,
    searchIndex,
    selectedCp,
    setSelectedCp,
  }
}
