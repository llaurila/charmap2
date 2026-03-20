// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInstallPrompt } from './useInstallPrompt'

type HookValue = ReturnType<typeof useInstallPrompt>

type MatchMediaMock = {
  matches: boolean
  media: string
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  dispatchChange: (matches: boolean) => void
}

function HookHarness({ onRender }: { onRender: (value: HookValue) => void }) {
  onRender(useInstallPrompt())
  return null
}

const createMatchMediaMock = (query: string, initialMatches: boolean): MatchMediaMock => {
  const listeners = new Set<EventListener>()
  let matches = initialMatches

  return {
    get matches() {
      return matches
    },
    media: query,
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
    dispatchChange: (nextMatches) => {
      matches = nextMatches
      const event = new Event('change')
      Object.defineProperty(event, 'matches', { configurable: true, value: nextMatches })
      Object.defineProperty(event, 'media', { configurable: true, value: query })
      listeners.forEach((listener) => listener(event))
    },
  }
}

const setNavigatorSnapshot = ({
  maxTouchPoints,
  platform,
  standalone,
  userAgent,
  vendor,
}: {
  maxTouchPoints: number
  platform: string
  standalone?: boolean
  userAgent: string
  vendor: string
}) => {
  const defineNavigatorValue = (key: string, value: unknown): void => {
    Object.defineProperty(window.navigator, key, {
      configurable: true,
      value,
    })
  }

  defineNavigatorValue('maxTouchPoints', maxTouchPoints)
  defineNavigatorValue('platform', platform)
  defineNavigatorValue('standalone', standalone)
  defineNavigatorValue('userAgent', userAgent)
  defineNavigatorValue('vendor', vendor)
}

const createPromptEvent = (outcome: 'accepted' | 'dismissed') => {
  const prompt = vi.fn().mockResolvedValue({ outcome, platform: 'web' })
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent

  Object.assign(event, {
    platforms: ['web'],
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })

  return { event, prompt }
}

describe('useInstallPrompt', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root
  let latestValue: HookValue | null = null
  let matchMediaMocks: Record<string, MatchMediaMock>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = ReactDOM.createRoot(container)
    matchMediaMocks = {
      '(display-mode: minimal-ui)': createMatchMediaMock('(display-mode: minimal-ui)', false),
      '(display-mode: standalone)': createMatchMediaMock('(display-mode: standalone)', false),
    }

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => matchMediaMocks[query]),
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    latestValue = null
  })

  const renderHook = (): void => {
    act(() => {
      root.render(
        <HookHarness
          onRender={(value) => {
            latestValue = value
          }}
        />,
      )
    })
  }

  const getLatestValue = (): HookValue => {
    expect(latestValue).not.toBeNull()
    return latestValue as HookValue
  }

  it('shows the Chromium install panel only after the prompt becomes available', async () => {
    setNavigatorSnapshot({
      maxTouchPoints: 0,
      platform: 'Win32',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      vendor: 'Google Inc.',
    })

    renderHook()

    expect(getLatestValue().installSurface).toBe('chromium')
    expect(getLatestValue().shouldShowInstallPanel).toBe(false)

    const promptEvent = createPromptEvent('accepted')

    await act(async () => {
      window.dispatchEvent(promptEvent.event)
      await Promise.resolve()
    })

    expect(getLatestValue().deferredInstallPrompt).toBe(promptEvent.event)
    expect(getLatestValue().shouldShowInstallPanel).toBe(true)

    await act(async () => {
      await getLatestValue().handleInstallClick()
    })

    expect(promptEvent.prompt).toHaveBeenCalledTimes(1)
    expect(getLatestValue().deferredInstallPrompt).toBeNull()
    expect(getLatestValue().shouldShowInstallPanel).toBe(false)
  })

  it('restores the deferred prompt when installation is dismissed', async () => {
    setNavigatorSnapshot({
      maxTouchPoints: 0,
      platform: 'Win32',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      vendor: 'Google Inc.',
    })

    renderHook()

    const promptEvent = createPromptEvent('dismissed')

    await act(async () => {
      window.dispatchEvent(promptEvent.event)
      await Promise.resolve()
    })

    await act(async () => {
      await getLatestValue().handleInstallClick()
    })

    expect(promptEvent.prompt).toHaveBeenCalledTimes(1)
    expect(getLatestValue().deferredInstallPrompt).toBe(promptEvent.event)
    expect(getLatestValue().shouldShowInstallPanel).toBe(true)
  })

  it('shows iOS install instructions without a prompt and hides after installation', async () => {
    setNavigatorSnapshot({
      maxTouchPoints: 5,
      platform: 'iPhone',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ' +
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      vendor: 'Apple Computer, Inc.',
    })

    renderHook()

    expect(getLatestValue().installSurface).toBe('ios')
    expect(getLatestValue().shouldShowInstallPanel).toBe(true)

    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'))
      await Promise.resolve()
    })

    expect(getLatestValue().shouldShowInstallPanel).toBe(false)
    expect(getLatestValue().deferredInstallPrompt).toBeNull()
  })
})
