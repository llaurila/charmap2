import type { InspectorUnit } from '../types/unicode'
import { isSurrogate } from './textInspectorProperties'

export type InspectorCopyFormat = 'raw' | 'code-points' | 'javascript' | 'html'

export const inspectorCopyFormats: Array<{
  id: InspectorCopyFormat
  label: string
  context: string
}> = [
  { id: 'raw', label: 'Raw text', context: 'The current input string, unchanged.' },
  { id: 'code-points', label: 'Code point list',
    context: 'Ordered U+ values, separated by spaces.' },
  { id: 'javascript', label: 'JavaScript string literal',
    context: 'A double-quoted JavaScript literal, including quotes. Preserves UTF-16 values.' },
  { id: 'html', label: 'HTML numeric references',
    context: 'Numeric references for an HTML text node, not a universal attribute escape format.' },
]

export const formatCodePointList = (units: InspectorUnit[]): string =>
  units.map((unit) => `U+${unit.cp.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')

export const formatJavaScriptEscapedText = (units: InspectorUnit[]): string =>
  '"' + units.map((unit) => unit.cp <= 0xffff
    ? `\\u${unit.cp.toString(16).toUpperCase().padStart(4, '0')}`
    : `\\u{${unit.cp.toString(16).toUpperCase()}}`).join('') + '"'

export const formatHtmlEscapedText = (units: InspectorUnit[]): string =>
  units.map((unit) => `&#x${unit.cp.toString(16).toUpperCase()};`).join('')

const HTML_REMAPPED_CONTROLS = new Set([
  0x80, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8e,
  0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9e, 0x9f,
])

export const getHtmlLossyCount = (units: InspectorUnit[]): number =>
  units.filter(({ cp }) => cp === 0 || isSurrogate(cp) || HTML_REMAPPED_CONTROLS.has(cp)).length

export const formatInspectorCopy = (
  format: InspectorCopyFormat, input: string, units: InspectorUnit[],
): string => {
  switch (format) {
    case 'raw': return input
    case 'code-points': return formatCodePointList(units)
    case 'javascript': return formatJavaScriptEscapedText(units)
    case 'html': return formatHtmlEscapedText(units)
  }
}
