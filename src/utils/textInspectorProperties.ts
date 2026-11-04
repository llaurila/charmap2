import type { CharacterKind } from '../types/unicode'

export const isSurrogate = (cp: number): boolean => cp >= 0xd800 && cp <= 0xdfff

export const isPrivateUse = (cp: number): boolean =>
  (cp >= 0xe000 && cp <= 0xf8ff)
  || (cp >= 0xf0000 && cp <= 0xffffd)
  || (cp >= 0x100000 && cp <= 0x10fffd)

export const isNoncharacter = (cp: number): boolean =>
  (cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe

export const isVariationSelector = (cp: number): boolean =>
  (cp >= 0xfe00 && cp <= 0xfe0f)
  || (cp >= 0xe0100 && cp <= 0xe01ef)
  || (cp >= 0x180b && cp <= 0x180d)
  || cp === 0x180f

export const isLineBreak = (cp: number): boolean =>
  [0x0a, 0x0d, 0x85, 0x2028, 0x2029].includes(cp)

export const BIDI_CONTROLS = new Set([
  0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
  0x2066, 0x2067, 0x2068, 0x2069,
])

export const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff])
export const NO_BREAK_SPACES = new Set([0x00a0, 0x2007, 0x202f])

const INVISIBLE_MARKS = new Set([0x034f, 0x115f, 0x1160, 0x3164, 0xffa0])
const INVISIBLE_KINDS = new Set<CharacterKind>(['format', 'control', 'whitespace'])

export const getFallbackKind = (text: string): CharacterKind => {
  if (/\p{Cc}/u.test(text)) return 'control'
  if (/\p{White_Space}/u.test(text)) return 'whitespace'
  if (/\p{Cf}/u.test(text)) return 'format'
  if (/\p{M}/u.test(text)) return 'combining'
  return 'glyph'
}

export const getValueFlags = (cp: number): string[] => {
  if (isSurrogate(cp)) return ['lone surrogate']
  if (isPrivateUse(cp)) return ['private-use']
  if (isNoncharacter(cp)) return ['noncharacter']
  return []
}

export const getDiagnosticProperties = (cp: number, kind: CharacterKind): string[] => {
  const properties = getValueFlags(cp)
  if (BIDI_CONTROLS.has(cp)) properties.push('bidi control')
  if (isVariationSelector(cp)) properties.push('variation selector')
  if (ZERO_WIDTH.has(cp)) properties.push('zero-width')
  if (INVISIBLE_KINDS.has(kind)) {
    properties.push('invisible')
  }
  if (isVariationSelector(cp) || INVISIBLE_MARKS.has(cp)) properties.push('invisible')
  return properties
}

const labels = new Map<number, string>([
  [0x00, 'NUL'], [0x09, 'TAB'], [0x0a, 'LF'], [0x0d, 'CR'], [0x20, 'SPACE'],
  [0x85, 'NEL'], [0xa0, 'NBSP'], [0xad, 'SHY'], [0x034f, 'CGJ'], [0x061c, 'ALM'],
  [0x1680, 'OGHAM SPACE'], [0x180e, 'MVS'], [0x2007, 'FIGURE SPACE'],
  [0x200b, 'ZWSP'], [0x200c, 'ZWNJ'], [0x200d, 'ZWJ'], [0x200e, 'LRM'], [0x200f, 'RLM'],
  [0x2028, 'LS'], [0x2029, 'PS'], [0x202a, 'LRE'], [0x202b, 'RLE'], [0x202c, 'PDF'],
  [0x202d, 'LRO'], [0x202e, 'RLO'], [0x202f, 'NNBSP'], [0x205f, 'MMSP'],
  [0x2060, 'WJ'], [0x2066, 'LRI'], [0x2067, 'RLI'], [0x2068, 'FSI'], [0x2069, 'PDI'],
  [0x3000, 'IDEOGRAPHIC SPACE'], [0xfeff, 'BOM'],
])

type LabelableUnit = {
  cp: number
  kind: CharacterKind
  diagnosticProperties: string[]
}

export const getInspectorPlaceholder = (unit: LabelableUnit): string | null => {
  const label = labels.get(unit.cp)
  if (label) return label
  if (isVariationSelector(unit.cp)) return `VS U+${unit.cp.toString(16).toUpperCase()}`
  if (unit.diagnosticProperties.includes('invisible')) {
    return `${unit.kind.toUpperCase()} U+${unit.cp.toString(16).toUpperCase()}`
  }
  if (getValueFlags(unit.cp).length || unit.diagnosticProperties.includes('unassigned')) {
    return `U+${unit.cp.toString(16).toUpperCase()}`
  }
  return null
}
