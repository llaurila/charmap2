import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { BlockIndexEntry, CharacterRecord, SearchPayload } from '../../src/types/unicode'
import { outputDir } from './shared'

const readGeneratedJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(path.join(outputDir, file), 'utf8')) as T

describe('generated Unicode 18 data', () => {
  let search: SearchPayload
  let blocks: BlockIndexEntry[]

  beforeAll(async () => {
    ;[search, blocks] = await Promise.all([
      readGeneratedJson<SearchPayload>('search-core.json'),
      readGeneratedJson<BlockIndexEntry[]>('ranges.json'),
    ])
  })

  it('includes the full searchable repertoire', () => {
    // Unicode counts exclude the 65 control characters included in our search index.
    expect(search.records).toHaveLength(172808 + 65)
    expect(blocks).toHaveLength(353)
  })

  it.each([
    [0x11df0, 'BENGALI SIGN COMBINING ANUSVARA ABOVE', 'Bengali Supplement', 'Bengali'],
    [0x12550, 'CUNEIFORM NUMERIC SIGN ONE N01', 'Archaic Cuneiform Numerals', 'Cuneiform'],
    [0x18e00, 'JURCHEN CHARACTER-18E00', 'Jurchen', 'Jurchen'],
    [0x19191, 'JURCHEN CHARACTER-19191', 'Jurchen', 'Jurchen'],
    [0x191a0, 'JURCHEN RADICAL-01', 'Jurchen Radicals', 'Jurchen'],
    [0x1d250, 'MUSICAL SYMBOL COMBINING FLAG-6', 'Musical Symbols Supplement', 'Common'],
    [0x1db00, 'LEIBNIZIAN EQUALS SIGN', 'Miscellaneous Symbols and Arrows Extended', 'Common'],
    [0x3d000, 'SMALL SEAL CHARACTER-3D000', 'Seal', 'Seal'],
    [0x3fc3f, 'SMALL SEAL CHARACTER-3FC3F', 'Seal', 'Seal'],
    [0x2b81e, 'CJK UNIFIED IDEOGRAPH-2B81E', 'CJK Unified Ideographs Extension D', 'Han'],
  ] as const)('includes U+%s in search and detail data', async (cp, name, block, script) => {
    const encoded = search.records.find((record) => record[0] === cp)
    expect(encoded).toBeDefined()
    expect(encoded?.[1]).toBe(name)
    expect(search.blocks[encoded![3]]).toBe(block)
    expect(search.scripts[encoded![4]]).toBe(script)

    const blockEntry = blocks.find((entry) => entry.label === block)
    expect(blockEntry).toBeDefined()
    const records = await readGeneratedJson<CharacterRecord[]>(blockEntry!.file)
    expect(records.find((record) => record.cp === cp)).toMatchObject({
      cp,
      name,
      block,
      script,
      age: '18.0',
    })
  })
})
