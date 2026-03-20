import { describe, expect, it } from 'vitest'
import {
  classifyKind,
  getHangulSyllableName,
  isNoncharacter,
  parseCodePointRange,
  parseUnicodeData,
  synthesizeRangeName,
} from './shared'

describe('unicode helpers', () => {
  it('parses single code points and ranges', () => {
    expect(parseCodePointRange('00A0')).toEqual({ start: 0x00a0, end: 0x00a0 })
    expect(parseCodePointRange('2000..200A')).toEqual({ start: 0x2000, end: 0x200a })
  })

  it('builds Hangul syllable names algorithmically', () => {
    expect(getHangulSyllableName(0xac00)).toBe('HANGUL SYLLABLE GA')
    expect(getHangulSyllableName(0xac01)).toBe('HANGUL SYLLABLE GAG')
  })

  it('synthesizes algorithmic ideograph names', () => {
    expect(synthesizeRangeName('CJK Ideograph Extension A', 0x3400)).toBe(
      'CJK UNIFIED IDEOGRAPH-3400',
    )
    expect(synthesizeRangeName('Tangut Ideograph', 0x17000)).toBe('TANGUT IDEOGRAPH-17000')
  })

  it('expands UnicodeData range placeholders', () => {
    const parsed = parseUnicodeData([
      '3400;<CJK Ideograph Extension A, First>;Lo;0;L;;;;;N;;;;;',
      '3401;<CJK Ideograph Extension A, Last>;Lo;0;L;;;;;N;;;;;',
      'AC00;<Hangul Syllable, First>;Lo;0;L;;;;;N;;;;;',
      'AC01;<Hangul Syllable, Last>;Lo;0;L;;;;;N;;;;;',
      '0009;<control>;Cc;0;S;;;;;N;CHARACTER TABULATION;;;;',
    ].join('\n'))

    expect(parsed.map((record) => record.name)).toEqual([
      'CJK UNIFIED IDEOGRAPH-3400',
      'CJK UNIFIED IDEOGRAPH-3401',
      'HANGUL SYLLABLE GA',
      'HANGUL SYLLABLE GAG',
      '<control>',
    ])
  })

  it('classifies combining and whitespace records', () => {
    expect(classifyKind('Mn', [])).toBe('combining')
    expect(classifyKind('Zs', ['whitespace'])).toBe('whitespace')
    expect(classifyKind('Cf', [])).toBe('format')
  })

  it('detects noncharacters', () => {
    expect(isNoncharacter(0xfdd0)).toBe(true)
    expect(isNoncharacter(0x10ffff)).toBe(true)
    expect(isNoncharacter(0x0041)).toBe(false)
  })
})
