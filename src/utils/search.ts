import type { SearchRecord } from '../types/unicode'

type SearchableRecord = Pick<
  SearchRecord,
  'cp' | 'name' | 'aliases' | 'block' | 'script' | 'keywords' | 'featuredIn'
>

type RankedMatch<T extends SearchableRecord> = {
  record: T
  score: number
}

const isFuzzySubsequenceMatch = (query: string, target: string): boolean => {
  const compactQuery = query.replace(/\s+/g, '')
  const compactTarget = target.replace(/\s+/g, '')

  if (compactQuery.length < 3 || compactQuery.length > compactTarget.length) {
    return false
  }

  let targetIndex = 0

  for (const character of compactQuery) {
    targetIndex = compactTarget.indexOf(character, targetIndex)

    if (targetIndex === -1) {
      return false
    }

    targetIndex += 1
  }

  return true
}

export const normalizeSearchTerm = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/[\s_-]+/g, ' ')

export const parseCodePointQuery = (value: string): number | null => {
  const trimmed = value.trim()

  const unicodeMatch = trimmed.match(/^u\+([0-9a-f]{2,6})$/i)
  const unicodeHex = unicodeMatch?.[1]
  if (unicodeHex) {
    return Number.parseInt(unicodeHex, 16)
  }

  const hexMatch = trimmed.match(/^0x([0-9a-f]{2,6})$/i)
  const prefixedHex = hexMatch?.[1]
  if (prefixedHex) {
    return Number.parseInt(prefixedHex, 16)
  }

  const plainHexMatch = trimmed.match(/^[0-9a-f]{2,6}$/i)
  if (plainHexMatch) {
    return Number.parseInt(trimmed, 16)
  }

  return null
}

export const getSingleCodePointQuery = (value: string): number | null => {
  if (!value) {
    return null
  }

  const parsedCodePoint = parseCodePointQuery(value)

  if (parsedCodePoint !== null) {
    return parsedCodePoint
  }

  const codePoints = Array.from(value)

  if (codePoints.length !== 1) {
    return null
  }

  return codePoints[0]?.codePointAt(0) ?? null
}

const rankRecord = <T extends SearchableRecord>(record: T, query: string): number | null => {
  const character = String.fromCodePoint(record.cp)
  const codePoint = parseCodePointQuery(query)
  const pastedCharacter = getSingleCodePointQuery(query)
  const normalizedQuery = normalizeSearchTerm(query)
  const nameTerms = [record.name, ...(record.aliases ?? [])]
  const metadataTerms = [record.block, record.script, ...(record.keywords ?? [])]
  const normalizedNameTerms = nameTerms.map(normalizeSearchTerm)
  const normalizedMetadataTerms = metadataTerms.map(normalizeSearchTerm)
  const normalizedTerms = [...normalizedNameTerms, ...normalizedMetadataTerms]

  if (!query && pastedCharacter === null) {
    return 0
  }

  if (pastedCharacter === record.cp && query === character) {
    return 100
  }

  if (codePoint === record.cp) {
    return 90
  }

  if (normalizedNameTerms.some((term) => term === normalizedQuery)) {
    return 80
  }

  if (normalizedNameTerms.some((term) => term.startsWith(normalizedQuery))) {
    return 70
  }

  if (normalizedMetadataTerms.some((term) => term === normalizedQuery)) {
    return 65
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean)
  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => normalizedTerms.some((term) => term.includes(token)))
  ) {
    return 60
  }

  if (normalizedTerms.some((term) => isFuzzySubsequenceMatch(normalizedQuery, term))) {
    return 50
  }

  return null
}

export const searchCharacters = <T extends SearchableRecord>(
  records: T[],
  query: string,
  activeSet?: string,
): T[] => {
  const scopedRecords = activeSet
    ? records.filter((record) => record.featuredIn?.includes(activeSet))
    : records

  if (!query && getSingleCodePointQuery(query) === null) {
    return scopedRecords
  }

  const ranked: RankedMatch<T>[] = scopedRecords
    .map((record) => ({
      record,
      score: rankRecord(record, query) ?? -1,
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.record.cp - right.record.cp
    })

  return ranked.map((entry) => entry.record)
}
