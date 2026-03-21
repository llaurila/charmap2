// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import { PINNED_STORAGE_KEY, usePinnedCharacters } from './usePinnedCharacters'

type HookValue = ReturnType<typeof usePinnedCharacters>

function HookHarness({ onRender }: { onRender: (value: HookValue) => void }) {
  onRender(usePinnedCharacters())
  return null
}

describe('usePinnedCharacters', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root
  let latestValue: HookValue | null = null

  beforeEach(() => {
    window.localStorage.clear()
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
    window.localStorage.clear()
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

  it('restores pinned records from localStorage and removes duplicates', () => {
    const rightArrow = mockCharacters.find((record) => record.cp === 0x2192)
    const leftRightArrow = mockCharacters.find((record) => record.cp === 0x2194)

    window.localStorage.setItem(
      PINNED_STORAGE_KEY,
      JSON.stringify([rightArrow, rightArrow, leftRightArrow]),
    )

    renderHook()

    expect(getLatestValue().pinnedRecords.map((record) => record.cp)).toEqual([0x2192, 0x2194])
  })

  it('persists pinned records across remounts', () => {
    const rightArrow = mockCharacters.find((record) => record.cp === 0x2192)

    renderHook()

    act(() => {
      getLatestValue().togglePinned(rightArrow!)
    })

    expect(window.localStorage.getItem(PINNED_STORAGE_KEY)).toContain('RIGHTWARDS ARROW')

    act(() => {
      root.unmount()
    })

    root = ReactDOM.createRoot(container)
    latestValue = null

    renderHook()

    expect(getLatestValue().pinnedRecords.map((record) => record.cp)).toEqual([0x2192])
    expect(getLatestValue().isPinned(0x2192)).toBe(true)
  })

  it('falls back to an empty list for invalid storage data', () => {
    window.localStorage.setItem(PINNED_STORAGE_KEY, '{not valid json')

    renderHook()

    expect(getLatestValue().pinnedRecords).toEqual([])
  })
})
