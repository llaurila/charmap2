import { describe, expect, it } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import type { ResultRecord, SearchRecord } from '../types/unicode'
import {
  analyzeText,
  buildInspectorSummary,
  buildInspectorWarnings,
  filterInspectorUnits,
  formatCodePointList,
  formatHtmlEscapedText,
  formatJavaScriptEscapedText,
} from './textInspector'

const searchIndex: SearchRecord[] = mockCharacters.map((record) => ({
  aliases: record.aliases,
  block: record.block,
  cp: record.cp,
  featuredIn: record.featuredIn,
  keywords: record.keywords,
  kind: record.kind,
  name: record.name,
  script: record.script,
}))

const loadedRecordsByCp = new Map<number, ResultRecord>(
  mockCharacters.map((record) => [record.cp, record]),
)

describe('textInspector helpers', () => {
  it('builds ordered units with line and column positions', () => {
    const units = analyzeText('A\nB', searchIndex, loadedRecordsByCp)

    expect(units.map((unit) => unit.cp)).toEqual([0x41, 0x0a, 0x42])
    expect(units[0]).toMatchObject({ column: 1, line: 1 })
    expect(units[1]).toMatchObject({ column: 2, line: 1 })
    expect(units[2]).toMatchObject({ column: 1, line: 2 })
  })

  it('detects suspicious zero-width and unusual whitespace characters', () => {
    const units = analyzeText('\u00A0\u200D', searchIndex, loadedRecordsByCp)
    const warnings = buildInspectorWarnings(units)

    expect(units[0]?.warningTags).toContain('unusual-whitespace')
    expect(units[1]?.warningTags).toContain('zero-width')
    expect(warnings.map((warning) => warning.id)).toEqual(['unusual-whitespace', 'zero-width'])
  })

  it('builds summary counts and filtered views', () => {
    const units = analyzeText('A\u00A0\u200D', searchIndex, loadedRecordsByCp)
    const warnings = buildInspectorWarnings(units)
    const summary = buildInspectorSummary(units, warnings)

    expect(summary).toMatchObject({
      codePointCount: 3,
      hasSuspiciousContent: true,
      invisibleCount: 2,
      lineCount: 1,
    })
    expect(filterInspectorUnits(units, 'suspicious')).toHaveLength(2)
    expect(filterInspectorUnits(units, 'invisible')).toHaveLength(2)
  })

  it('formats whole-text copy outputs', () => {
    const units = analyzeText('A\u200D', searchIndex, loadedRecordsByCp)

    expect(formatCodePointList(units)).toBe('U+0041 U+200D')
    expect(formatJavaScriptEscapedText(units)).toBe('\\u0041\\u200D')
    expect(formatHtmlEscapedText(units)).toBe('&#x41;&#x200D;')
  })
})
