import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CharacterKind, ResultRecord, SearchRecord } from '../types/unicode'

export const PINNED_STORAGE_KEY = 'charmap2:pins:v1'

const CHARACTER_KINDS = new Set<CharacterKind>([
  'glyph',
  'combining',
  'whitespace',
  'format',
  'control',
])

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

const isValidKind = (value: unknown): value is CharacterKind =>
  typeof value === 'string' && CHARACTER_KINDS.has(value as CharacterKind)

const isOptionalStringArray = (value: unknown): boolean =>
  value === undefined || isStringArray(value)

const hasSearchRecordShape = (record: Partial<Record<keyof SearchRecord, unknown>>): boolean =>
  Number.isInteger(record.cp) &&
  typeof record.name === 'string' &&
  typeof record.block === 'string' &&
  typeof record.script === 'string' &&
  isValidKind(record.kind) &&
  isOptionalStringArray(record.aliases) &&
  isOptionalStringArray(record.featuredIn) &&
  isOptionalStringArray(record.keywords)

const isSearchRecord = (value: unknown): value is SearchRecord =>
  !!value && typeof value === 'object' && hasSearchRecordShape(value as SearchRecord)

const dedupePinnedRecords = (records: SearchRecord[]): SearchRecord[] => {
  const seen = new Set<number>()
  const deduped: SearchRecord[] = []

  for (const record of records) {
    if (seen.has(record.cp)) {
      continue
    }

    seen.add(record.cp)
    deduped.push(record)
  }

  return deduped
}

const readPinnedRecords = (): SearchRecord[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(PINNED_STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const parsed = JSON.parse(storedValue)

    if (!Array.isArray(parsed)) {
      return []
    }

    return dedupePinnedRecords(parsed.filter(isSearchRecord))
  } catch {
    return []
  }
}

const toPinnedRecord = (record: ResultRecord): SearchRecord => ({
  aliases: record.aliases,
  block: record.block,
  cp: record.cp,
  featuredIn: record.featuredIn,
  keywords: record.keywords,
  kind: record.kind,
  name: record.name,
  script: record.script,
})

type UsePinnedCharactersResult = {
  isPinned: (cp: number) => boolean
  pinnedRecords: SearchRecord[]
  togglePinned: (record: ResultRecord) => void
}

export function usePinnedCharacters(): UsePinnedCharactersResult {
  const [pinnedRecords, setPinnedRecords] = useState<SearchRecord[]>(() => readPinnedRecords())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      if (pinnedRecords.length === 0) {
        window.localStorage.removeItem(PINNED_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedRecords))
    } catch {
      return
    }
  }, [pinnedRecords])

  const pinnedCps = useMemo(
    () => new Set(pinnedRecords.map((record) => record.cp)),
    [pinnedRecords],
  )

  const isPinned = useCallback((cp: number): boolean => pinnedCps.has(cp), [pinnedCps])

  const togglePinned = useCallback((record: ResultRecord): void => {
    const pinnedRecord = toPinnedRecord(record)

    setPinnedRecords((current) => {
      if (current.some((entry) => entry.cp === pinnedRecord.cp)) {
        return current.filter((entry) => entry.cp !== pinnedRecord.cp)
      }

      return [pinnedRecord, ...current.filter((entry) => entry.cp !== pinnedRecord.cp)]
    })
  }, [])

  return {
    isPinned,
    pinnedRecords,
    togglePinned,
  }
}
