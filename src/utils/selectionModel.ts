import type {
  BlockIndexEntry,
  CharacterRecord,
  LoadedBlocks,
  ResultRecord,
  SearchRecord,
} from '../types/unicode'

const findSelectedRecord = (
  records: SearchRecord[],
  selectedCp: number | null,
): SearchRecord | undefined => {
  if (selectedCp === null) {
    return undefined
  }

  return records.find((record) => record.cp === selectedCp)
}

/* eslint-disable complexity */
export const getSelectedSearchRecord = (
  results: SearchRecord[],
  searchIndex: SearchRecord[],
  selectedCp: number | null,
  hasQuery: boolean,
): SearchRecord | null => {
  if (hasQuery && results.length === 0) {
    return null
  }

  const selectedResult = findSelectedRecord(results, selectedCp)

  if (selectedResult) {
    return selectedResult
  }

  if (selectedCp === null) {
    return results[0] ?? searchIndex[0] ?? null
  }

  return findSelectedRecord(searchIndex, selectedCp) ?? results[0] ?? searchIndex[0] ?? null
}

/* eslint-enable complexity */

const getLoadedRecord = (
  records: CharacterRecord[] | undefined,
  cp: number,
): CharacterRecord | null => records?.find((record) => record.cp === cp) ?? null

export const getSelectedDetailRecord = (
  loadedBlocks: LoadedBlocks,
  selectedSearchRecord: SearchRecord | null,
  selectedBlock: BlockIndexEntry | undefined,
  directLookupCp: number | null,
  directLookupBlock: BlockIndexEntry | undefined,
): ResultRecord | null => {
  if (selectedSearchRecord && !selectedBlock) {
    return selectedSearchRecord
  }

  if (selectedSearchRecord && selectedBlock) {
    return getLoadedRecord(loadedBlocks[selectedBlock.id], selectedSearchRecord.cp) ??
      selectedSearchRecord
  }

  if (directLookupCp === null || !directLookupBlock) {
    return null
  }

  return getLoadedRecord(loadedBlocks[directLookupBlock.id], directLookupCp)
}
