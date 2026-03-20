import { describe, expect, it } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import type { BlockIndexEntry, LoadedBlocks, SearchRecord } from '../types/unicode'
import { getSelectedDetailRecord, getSelectedSearchRecord } from './selectionModel'

const searchIndex = mockCharacters.map<SearchRecord>((record) => ({
  aliases: record.aliases,
  block: record.block,
  cp: record.cp,
  featuredIn: record.featuredIn,
  keywords: record.keywords,
  kind: record.kind,
  name: record.name,
  script: record.script,
}))

const punctuationBlock: BlockIndexEntry = {
  count: 4,
  end: 0x206f,
  file: 'general-punctuation.json',
  id: 'general-punctuation',
  label: 'General Punctuation',
  start: 0x2000,
}

describe('selection model helpers', () => {
  it('returns null for empty filtered results while searching', () => {
    expect(getSelectedSearchRecord([], searchIndex, 0x201c, true)).toBeNull()
  })

  it('prefers the selected result from the current filtered list', () => {
    const results = searchIndex.filter((record) => record.featuredIn?.includes('quotes'))

    expect(getSelectedSearchRecord(results, searchIndex, 0x201d, false)?.cp).toBe(0x201d)
  })

  it('falls back to the selected code point from the full index when needed', () => {
    const results = searchIndex.filter((record) => record.featuredIn?.includes('currency'))

    expect(getSelectedSearchRecord(results, searchIndex, 0x201d, false)?.cp).toBe(0x201d)
  })

  it('hydrates selected detail records from a loaded block', () => {
    const selectedSearchRecord = searchIndex.find((record) => record.cp === 0x200d) ?? null
    const loadedBlocks: LoadedBlocks = {
      [punctuationBlock.id]: mockCharacters.filter(
        (record) => record.block === 'General Punctuation',
      ),
    }

    const detail = getSelectedDetailRecord(
      loadedBlocks,
      selectedSearchRecord,
      punctuationBlock,
      null,
      undefined,
    )

    expect(detail).toMatchObject({
      cp: 0x200d,
      category: 'Cf',
      name: 'ZERO WIDTH JOINER',
    })
  })

  it('falls back to the search record until block detail is loaded', () => {
    const selectedSearchRecord = searchIndex.find((record) => record.cp === 0x200d) ?? null

    const detail = getSelectedDetailRecord(
      {},
      selectedSearchRecord,
      punctuationBlock,
      null,
      undefined,
    )

    expect(detail).toEqual(selectedSearchRecord)
  })

  it('resolves direct lookup detail from a loaded block without search results', () => {
    const loadedBlocks: LoadedBlocks = {
      [punctuationBlock.id]: mockCharacters.filter(
        (record) => record.block === 'General Punctuation',
      ),
    }

    const detail = getSelectedDetailRecord(loadedBlocks, null, undefined, 0x200d, punctuationBlock)

    expect(detail).toMatchObject({
      cp: 0x200d,
      category: 'Cf',
    })
  })
})
