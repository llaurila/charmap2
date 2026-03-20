import { describe, expect, it } from 'vitest'
import { getInstallSurface, isInstalledDisplayMode } from './install'

describe('install helpers', () => {
  it('detects Chromium browsers outside iOS', () => {
    const chromeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

    expect(
      getInstallSurface({
        maxTouchPoints: 0,
        platform: 'Win32',
        userAgent: chromeUa,
        vendor: 'Google Inc.',
      }),
    ).toBe('chromium')
  })

  it('treats iPhone and iPad browsers as iOS install surfaces', () => {
    const iphoneUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ' +
      'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    const ipadUa =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

    expect(
      getInstallSurface({
        maxTouchPoints: 5,
        platform: 'iPhone',
        userAgent: iphoneUa,
        vendor: 'Apple Computer, Inc.',
      }),
    ).toBe('ios')

    expect(
      getInstallSurface({
        maxTouchPoints: 5,
        platform: 'MacIntel',
        userAgent: ipadUa,
        vendor: 'Apple Computer, Inc.',
      }),
    ).toBe('ios')
  })

  it('detects Safari on macOS separately', () => {
    const safariMacUa =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.5 Safari/605.1.15'

    expect(
      getInstallSurface({
        maxTouchPoints: 0,
        platform: 'MacIntel',
        userAgent: safariMacUa,
        vendor: 'Apple Computer, Inc.',
      }),
    ).toBe('safari-macos')
  })

  it('falls back to other browsers when no install surface is targeted', () => {
    const firefoxUa =
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) ' +
      'Gecko/20100101 Firefox/127.0'

    expect(
      getInstallSurface({
        maxTouchPoints: 0,
        platform: 'Linux x86_64',
        userAgent: firefoxUa,
        vendor: '',
      }),
    ).toBe('other')
  })

  it('detects standalone display modes', () => {
    expect(
      isInstalledDisplayMode({
        standalone: false,
        minimalUi: false,
        navigatorStandalone: false,
      }),
    ).toBe(false)

    expect(
      isInstalledDisplayMode({
        standalone: true,
        minimalUi: false,
        navigatorStandalone: false,
      }),
    ).toBe(true)

    expect(
      isInstalledDisplayMode({
        standalone: false,
        minimalUi: false,
        navigatorStandalone: true,
      }),
    ).toBe(true)
  })
})
