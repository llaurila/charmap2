import { describe, expect, it } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import type { BlockIndexEntry } from '../types/unicode'
import {
  getActiveSetText,
  getDisplayResults,
  getIsDirectLookupLoading,
  getIsDirectLookupOnly,
  getResultsStatusText,
} from './resultsViewModel'

const punctuationBlock: BlockIndexEntry = {
  count: 4,
  end: 0x206f,
  file: 'general-punctuation.json',
  id: 'general-punctuation',
  label: 'General Punctuation',
  start: 0x2000,
}

describe('results view-model helpers', () => {
  it('returns ranked results when search matches exist', () => {
    const results = mockCharacters.slice(0, 2)

    expect(getDisplayResults(results, true, mockCharacters[2] ?? null)).toEqual(results)
  })

  it('falls back to the selected detail record for direct lookup', () => {
    const detail = mockCharacters.find((record) => record.cp === 0x200d) ?? null

    expect(getDisplayResults([], true, detail)).toEqual(detail ? [detail] : [])
  })

  it('returns an empty list when there is no query fallback to show', () => {
    expect(getDisplayResults([], false, mockCharacters[0] ?? null)).toEqual([])
  })

  it('distinguishes exact lookup fallback from exact lookup loading', () => {
    expect(getIsDirectLookupOnly(true, 0, 1)).toBe(true)

    expect(
      getIsDirectLookupLoading({
        directLookupBlock: punctuationBlock,
        directLookupCp: 0x200d,
        displayResultsLength: 0,
        hasQuery: true,
        resultsLength: 0,
      }),
    ).toBe(true)

    expect(
      getIsDirectLookupLoading({
        directLookupBlock: punctuationBlock,
        directLookupCp: 0x200d,
        displayResultsLength: 1,
        hasQuery: true,
        resultsLength: 0,
      }),
    ).toBe(false)
  })

  it('formats status and active set labels', () => {
    expect(getResultsStatusText(false, 10)).toBe('Loading generated search index.')
    expect(getResultsStatusText(true, 1234)).toBe(
      `${(1234).toLocaleString()} matching characters.`,
    )
    expect(getActiveSetText(undefined)).toBe('All sets')
    expect(getActiveSetText('quotes')).toBe('Quotes')
    expect(getActiveSetText('unknown')).toBe('Featured set')
  })
})
