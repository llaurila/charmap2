// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://llaurila.github.io/charmap2/?search=private#private"}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { initializeAnalytics } from './analytics'

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('usage analytics', () => {
  it('does not load analytics in development or on other deployments', () => {
    vi.stubEnv('PROD', false)
    initializeAnalytics()
    expect(document.querySelector('script')).toBeNull()

    vi.stubEnv('PROD', true)
    vi.stubGlobal('location', new URL('https://example.com/charmap2/'))
    initializeAnalytics()
    expect(document.querySelector('script')).toBeNull()

    vi.stubGlobal('location', new URL('https://llaurila.github.io/another-project/'))
    initializeAnalytics()
    expect(document.querySelector('script')).toBeNull()
  })

  it('sends one pageview without query parameters or referrers once visible', () => {
    vi.stubEnv('PROD', true)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    initializeAnalytics()

    const script = document.querySelector<HTMLScriptElement>('script[data-goatcounter]')!
    expect(script.async).toBe(true)
    expect(script.src).toBe('https://gc.zgo.at/count.js')
    expect(script.dataset.goatcounter).toBe('https://charmap2.goatcounter.com/count')
    const settings = JSON.parse(script.dataset.goatcounterSettings!)
    expect(settings.no_onload).toBe(true)
    expect(settings.no_events).toBe(true)

    // Model the provider's payload, including its separate query-string field.
    const send = vi.fn()
    const goatcounter = {
      get_data: (): Record<string, unknown> => ({
        p: settings.path,
        t: settings.title,
        r: settings.referrer,
        q: window.location.search,
        s: 1920,
      }),
      count: () => send(goatcounter.get_data()),
    }
    vi.stubGlobal('goatcounter', goatcounter)
    script.dispatchEvent(new Event('load'))
    expect(send).not.toHaveBeenCalled()

    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(send).toHaveBeenCalledExactlyOnceWith({
      p: '/charmap2/',
      t: 'Charmap2',
      r: '',
      s: 1920,
    })
  })
})
