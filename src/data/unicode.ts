import { SEARCH_KIND_ORDER, UNICODE_VERSION } from '../constants/unicode'
import type {
  BlockIndexEntry,
  CharacterKind,
  CharacterRecord,
  EncodedSearchRecord,
  SearchPayload,
  SearchRecord,
} from '../types/unicode'

const unicodeBasePath = `${import.meta.env.BASE_URL}unicode/${UNICODE_VERSION}`

let searchIndexPromise: Promise<SearchRecord[]> | null = null
let blockIndexPromise: Promise<BlockIndexEntry[]> | null = null
const blockPromiseCache = new Map<string, Promise<CharacterRecord[]>>()

const decodeSearchRecord = (
  encoded: EncodedSearchRecord,
  payload: SearchPayload,
): SearchRecord => {
  const [cp, name, kindIndex, blockId, scriptId, aliases, keywords, featuredIn] = encoded
  const kind = SEARCH_KIND_ORDER[kindIndex] as CharacterKind | undefined
  const block = payload.blocks[blockId]
  const script = payload.scripts[scriptId]

  if (!kind || !block || !script) {
    throw new Error(`Invalid encoded search record for U+${cp.toString(16).toUpperCase()}`)
  }

  return {
    cp,
    name,
    kind,
    block,
    script,
    aliases,
    keywords,
    featuredIn,
  }
}

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`)
  }

  return (await response.json()) as T
}

export const loadSearchIndex = (): Promise<SearchRecord[]> => {
  searchIndexPromise ??= fetchJson<SearchPayload>(`${unicodeBasePath}/search-core.json`).then((payload) =>
    payload.records.map((record) => decodeSearchRecord(record, payload)),
  )
  return searchIndexPromise
}

export const loadBlockIndex = (): Promise<BlockIndexEntry[]> => {
  blockIndexPromise ??= fetchJson<BlockIndexEntry[]>(`${unicodeBasePath}/ranges.json`)
  return blockIndexPromise
}

export const loadBlockRecords = (file: string): Promise<CharacterRecord[]> => {
  const cached = blockPromiseCache.get(file)

  if (cached) {
    return cached
  }

  const promise = fetchJson<CharacterRecord[]>(`${unicodeBasePath}/${file}`)
  blockPromiseCache.set(file, promise)
  return promise
}

export const findBlockForCodePoint = (
  blocks: BlockIndexEntry[],
  cp: number,
): BlockIndexEntry | undefined => blocks.find((entry) => cp >= entry.start && cp <= entry.end)

export const promoteSearchRecord = (record: SearchRecord): CharacterRecord => ({
  ...record,
  category: 'Cn',
})
