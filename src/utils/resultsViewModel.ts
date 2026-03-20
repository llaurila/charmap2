import { featuredSets } from '../data/featuredSets'
import type { BlockIndexEntry, ResultRecord } from '../types/unicode'

export const getDisplayResults = (
  results: ResultRecord[],
  hasQuery: boolean,
  selectedDetailRecord: ResultRecord | null,
): ResultRecord[] => {
  if (results.length > 0) {
    return results
  }

  if (hasQuery && selectedDetailRecord) {
    return [selectedDetailRecord]
  }

  return []
}

export const getIsDirectLookupOnly = (
  hasQuery: boolean,
  resultsLength: number,
  displayResultsLength: number,
): boolean => hasQuery && resultsLength === 0 && displayResultsLength > 0

export const getIsDirectLookupLoading = ({
  directLookupBlock,
  directLookupCp,
  displayResultsLength,
  hasQuery,
  resultsLength,
}: {
  directLookupBlock: BlockIndexEntry | undefined
  directLookupCp: number | null
  displayResultsLength: number
  hasQuery: boolean
  resultsLength: number
}): boolean =>
  hasQuery &&
  resultsLength === 0 &&
  directLookupCp !== null &&
  directLookupBlock !== undefined &&
  displayResultsLength === 0

export const getResultsStatusText = (isReady: boolean, resultsLength: number): string =>
  isReady ? `${resultsLength.toLocaleString()} matching characters.` : 'Loading generated search index.'

export const getActiveSetText = (activeSet: string | undefined): string =>
  activeSet ? featuredSets.find((set) => set.id === activeSet)?.label ?? 'Featured set' : 'All sets'
