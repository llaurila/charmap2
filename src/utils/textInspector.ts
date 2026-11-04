import type {
  InspectorFilter, InspectorFinding, InspectorSummary, InspectorUnit, ResultRecord, SearchRecord,
} from '../types/unicode'
import {
  getDiagnosticProperties, getFallbackKind, getInspectorPlaceholder, getValueFlags, isLineBreak,
} from './textInspectorProperties'

export const LIVE_ANALYSIS_LIMIT = 4_000
export const MAX_INSPECTOR_INPUT = 100_000

const getFallbackName = (cp: number, properties: string[]): string => {
  const value = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
  return properties.length ? `${value} (${properties[0]})` : value
}

const resolveMetadata = (
  cp: number, properties: string[], record: ResultRecord | undefined,
) => ({
  name: record?.name ?? getFallbackName(cp, properties),
  aliases: record?.aliases,
  block: record?.block ?? 'Unknown block',
  script: record?.script ?? 'Unknown script',
})

const buildUnit = (
  text: string,
  index: number,
  offset: number,
  line: number,
  column: number,
  searchRecord: SearchRecord | undefined,
  loadedRecord: ResultRecord | undefined,
): InspectorUnit => {
  const cp = text.codePointAt(0)!
  const kind = searchRecord?.kind ?? getFallbackKind(text)
  const diagnosticProperties = getDiagnosticProperties(cp, kind)
  if (!searchRecord && !getValueFlags(cp).length && /\p{Cn}/u.test(text)) {
    diagnosticProperties.push('unassigned')
  }
  const record = loadedRecord ?? searchRecord
  return {
    id: `inspector-${index}-${cp}`, index, cp, text, line, column,
    utf16Start: offset, utf16End: offset + text.length,
    ...resolveMetadata(cp, diagnosticProperties, record), kind,
    flags: diagnosticProperties.filter((property) => property !== 'invisible'),
    diagnosticProperties, findingIds: [],
  }
}

export const analyzeText = (
  input: string,
  searchIndex: SearchRecord[] | Map<number, SearchRecord> = [],
  loadedRecordsByCp = new Map<number, ResultRecord>(),
): InspectorUnit[] => {
  const indexByCp = searchIndex instanceof Map
    ? searchIndex : new Map(searchIndex.map((record) => [record.cp, record]))
  const units: InspectorUnit[] = []
  let line = 1
  let column = 1
  let offset = 0

  for (const text of input) {
    const cp = text.codePointAt(0)!
    const unit = buildUnit(
      text, units.length, offset, line, column, indexByCp.get(cp), loadedRecordsByCp.get(cp),
    )
    units.push(unit)
    offset += text.length
    if (cp === 0x0d && input.charCodeAt(offset) === 0x0a) {
      // Retain both CRLF units on the old line; LF completes the logical break.
      column += 1
    } else if (isLineBreak(cp)) {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }
  return units
}

export const buildInspectorSummary = (
  units: InspectorUnit[], findings: InspectorFinding[],
): InspectorSummary => {
  const last = units.at(-1)
  const trailingBreak = last && isLineBreak(last.cp)
  return {
    codePointCount: units.length,
    lineCount: last ? last.line + Number(trailingBreak) : 0,
    invisibleCount: units.filter((unit) =>
      unit.diagnosticProperties.includes('invisible')).length,
    findingGroupCount: findings.length,
    checkOrProblemGroupCount: findings.filter((finding) =>
      finding.severity !== 'information').length,
  }
}

export const filterInspectorUnits = (
  units: InspectorUnit[], filter: InspectorFilter,
): InspectorUnit[] => {
  if (filter === 'findings') return units.filter((unit) => unit.findingIds.length > 0)
  if (filter === 'invisible') {
    return units.filter((unit) => unit.diagnosticProperties.includes('invisible'))
  }
  return units
}

export const getInspectorContext = (
  units: InspectorUnit[], startIndex: number, endIndex = startIndex + 1,
): string => {
  const start = Math.max(0, startIndex - 15)
  const end = Math.min(units.length, endIndex + 15, startIndex + 60)
  const text = units.slice(start, end).map((unit) => {
    const placeholder = getInspectorPlaceholder(unit)
    return placeholder ? `[${placeholder}]` : unit.text
  }).join('')
  return `${start > 0 ? '…' : ''}${text}${end < units.length ? '…' : ''}`
}
