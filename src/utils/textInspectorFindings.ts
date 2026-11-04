import type { InspectorFinding, InspectorOccurrence, InspectorUnit } from '../types/unicode'
import {
  BIDI_CONTROLS, NO_BREAK_SPACES, ZERO_WIDTH, isLineBreak, isVariationSelector,
} from './textInspectorProperties'

type FindingDefinition = Omit<InspectorFinding, 'id' | 'occurrences'>

const definitions: Record<string, FindingDefinition> = {
  structure: {
    severity: 'information', title: 'Tabs and line breaks',
    description: 'These are ordinary text structure, not a problem by themselves.',
  },
  'zero-width': {
    severity: 'check', title: 'Invisible break behavior',
    description: 'ZWSP allows a break; WJ and BOM prevent breaks. Their hidden presence may matter.'
      + ' A leading BOM can also act as a signature.',
  },
  joiner: {
    severity: 'information', title: 'Shaping and joining characters',
    description: 'ZWJ and ZWNJ affect shaping and joining, including emoji.'
      + ' They may be intentional.',
  },
  'no-break-space': {
    severity: 'check', title: 'No-break spaces',
    description: 'Unlike an ordinary space, these spaces prevent a line break between nearby text.',
  },
  'unusual-space': {
    severity: 'check', title: 'Unusual spaces',
    description: 'These spaces can have a different width or behavior from an ordinary space.',
  },
  'mixed-spaces': {
    severity: 'check', title: 'Mixed horizontal spaces',
    description: 'Different horizontal space variants coexist.'
      + ' Check that the difference is intended.',
  },
  'bidi-override': {
    severity: 'problem', title: 'Bidirectional overrides',
    description: 'An override forces text direction and can disguise logical character order.',
  },
  bidi: {
    severity: 'check', title: 'Bidirectional controls',
    description: 'These hidden characters influence text ordering. They can be legitimate in text.',
  },
  control: {
    severity: 'check', title: 'Other control characters',
    description: 'These controls may affect parsing or device behavior;'
      + ' they are not ordinary breaks.',
  },
  nul: {
    severity: 'problem', title: 'NUL characters',
    description: 'NUL may terminate strings in some systems and cannot round-trip through HTML.',
  },
  'orphan-combining': {
    severity: 'check', title: 'Combining marks without an obvious base',
    description: 'These marks have no obvious preceding base. This is a heuristic, not validation.',
  },
  'clustered-format': {
    severity: 'check', title: 'Clustered invisible format characters',
    description: 'Adjacent format characters may be redundant or unexpected. Check this sequence.',
  },
  'lone-surrogate': {
    severity: 'problem', title: 'Lone UTF-16 surrogates',
    description: 'These retained UTF-16 values are not Unicode scalar values and may be replaced.',
  },
  noncharacter: {
    severity: 'problem', title: 'Unicode noncharacters',
    description: 'These permanently reserved values may be rejected during text interchange.',
  },
  'private-use': {
    severity: 'information', title: 'Private-use characters',
    description: 'Meaning and appearance depend on a private agreement or font.'
      + ' They may be intended.',
  },
  variation: {
    severity: 'information', title: 'Variation selectors',
    description: 'These invisible selectors request a presentation or glyph variant'
      + ' of nearby text.',
  },
  'orphan-variation': {
    severity: 'check', title: 'Variation selectors without an obvious base',
    description: 'No visible base immediately precedes these selectors. Check their placement.',
  },
  'other-invisible': {
    severity: 'information', title: 'Other invisible characters',
    description: 'These hidden characters can affect formatting or rendering.'
      + ' Inspect their metadata.',
  },
  unassigned: {
    severity: 'check', title: 'Unassigned values',
    description: 'No assigned character metadata was found. Display and interchange may vary.',
  },
}

const occurrence = (
  units: InspectorUnit[], start: number, end = start + 1,
): InspectorOccurrence => ({
  startIndex: start, endIndex: end,
  utf16Start: units[start]!.utf16Start, utf16End: units[end - 1]!.utf16End,
})

const hasBase = (previous: InspectorUnit | undefined): boolean =>
  !!previous && (previous.kind === 'glyph' || previous.kind === 'combining')
  && !previous.diagnosticProperties.includes('invisible')

