import { describe, expect, it } from 'vitest'
import { createBuildMetadataUrl, hasBuildUpdate, isBuildMetadata } from './update'

describe('update helpers', () => {
  it('validates build metadata payloads', () => {
    expect(isBuildMetadata({ buildId: 'abc123', version: '0.1.2' })).toBe(true)
    expect(isBuildMetadata({ buildId: '', version: '0.1.2' })).toBe(false)
    expect(isBuildMetadata({ buildId: 'abc123' })).toBe(false)
    expect(isBuildMetadata(null)).toBe(false)
  })

  it('detects build changes by build id or version', () => {
    const current = { buildId: 'abc123', version: '0.1.2' }

    expect(hasBuildUpdate(current, { buildId: 'abc123', version: '0.1.2' })).toBe(false)
    expect(hasBuildUpdate(current, { buildId: 'def456', version: '0.1.2' })).toBe(true)
    expect(hasBuildUpdate(current, { buildId: 'abc123', version: '0.1.3' })).toBe(true)
  })

  it('creates a same-origin metadata url under the base path', () => {
    expect(
      createBuildMetadataUrl(12345, {
        baseUrl: '/charmap2/',
        origin: 'https://llaurila.github.io',
      }),
    ).toBe('https://llaurila.github.io/charmap2/build-meta.json?t=12345')
  })
})
