// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdateCheck } from './useUpdateCheck'

vi.mock('../utils/update', async () => {
  const actual = await vi.importActual<typeof import('../utils/update')>('../utils/update')

  return {
    ...actual,
    reloadWindow: vi.fn(),
  }
})

import { reloadWindow } from '../utils/update'

type HookValue = ReturnType<typeof useUpdateCheck>

function HookHarness({ onRender }: { onRender: (value: HookValue) => void }) {
  onRender(useUpdateCheck())
  return null
}

describe('useUpdateCheck', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root
  let latestValue: HookValue | null = null
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = ReactDOM.createRoot(container)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    latestValue = null
    vi.unstubAllGlobals()
    vi.mocked(reloadWindow).mockReset()
    vi.useRealTimers()
  })

  const renderHook = async (): Promise<void> => {
    await act(async () => {
      root.render(
        <HookHarness
          onRender={(value) => {
            latestValue = value
          }}
        />,
      )
      await Promise.resolve()
    })
  }

  const getLatestValue = (): HookValue => {
    expect(latestValue).not.toBeNull()
    return latestValue as HookValue
  }

  it('surfaces a new build when fetched metadata changes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ buildId: 'newbuild123456', version: '0.1.3' }),
    })

    await renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    expect(getLatestValue().isUpdateAvailable).toBe(true)
    expect(getLatestValue().latestBuildId).toBe('newbuild123456')
    expect(getLatestValue().latestVersion).toBe('0.1.3')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('checks again when the page becomes visible after the interval', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ buildId: 'newbuild123456', version: '0.1.3' }),
    })

    await renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000 + 1)
      await Promise.resolve()
    })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps a dismissed update hidden until a different build appears', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ buildId: 'newbuild123456', version: '0.1.3' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ buildId: 'newbuild123456', version: '0.1.3' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ buildId: 'newbuild999999', version: '0.1.4' }),
      })

    await renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      getLatestValue().acknowledgeUpdate()
    })

    expect(getLatestValue().isUpdateAvailable).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000)
      await Promise.resolve()
    })

    expect(getLatestValue().isUpdateAvailable).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000)
      await Promise.resolve()
    })

    expect(getLatestValue().isUpdateAvailable).toBe(true)
    expect(getLatestValue().latestBuildId).toBe('newbuild999999')
  })

  it('dismisses the banner and reloads on demand', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ buildId: 'newbuild123456', version: '0.1.3' }),
    })

    await renderHook()

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      getLatestValue().acknowledgeUpdate()
    })

    expect(getLatestValue().isUpdateAvailable).toBe(false)

    act(() => {
      getLatestValue().reloadToUpdate()
    })

    expect(reloadWindow).toHaveBeenCalledTimes(1)
  })
})
