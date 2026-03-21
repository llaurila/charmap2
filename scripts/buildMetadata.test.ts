import { describe, expect, it, vi } from 'vitest'
import { createBuildMetadata, resolveBuildId, serializeBuildMetadata } from './buildMetadata'

describe('build metadata helpers', () => {
  it('prefers an explicit BUILD_ID environment value', () => {
    expect(resolveBuildId({ env: { BUILD_ID: 'release-2026-03-21' } })).toBe('release-2026-03-21')
  })

  it('falls back to a shortened GitHub sha', () => {
    expect(resolveBuildId({ env: { GITHUB_SHA: 'abcdef1234567890abcdef' } })).toBe('abcdef123456')
  })

  it('uses the current git sha when GitHub metadata is unavailable', () => {
    const exec = vi.fn().mockReturnValue('deadbeefcafe')

    expect(resolveBuildId({ env: {}, exec })).toBe('deadbeefcafe')
    expect(exec).toHaveBeenCalledWith('git rev-parse --short=12 HEAD')
  })

  it('falls back to a timestamp when git metadata is unavailable', () => {
    const now = () => new Date('2026-03-21T10:15:30.000Z')

    expect(
      resolveBuildId({
        env: {},
        exec: () => {
          throw new Error('git not available')
        },
        now,
      }),
    ).toBe('2026-03-21T10:15:30.000Z')
  })

  it('serializes build metadata with a trailing newline', () => {
    const metadata = createBuildMetadata('0.1.2', { env: { BUILD_ID: 'abc123' } })

    expect(serializeBuildMetadata(metadata)).toBe(
      '{\n  "buildId": "abc123",\n  "version": "0.1.2"\n}\n',
    )
  })
})
