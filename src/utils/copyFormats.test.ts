import { describe, expect, it } from 'vitest'
import { formatCodePoint, getCopyFormats } from './copyFormats'
import type { CharacterRecord } from '../types/unicode'

const sample: CharacterRecord = {
  cp: 0x1f642,
  name: 'SLIGHTLY SMILING FACE',
  block: 'Emoticons',
  script: 'Common',
  category: 'So',
  kind: 'glyph',
}

describe('copy format helpers', () => {
  it('formats uppercase code points', () => {
    expect(formatCodePoint(0x00a0)).toBe('U+00A0')
  })

  it('uses braced JavaScript escapes for astral code points', () => {
    const javascriptCopy = getCopyFormats(sample).find((entry) => entry.id === 'javascript')
    expect(javascriptCopy?.value).toBe('\\u{1F642}')
  })
})
