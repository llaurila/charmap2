import { describe, expect, it } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import type { ResultRecord, SearchRecord } from '../types/unicode'
import {
  analyzeText, buildInspectorSummary, filterInspectorUnits, getInspectorContext,
} from './textInspector'
import { buildInspectorFindings } from './textInspectorFindings'
import {
  formatCodePointList, formatHtmlEscapedText, formatJavaScriptEscapedText, getHtmlLossyCount,
} from './textInspectorCopy'
import { getInspectorPlaceholder } from './textInspectorProperties'

const searchIndex: SearchRecord[] = mockCharacters.map((record) => ({
  aliases: record.aliases, block: record.block, cp: record.cp, kind: record.kind,
  name: record.name, script: record.script,
}))
const loadedRecords = new Map<number, ResultRecord>(
  mockCharacters.map((record) => [record.cp, record]),
)

const inspect = (input: string) => {
  const units = analyzeText(input, searchIndex)
  const findings = buildInspectorFindings(units)
  return { units, findings, summary: buildInspectorSummary(units, findings) }
}

describe('text inspector', () => {
  it('preserves order and tracks code-point columns independently of UTF-16 offsets', () => {
    const { units } = inspect('A😀\t\nB')
    expect(units.map((unit) => unit.cp)).toEqual([0x41, 0x1f600, 9, 10, 0x42])
    expect(units[1]).toMatchObject({ line: 1, column: 2, utf16Start: 1, utf16End: 3 })
    expect(units[2]).toMatchObject({ line: 1, column: 3, utf16Start: 3, utf16End: 4 })
    expect(units[4]).toMatchObject({ line: 2, column: 1 })
    expect(units.map((unit) => unit.text).join('')).toBe('A😀\t\nB')
  })

  it.each([
    ['', 0], ['A', 1], ['A\n', 2], ['A\r', 2], ['A\r\n', 2],
    ['A\r\nB\rC\n', 4], ['\r\n\r\n', 3], ['A\u0085B\u2028C\u2029', 4],
  ])('counts logical lines in %j as %i', (input, expected) => {
    expect(inspect(input).summary.lineCount).toBe(expected)
  })

  it('does not flag ordinary tabs, newlines, or joiners as problems', () => {
    const { units, findings, summary } = inspect('Hello\tworld\n👩‍💻')
    expect(findings.every((finding) => finding.severity === 'information')).toBe(true)
    expect(summary.checkOrProblemGroupCount).toBe(0)
    expect(filterInspectorUnits(units, 'findings')).toHaveLength(0)
  })

  it('detects bidi controls without loaded block flags', () => {
    const { findings } = inspect('a\u202Eb\u202C\u2066c\u2069')
    expect(findings.find((finding) => finding.id === 'bidi-override')).toMatchObject({
      severity: 'problem', occurrences: [{ startIndex: 1, endIndex: 2 }],
    })
    expect(findings.find((finding) => finding.id === 'bidi')?.occurrences).toHaveLength(3)
  })

  it('metadata loading enriches names without changing classification or findings', () => {
    const input = '\u202E\uE000\uD800\uFDD0'
    const first = analyzeText(input, searchIndex)
    const later = analyzeText(input, searchIndex, loadedRecords)
    expect(first.map((unit) => unit.diagnosticProperties))
      .toEqual(later.map((unit) => unit.diagnosticProperties))
    expect(buildInspectorFindings(first)).toEqual(buildInspectorFindings(later))
  })

  it('retains and labels lone surrogates, private-use, noncharacters and unassigned values', () => {
    const { units, findings } = inspect('\uD800\uE000\uFDD0\u{10FFFF}\u0378')
    expect(units.map((unit) => unit.cp)).toEqual([0xd800, 0xe000, 0xfdd0, 0x10ffff, 0x378])
    expect(units[0]?.flags).toContain('lone surrogate')
    expect(units[1]?.flags).toContain('private-use')
    expect(units[2]?.flags).toContain('noncharacter')
    expect(units[4]?.flags).toContain('unassigned')
    expect(findings.find((finding) => finding.id === 'private-use')?.severity).toBe('information')
    expect(getInspectorPlaceholder(units[0]!)).toBe('U+D800')
  })

  it('recognizes a surrogate pair as one astral code point, not malformed UTF-16', () => {
    const { units, findings } = inspect('\uD83D\uDE00')
    expect(units).toHaveLength(1)
    expect(findings).toHaveLength(0)
  })

  it('variation selectors are invisible and informational when following a base', () => {
    const { units, findings, summary } = inspect('❤️')
    expect(summary.invisibleCount).toBe(1)
    expect(filterInspectorUnits(units, 'invisible').map((unit) => unit.cp)).toEqual([0xfe0f])
    expect(findings[0]).toMatchObject({ id: 'variation', severity: 'information' })
    expect(inspect('\uFE0F').findings[0]?.id).toBe('orphan-variation')
  })

  it('uses an explicit orphan-mark heuristic without flagging normal combining sequences', () => {
    expect(inspect('e\u0301\u0300').findings).toHaveLength(0)
    expect(inspect('\u0301').findings[0]?.id).toBe('orphan-combining')
    expect(inspect(' \u0301').findings[0]?.id).toBe('orphan-combining')
  })

  it('reports mixed horizontal spaces with per-variant counts, not spaces plus breaks', () => {
    expect(inspect('a b\nc').findings.some((finding) =>
      finding.id === 'mixed-spaces')).toBe(false)
    const { findings } = inspect('a b\u00A0c\u00A0d')
    const mixed = findings.find((finding) => finding.id === 'mixed-spaces')
    expect(mixed?.description).toContain('U+0020 × 1, U+00A0 × 2')
    expect(mixed?.occurrences).toHaveLength(3)
  })

  it('reports clustered formats as ranges and retains every occurrence', () => {
    const { units, findings } = inspect('x\u200D\u200Dy\u200B\u2060')
    const clustered = findings.find((finding) => finding.id === 'clustered-format')
    expect(clustered?.occurrences).toEqual([
      { startIndex: 1, endIndex: 3, utf16Start: 1, utf16End: 3 },
      { startIndex: 4, endIndex: 6, utf16Start: 4, utf16End: 6 },
    ])
    expect(filterInspectorUnits(units, 'findings')).toHaveLength(4)
    const counts = units.map((unit) => unit.findingIds.length)
    buildInspectorFindings(units)
    expect(units.map((unit) => unit.findingIds.length)).toEqual(counts)
  })

  it('counts groups once despite overlapping affected characters', () => {
    const { findings, summary, units } = inspect(' \u00A0')
    expect(summary.findingGroupCount).toBe(findings.length)
    expect(summary.checkOrProblemGroupCount).toBe(2)
    expect(filterInspectorUnits(units, 'findings')).toHaveLength(2)
    expect(getInspectorContext(units, 1)).toBe('[SPACE][NBSP]')
  })

  it('round-trips whole-text JavaScript literals including malformed values', () => {
    const input = 'A😀\uD800"\n\r\\\u2028'
    const { units } = inspect(input)
    const literal = formatJavaScriptEscapedText(units)
    expect(Function(`return ${literal}`)()).toBe(input)
    expect(formatCodePointList(units)).toContain('U+1F600 U+D800')
    expect(formatHtmlEscapedText(inspect('A\u200D').units)).toBe('&#x41;&#x200D;')
  })

  it('identifies lossy HTML values without labeling all controls as remapped', () => {
    expect(getHtmlLossyCount(inspect('\u0000\uD800\u0080\u0085\n\u0081').units)).toBe(4)
  })
})
