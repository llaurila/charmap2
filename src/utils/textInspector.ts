import type {
  CharacterKind,
  InspectorSummary,
  InspectorUnit,
  InspectorWarning,
  ResultRecord,
  SearchRecord,
} from '../types/unicode'

const INVISIBLE_KINDS = new Set<CharacterKind>(['whitespace', 'format', 'control'])

const ZERO_WIDTH_CODE_POINTS = new Set([
  0x200b,
  0x200c,
  0x200d,
  0x2060,
  0xfeff,
])

const UNUSUAL_WHITESPACE_CODE_POINTS = new Set([
  0x00a0,
  0x1680,
  0x2000,
  0x2001,
  0x2002,
  0x2003,
  0x2004,
  0x2005,
  0x2006,
  0x2007,
  0x2008,
  0x2009,
  0x200a,
  0x202f,
  0x205f,
  0x3000,
])

const BIDI_CONTROL_FLAGS = new Set(['bidi control'])

const getFallbackName = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

const getFallbackKind = (character: string): CharacterKind => {
  if (character === '\n' || character === '\r' || character === '\t') {
    return 'control'
  }

  if (/\p{White_Space}/u.test(character)) {
    return 'whitespace'
  }

  return 'glyph'
}

const matchesSearchRecord = (record: SearchRecord, cp: number): boolean => record.cp === cp

const toFlags = (record: ResultRecord | undefined): string[] => {
  if (!record || !('flags' in record)) {
    return []
  }

  return record.flags ?? []
}

const isOrphanCombining = (kind: CharacterKind, previousKind?: CharacterKind): boolean =>
  kind === 'combining' && previousKind !== 'glyph' && previousKind !== 'combining'

const buildWarningTags = (
  cp: number,
  kind: CharacterKind,
  flags: string[],
  previousKind?: CharacterKind,
): string[] => {
  const tags: string[] = []

  if (ZERO_WIDTH_CODE_POINTS.has(cp)) {
    tags.push('zero-width')
  }

  if (UNUSUAL_WHITESPACE_CODE_POINTS.has(cp)) {
    tags.push('unusual-whitespace')
  }

  if (flags.some((flag) => BIDI_CONTROL_FLAGS.has(flag))) {
    tags.push('bidi-control')
  }

  if (kind === 'control') {
    tags.push('control')
  }

  if (isOrphanCombining(kind, previousKind)) {
    tags.push('orphan-combining')
  }

  return tags
}

const getRecordByCodePoint = (
  cp: number,
  searchIndex: SearchRecord[],
  loadedRecordsByCp: Map<number, ResultRecord>,
): ResultRecord | undefined =>
  loadedRecordsByCp.get(cp)
  ?? searchIndex.find((record) => matchesSearchRecord(record, cp))

const toCodePoint = (character: string): number | null => character.codePointAt(0) ?? null

type InspectorUnitRecord = {
  aliases: string[] | undefined
  block: string
  flags: string[]
  kind: CharacterKind
  name: string
  script: string
}

const toInspectorUnitRecord = (
  cp: number,
  character: string,
  searchIndex: SearchRecord[],
  loadedRecordsByCp: Map<number, ResultRecord>,
): InspectorUnitRecord => {
  const record = getRecordByCodePoint(cp, searchIndex, loadedRecordsByCp)

  if (!record) {
    return {
      aliases: undefined,
      block: 'Unknown block',
      flags: [],
      kind: getFallbackKind(character),
      name: getFallbackName(cp),
      script: 'Unknown script',
    }
  }

  return {
    aliases: record.aliases,
    block: record.block,
    flags: toFlags(record),
    kind: record.kind,
    name: record.name,
    script: record.script,
  }
}

const buildInspectorUnit = (
  character: string,
  index: number,
  line: number,
  column: number,
  previousKind: CharacterKind | undefined,
  searchIndex: SearchRecord[],
  loadedRecordsByCp: Map<number, ResultRecord>,
): InspectorUnit | null => {
  const cp = toCodePoint(character)

  if (cp === null) {
    return null
  }

  const record = toInspectorUnitRecord(cp, character, searchIndex, loadedRecordsByCp)
  const warningTags = buildWarningTags(cp, record.kind, record.flags, previousKind)

  return {
    id: `inspector-${index}-${cp}`,
    index,
    cp,
    text: character,
    line,
    column,
    name: record.name,
    aliases: record.aliases,
    block: record.block,
    script: record.script,
    kind: record.kind,
    flags: record.flags,
    warningTags,
    isSuspicious: warningTags.length > 0,
  }
}

