import { describe, expect, it } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import { getSingleCodePointQuery, normalizeSearchTerm, searchCharacters } from './search'

describe('search helpers', () => {
  it('folds spaces, hyphens, and underscores together', () => {
    expect(normalizeSearchTerm(' zero-width_joiner ')).toBe('zero width joiner')
  })

  it('prioritizes exact code point matches', () => {
    const [result] = searchCharacters(mockCharacters, 'U+200D')
    expect(result?.cp).toBe(0x200d)
  })

  it('finds aliases and abbreviations', () => {
    const [result] = searchCharacters(mockCharacters, 'nbsp')
    expect(result?.cp).toBe(0x00a0)
  })

  it('uses fuzzy fallback when exact matching fails', () => {
    const [result] = searchCharacters(mockCharacters, 'rgt arrw')
    expect(result?.cp).toBe(0x2192)
  })

  it('keeps direct character lookup without trimming away whitespace', () => {
    expect(getSingleCodePointQuery(' ')).toBe(0x20)
  })
})
