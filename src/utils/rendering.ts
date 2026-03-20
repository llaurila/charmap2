import type { CharacterKind } from '../types/unicode'

type RenderableRecord = {
  cp: number
  kind: CharacterKind
}

const invisibleLabels: Partial<Record<CharacterKind, string>> = {
  whitespace: 'SPACE',
  format: 'FORMAT',
  control: 'CTRL',
}

export const getPrimaryGlyph = (record: RenderableRecord): string => {
  const glyph = String.fromCodePoint(record.cp)

  if (record.kind === 'combining') {
    return `\u25CC${glyph}`
  }

  if (record.kind === 'glyph') {
    return glyph
  }

  return invisibleLabels[record.kind] ?? glyph
}

export const getGlyphCaption = (record: RenderableRecord): string => {
  if (record.kind === 'whitespace') {
    return 'Whitespace placeholder'
  }

  if (record.kind === 'format') {
    return 'Format character placeholder'
  }

  if (record.kind === 'control') {
    return 'Control character placeholder'
  }

  if (record.kind === 'combining') {
    return 'Rendered on a dotted circle'
  }

  return 'Glyph preview'
}
