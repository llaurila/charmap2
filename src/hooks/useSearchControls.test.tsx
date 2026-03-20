// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearchControls } from './useSearchControls'

type HookValue = ReturnType<typeof useSearchControls>

function HookHarness({ onRender }: { onRender: (value: HookValue) => void }) {
  onRender(useSearchControls())
  return null
}

describe('useSearchControls', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root
  let latestValue: HookValue | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = ReactDOM.createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    latestValue = null
    vi.useRealTimers()
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

  const setQueryInput = (value: string): void => {
    act(() => {
      latestValue!.setQueryInput(value)
    })
  }

  const advanceDebounce = (time: number): void => {
    act(() => {
      vi.advanceTimersByTime(time)
    })
  }

  const getLatestValue = (): HookValue => {
    expect(latestValue).not.toBeNull()
    return latestValue as HookValue
  }

  it('debounces the effective query before marking it current', () => {
    renderHook()

    expect(getLatestValue().queryInput).toBe('')
    expect(getLatestValue().query).toBe('')
    expect(getLatestValue().hasQuery).toBe(false)

    setQueryInput('arrow')

    expect(getLatestValue().queryInput).toBe('arrow')
    expect(getLatestValue().query).toBe('')
    expect(getLatestValue().searchStatusText).toBe('Waiting for typing to pause.')

    advanceDebounce(499)

    expect(getLatestValue().query).toBe('')

    advanceDebounce(1)

    expect(getLatestValue().query).toBe('arrow')
    expect(getLatestValue().hasQuery).toBe(true)
    expect(getLatestValue().searchStatusText).toBe('Search results are current.')
  })

  it('resets both the text input and active set', () => {
    renderHook()

    setQueryInput('arrow')

    act(() => {
      getLatestValue().setActiveSet('quotes')
    })

    advanceDebounce(500)

    expect(getLatestValue().activeSet).toBe('quotes')

    act(() => {
      getLatestValue().resetSearch()
    })

    expect(getLatestValue().queryInput).toBe('')
    expect(getLatestValue().activeSet).toBeUndefined()

    advanceDebounce(500)

    expect(getLatestValue().query).toBe('')
    expect(getLatestValue().hasQuery).toBe(false)
  })
})
