import type { SearchRecord } from '../types/unicode'

type SearchableRecord = Pick<
  SearchRecord,
  'cp' | 'name' | 'aliases' | 'block' | 'script' | 'keywords' | 'featuredIn'
>

type RankedMatch<T extends SearchableRecord> = {
  record: T
  score: number
}

type SearchContext<T extends SearchableRecord> = {
  record: T
  rawQuery: string
  character: string
  codePoint: number | null
  pastedCharacter: number | null
  normalizedQuery: string
  normalizedName: string
  normalizedAliases: string[]
  normalizedKeywords: string[]
  normalizedBlock: string
  normalizedScript: string
  normalizedTerms: string[]
  queryTokens: string[]
}

const fuzzySubsequenceScore = (query: string, target: string): number | null => {
  const compactQuery = query.replace(/\s+/g, '')
  const compactTarget = target.replace(/\s+/g, '')

  if (compactQuery.length < 3 || compactQuery.length > compactTarget.length) {
    return null
  }

  let targetIndex = 0
  let totalGap = 0

  for (const character of compactQuery) {
    const nextIndex = compactTarget.indexOf(character, targetIndex)

    if (nextIndex === -1) {
      return null
    }

    totalGap += nextIndex - targetIndex
    targetIndex = nextIndex + 1
  }

  return Math.max(1, 48 - (compactTarget.length - compactQuery.length) - totalGap)
}

export const normalizeSearchTerm = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/[\s_-]+/g, ' ')

const parseMatchingCodePoint = (value: string, expression: RegExp): number | null => {
  const match = expression.exec(value)
  const digits = match?.[1]
  return digits ? Number.parseInt(digits, 16) : null
}

export const parseCodePointQuery = (value: string): number | null => {
  const trimmed = value.trim()

  return (
    parseMatchingCodePoint(trimmed, /^u\+([0-9a-f]{2,6})$/i) ??
    parseMatchingCodePoint(trimmed, /^0x([0-9a-f]{2,6})$/i) ??
    (/^[0-9a-f]{2,6}$/i.test(trimmed) ? Number.parseInt(trimmed, 16) : null)
  )
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

const normalizeRecordTerms = (record: SearchableRecord) => ({
  normalizedName: normalizeSearchTerm(record.name),
  normalizedAliases: (record.aliases ?? []).map(normalizeSearchTerm),
  normalizedKeywords: (record.keywords ?? []).map(normalizeSearchTerm),
  normalizedBlock: normalizeSearchTerm(record.block),
  normalizedScript: normalizeSearchTerm(record.script),
})

const createSearchContext = <T extends SearchableRecord>(
  record: T,
  query: string,
): SearchContext<T> => {
  const terms = normalizeRecordTerms(record)
  const normalizedQuery = normalizeSearchTerm(query)
  const queryTokens = normalizedQuery.split(' ').filter(Boolean)

  return {
    record,
    rawQuery: query,
    character: String.fromCodePoint(record.cp),
    codePoint: parseCodePointQuery(query),
    pastedCharacter: getSingleCodePointQuery(query),
    normalizedQuery,
    normalizedName: terms.normalizedName,
    normalizedAliases: terms.normalizedAliases,
    normalizedKeywords: terms.normalizedKeywords,
    normalizedBlock: terms.normalizedBlock,
    normalizedScript: terms.normalizedScript,
    normalizedTerms: [
      terms.normalizedName,
      ...terms.normalizedAliases,
      terms.normalizedBlock,
      terms.normalizedScript,
      ...terms.normalizedKeywords,
    ],
    queryTokens,
  }
}

const matchesEveryToken = (tokens: string[], value: string): boolean =>
  tokens.length > 0 && tokens.every((token) => value.includes(token))

const matchesAnyTermWithEveryToken = (tokens: string[], values: string[]): boolean =>
  tokens.length > 0 && values.some((value) => matchesEveryToken(tokens, value))

const exactScoreChecks = [
  (context: SearchContext<SearchableRecord>): number | null =>
    !context.rawQuery && context.pastedCharacter === null ? 0 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.pastedCharacter === context.record.cp &&
      context.rawQuery === context.character
      ? 100
      : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.codePoint === context.record.cp ? 90 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedName === context.normalizedQuery ? 80 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedAliases.includes(context.normalizedQuery) ? 79 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedName.startsWith(context.normalizedQuery) ? 70 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedAliases.some((term) => term.startsWith(context.normalizedQuery)) ? 69 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedKeywords.includes(context.normalizedQuery) ? 68 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedBlock === context.normalizedQuery ? 67 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedScript === context.normalizedQuery ? 66 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    context.normalizedKeywords.some((term) => term.startsWith(context.normalizedQuery)) ? 65 : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    matchesEveryToken(context.queryTokens, context.normalizedName)
      ? 64 + context.queryTokens.length
      : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    matchesAnyTermWithEveryToken(context.queryTokens, context.normalizedAliases)
      ? 62 + context.queryTokens.length
      : null,
  (context: SearchContext<SearchableRecord>): number | null =>
    matchesAnyTermWithEveryToken(context.queryTokens, context.normalizedTerms) ? 60 : null,
]

const rankRecord = <T extends SearchableRecord>(record: T, query: string): number | null => {
  const context = createSearchContext(record, query)

  for (const getScore of exactScoreChecks) {
    const score = getScore(context)

    if (score !== null) {
      return score
    }
  }

  return null
}

const rankFuzzyRecord = <T extends SearchableRecord>(record: T, query: string): number | null => {
  const context = createSearchContext(record, query)

  if (!context.normalizedQuery) {
    return null
  }

  let bestScore: number | null = null

  for (const term of context.normalizedTerms) {
    const score = fuzzySubsequenceScore(context.normalizedQuery, term)

    if (score !== null && (bestScore === null || score > bestScore)) {
      bestScore = score
    }
  }

  return bestScore
}

const sortRankedMatches = <T extends SearchableRecord>(
  matches: RankedMatch<T>[],
): RankedMatch<T>[] =>
  matches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.record.cp - right.record.cp
  })

const rankMatches = <T extends SearchableRecord>(
  records: T[],
  query: string,
  ranker: (record: T, searchQuery: string) => number | null,
): T[] =>
  sortRankedMatches(
    records
      .map((record) => ({
        record,
        score: ranker(record, query) ?? -1,
      }))
      .filter((entry) => entry.score >= 0),
  ).map((entry) => entry.record)

const filterByActiveSet = <T extends SearchableRecord>(records: T[], activeSet?: string): T[] =>
  activeSet ? records.filter((record) => record.featuredIn?.includes(activeSet)) : records

export const searchCharacters = <T extends SearchableRecord>(
  records: T[],
  query: string,
  activeSet?: string,
): T[] => {
  const scopedRecords = filterByActiveSet(records, activeSet)

  if (!query && getSingleCodePointQuery(query) === null) {
    return scopedRecords
  }

  const ranked = rankMatches(scopedRecords, query, rankRecord)

  if (ranked.length > 0) {
    return ranked
  }

  return rankMatches(scopedRecords, query, rankFuzzyRecord)
}
