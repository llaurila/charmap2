export type CharacterKind =
  | 'glyph'
  | 'combining'
  | 'whitespace'
  | 'format'
  | 'control'

export type SearchRecord = {
  cp: number
  name: string
  aliases?: string[]
  kind: CharacterKind
  block: string
  script: string
  keywords?: string[]
  featuredIn?: string[]
}

export type EncodedSearchRecord = [
  cp: number,
  name: string,
  kindIndex: number,
  blockId: number,
  scriptId: number,
  aliases?: string[],
  keywords?: string[],
  featuredIn?: string[],
]

export type SearchPayload = {
  blocks: string[]
  scripts: string[]
  records: EncodedSearchRecord[]
}

export type CharacterRecord = {
  cp: number
  name: string
  aliases?: string[]
  block: string
  script: string
  category: string
  age?: string
  description?: string
  kind: CharacterKind
  flags?: string[]
  keywords?: string[]
  hidden?: boolean
  decomposition?: number[]
  caseMap?: {
    upper?: number
    lower?: number
    title?: number
  }
  featuredIn?: string[]
}

export type FeaturedSet = {
  id: string
  label: string
  description: string
}

export type BlockIndexEntry = {
  id: string
  label: string
  start: number
  end: number
  count: number
  file: string
}