export const analyzeText = (
  input: string,
  searchIndex: SearchRecord[],
  loadedRecordsByCp: Map<number, ResultRecord>,
): InspectorUnit[] => {
  const units: InspectorUnit[] = []
  let line = 1
  let column = 1
  let previousKind: CharacterKind | undefined

  Array.from(input).forEach((character, index) => {
    const unit = buildInspectorUnit(
      character,
      index,
      line,
      column,
      previousKind,
      searchIndex,
      loadedRecordsByCp,
    )

    if (!unit) {
      return
    }

    units.push(unit)
    previousKind = unit.kind

    if (character === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
  })

  return units
}

const warningDefinitions: Record<string, { description: string; title: string }> = {
  'bidi-control': {
    title: 'Bidirectional controls found',
    description: 'Directional controls can change text ordering without showing visible glyphs.',
  },
  control: {
    title: 'Control characters found',
    description: 'Control characters can affect parsing, line handling, or device behavior.',
  },
  'orphan-combining': {
    title: 'Combining marks without an obvious base',
    description:
      'A combining mark may appear detached or confusing when it does not '
      + 'follow a visible base.',
  },
  'unusual-whitespace': {
    title: 'Unusual whitespace found',
    description:
      'No-break or uncommon space characters can behave differently from an '
      + 'ordinary space.',
  },
  'zero-width': {
    title: 'Zero-width characters found',
    description: 'Zero-width characters affect shaping or breaks without taking visible space.',
  },
}

export const buildInspectorWarnings = (units: InspectorUnit[]): InspectorWarning[] => {
  const indicesByTag = new Map<string, number[]>()

  for (const unit of units) {
    for (const tag of unit.warningTags) {
      const indices = indicesByTag.get(tag) ?? []
      indices.push(unit.index)
      indicesByTag.set(tag, indices)
    }
  }

  return Array.from(indicesByTag.entries())
    .map(([id, indices]) => {
      const definition = warningDefinitions[id]

      if (!definition) {
        return null
      }

      return {
        id,
        title: definition.title,
        description: definition.description,
        count: indices.length,
        firstIndex: indices[0] ?? 0,
      }
    })
    .filter((warning): warning is InspectorWarning => warning !== null)
    .sort((left, right) => left.firstIndex - right.firstIndex)
}

export const buildInspectorSummary = (
  units: InspectorUnit[],
  warnings: InspectorWarning[],
): InspectorSummary => ({
  codePointCount: units.length,
  lineCount: units.reduce((max, unit) => Math.max(max, unit.line), 1),
  invisibleCount: units.filter((unit) => INVISIBLE_KINDS.has(unit.kind)).length,
  warningCount: warnings.reduce((sum, warning) => sum + warning.count, 0),
  hasSuspiciousContent: warnings.length > 0,
})

export const getInspectorFilterLabel = (filter: 'all' | 'suspicious' | 'invisible'): string => {
  switch (filter) {
    case 'suspicious':
      return 'Suspicious only'
    case 'invisible':
      return 'Invisible only'
    default:
      return 'All characters'
  }
}

export const filterInspectorUnits = (
  units: InspectorUnit[],
  filter: 'all' | 'suspicious' | 'invisible',
): InspectorUnit[] => {
  if (filter === 'suspicious') {
    return units.filter((unit) => unit.isSuspicious)
  }

  if (filter === 'invisible') {
    return units.filter((unit) => INVISIBLE_KINDS.has(unit.kind))
  }

  return units
}

export const formatCodePointList = (units: InspectorUnit[]): string =>
  units.map((unit) => `U+${unit.cp.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')

export const formatJavaScriptEscapedText = (units: InspectorUnit[]): string =>
  units
    .map((unit) => {
      if (unit.cp <= 0xffff) {
        return `\\u${unit.cp.toString(16).toUpperCase().padStart(4, '0')}`
      }

      return `\\u{${unit.cp.toString(16).toUpperCase()}}`
    })
    .join('')

export const formatHtmlEscapedText = (units: InspectorUnit[]): string =>
  units.map((unit) => `&#x${unit.cp.toString(16).toUpperCase()};`).join('')
