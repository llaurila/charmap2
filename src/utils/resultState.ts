import type {
  BlockIndexEntry,
  CharacterRecord,
  LoadedBlocks,
  ResultRecord,
  SearchRecord,
} from '../types/unicode'

export const RESULT_ROW_HEIGHT = 196
const VIRTUAL_OVERSCAN_ROWS = 2
const RESULT_GRID_GAP = 14
const RESULT_CARD_MIN_WIDTH = 180
const RESULT_CARD_MIN_WIDTH_NARROW = 150

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

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

export const getVirtualizationState = (
  displayResults: ResultRecord[],
  gridHeight: number,
  gridWidth: number,
  gridScrollTop: number,
) => {
  const resultCardMinWidth =
    gridWidth <= 640 ? RESULT_CARD_MIN_WIDTH_NARROW : RESULT_CARD_MIN_WIDTH
  const virtualColumnCount = Math.max(
    1,
    Math.floor((gridWidth + RESULT_GRID_GAP) / (resultCardMinWidth + RESULT_GRID_GAP)),
  )
  const totalRows = Math.ceil(displayResults.length / virtualColumnCount)
  const visibleRowCount = Math.max(1, Math.ceil(gridHeight / RESULT_ROW_HEIGHT))
  const startRow = clamp(
    Math.floor(gridScrollTop / RESULT_ROW_HEIGHT) - VIRTUAL_OVERSCAN_ROWS,
    0,
    Math.max(0, totalRows - 1),
  )
  const endRow = clamp(startRow + visibleRowCount + VIRTUAL_OVERSCAN_ROWS * 2, 0, totalRows)

  return {
    bottomSpacerHeight:
      displayResults.length > 80 ? Math.max(0, (totalRows - endRow) * RESULT_ROW_HEIGHT) : 0,
    topSpacerHeight: displayResults.length > 80 ? startRow * RESULT_ROW_HEIGHT : 0,
    virtualColumnCount,
    visibleResults:
      displayResults.length > 80
        ? displayResults.slice(startRow * virtualColumnCount, endRow * virtualColumnCount)
        : displayResults,
  }
}

export const moveSelection = (
  displayResults: ResultRecord[],
  selectedCp: number | null,
  offset: number,
): ResultRecord | undefined => {
  if (displayResults.length === 0) {
    return undefined
  }

  const currentIndex = displayResults.findIndex((record) => record.cp === selectedCp)
  const nextIndex =
    currentIndex === -1 ? 0 : clamp(currentIndex + offset, 0, displayResults.length - 1)

  return displayResults[nextIndex]
}
