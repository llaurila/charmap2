// @vitest-environment jsdom

import { act, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockCharacters } from '../data/mockCharacters'
import { useUnicodeData } from './useUnicodeData'

const { loadBlockRecords, loadSearchIndex, loadBlockIndex } = vi.hoisted(() => ({
  loadBlockRecords: vi.fn(), loadSearchIndex: vi.fn(), loadBlockIndex: vi.fn(),
}))

vi.mock('../data/unicode', () => ({ loadBlockRecords, loadSearchIndex, loadBlockIndex }))

type HookValue = ReturnType<typeof useUnicodeData>
const block = {
  count: 10, end: 0x206f, file: 'general-punctuation.json',
  id: 'general-punctuation', label: 'General Punctuation', start: 0x2000,
}

function Harness({ onRender }: { onRender: (value: HookValue) => void }) {
  onRender(useUnicodeData())
  return null
}

describe('useUnicodeData under Strict Mode', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root
  let latest: HookValue
  beforeEach(() => {
    loadSearchIndex.mockResolvedValue(mockCharacters)
    loadBlockIndex.mockResolvedValue([block])
    loadBlockRecords.mockResolvedValue(mockCharacters)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = ReactDOM.createRoot(container)
  })
  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
    vi.clearAllMocks()
  })

  it('accepts lazy block responses after development effect replay', async () => {
    await act(async () => {
      root.render(<StrictMode><Harness onRender={(value) => { latest = value }} /></StrictMode>)
    })
    expect(latest!.isReady).toBe(true)
    await act(async () => { latest.loadBlock(block) })
    expect(latest!.loadedBlocks[block.id]).toEqual(mockCharacters)
  })

  it('reports lazy-loading errors after development effect replay', async () => {
    loadBlockRecords.mockRejectedValueOnce(new Error('Block unavailable'))
    await act(async () => {
      root.render(<StrictMode><Harness onRender={(value) => { latest = value }} /></StrictMode>)
    })
    await act(async () => { latest.loadBlock(block) })
    expect(latest!.loadError).toBe('Block unavailable')
  })
})