const classifySpecial = (unit: InspectorUnit, previous: InspectorUnit | undefined): string[] => {
  if (unit.diagnosticProperties.includes('lone surrogate')) return ['lone-surrogate']
  if (unit.diagnosticProperties.includes('noncharacter')) return ['noncharacter']
  if (unit.diagnosticProperties.includes('private-use')) return ['private-use']
  if (unit.diagnosticProperties.includes('unassigned')) return ['unassigned']
  if (isVariationSelector(unit.cp)) return [hasBase(previous) ? 'variation' : 'orphan-variation']
  return []
}

const classifyControl = (unit: InspectorUnit): string[] => {
  if (unit.cp === 0x09 || isLineBreak(unit.cp)) return ['structure']
  if (unit.cp === 0) return ['nul']
  if (BIDI_CONTROLS.has(unit.cp)) {
    return [unit.cp === 0x202d || unit.cp === 0x202e ? 'bidi-override' : 'bidi']
  }
  if (unit.kind === 'control') return ['control']
  return []
}

const classifyUnit = (unit: InspectorUnit, previous: InspectorUnit | undefined): string[] => {
  const special = classifySpecial(unit, previous)
  if (special.length) return special
  const control = classifyControl(unit)
  if (control.length) return control
  if (ZERO_WIDTH.has(unit.cp)) return [[0x200c, 0x200d].includes(unit.cp)
    ? 'joiner' : 'zero-width']
  if (NO_BREAK_SPACES.has(unit.cp)) return ['no-break-space']
  if (unit.kind === 'whitespace' && unit.cp !== 0x20) return ['unusual-space']
  return classifyMark(unit, previous)
}

const classifyMark = (unit: InspectorUnit, previous: InspectorUnit | undefined): string[] => {
  if (unit.diagnosticProperties.includes('invisible')) return ['other-invisible']
  if (unit.kind === 'combining' && !hasBase(previous)) return ['orphan-combining']
  return []
}

type AddOccurrence = (id: string, start: number, end?: number) => void

const addMixedSpaces = (units: InspectorUnit[], add: AddOccurrence): Map<number, number> => {
  const spaces = units.filter((unit) => unit.kind === 'whitespace' && !isLineBreak(unit.cp))
  const counts = new Map<number, number>()
  for (const unit of spaces) counts.set(unit.cp, (counts.get(unit.cp) ?? 0) + 1)
  if (counts.size > 1) {
    for (const unit of spaces) add('mixed-spaces', unit.index)
  }
  return counts
}

const addClusters = (units: InspectorUnit[], add: AddOccurrence): void => {
  let start = -1
  for (let index = 0; index <= units.length; index += 1) {
    if (units[index]?.kind === 'format') {
      if (start < 0) start = index
    } else if (start >= 0) {
      if (index - start > 1) add('clustered-format', start, index)
      start = -1
    }
  }
}

export const buildInspectorFindings = (units: InspectorUnit[]): InspectorFinding[] => {
  const groups = new Map<string, InspectorOccurrence[]>()
  const add: AddOccurrence = (id, start, end = start + 1) => {
    const entries = groups.get(id) ?? []
    entries.push(occurrence(units, start, end))
    groups.set(id, entries)
    if (definitions[id]!.severity !== 'information') {
      for (let index = start; index < end; index += 1) units[index]!.findingIds.push(id)
    }
  }
  // This pure analysis owns these units. Rebuilding must not duplicate markers.
  for (const unit of units) unit.findingIds = []
  units.forEach((unit, index) => {
    for (const id of classifyUnit(unit, units[index - 1])) add(id, index)
  })
  const spaceCounts = addMixedSpaces(units, add)
  addClusters(units, add)
  return Array.from(groups, ([id, occurrences]) => {
    const definition = definitions[id]!
    const variants = id === 'mixed-spaces' ? Array.from(spaceCounts, ([cp, count]) =>
      `U+${cp.toString(16).toUpperCase().padStart(4, '0')} × ${count}`).join(', ') : ''
    return { id, ...definition, description: `${definition.description} ${variants}`.trim(),
      occurrences }
  }).sort((a, b) => {
    const rank = { problem: 0, check: 1, information: 2 }
    return rank[a.severity] - rank[b.severity]
      || a.occurrences[0]!.startIndex - b.occurrences[0]!.startIndex
  })
}
