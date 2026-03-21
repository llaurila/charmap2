// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PINNED_STORAGE_KEY } from './hooks/usePinnedCharacters'

vi.mock('./hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    deferredInstallPrompt: null,
    handleInstallClick: async () => {},
    installSurface: 'other' as const,
    shouldShowInstallPanel: false,
  }),
}))

vi.mock('./hooks/useResultsGrid', () => ({
  useResultsGrid: () => ({
    gridHeight: 720,
    gridScrollTop: 0,
    gridWidth: 900,
    setGridScrollTop: vi.fn(),
  }),
}))

vi.mock('./hooks/useUnicodeData', async () => {
  const React = await import('react')
  const { mockCharacters } = await import('./data/mockCharacters')

  const searchIndex = mockCharacters
    .filter((record) => record.cp !== 0x200d)
    .map((record) => ({
      aliases: record.aliases,
      block: record.block,
      cp: record.cp,
      featuredIn: record.featuredIn,
      keywords: record.keywords,
      kind: record.kind,
      name: record.name,
      script: record.script,
    }))

  const blockIndex = [
    {
      count: 13,
      end: 0x206f,
      file: 'general-punctuation.json',
      id: 'general-punctuation',
      label: 'General Punctuation',
      start: 0x2000,
    },
    {
      count: 112,
      end: 0x21ff,
      file: 'arrows.json',
      id: 'arrows',
      label: 'Arrows',
      start: 0x2190,
    },
  ]

  const loadedBlocks = {
    'general-punctuation': mockCharacters.filter(
      (record) => record.block === 'General Punctuation',
    ),
  }
  const loadBlock = vi.fn()

  return {
    useUnicodeData: () => {
      const [selectedCp, setSelectedCp] = React.useState<number | null>(searchIndex[0]?.cp ?? null)

      return {
        blockIndex,
        isReady: true,
        loadedBlocks,
        loadBlock,
        loadError: null,
        searchIndex,
        selectedCp,
        setSelectedCp,
      }
    },
  }
})

import App from './App'

const setInputValue = (input: HTMLInputElement, value: string): void => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('App', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root

  beforeEach(() => {
    vi.useFakeTimers()
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
    window.localStorage.clear()
    vi.useRealTimers()
  })

  it('updates detail selection and supports direct lookup fallback', async () => {
    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    const input = container.querySelector('input[type="search"]')

    expect(input).toBeInstanceOf(HTMLInputElement)

    await act(async () => {
      setInputValue(input as HTMLInputElement, 'arrow')
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('RIGHTWARDS ARROW')

    await act(async () => {
      container
        .querySelector('#result-8596')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('LEFT RIGHT ARROW')

    await act(async () => {
      setInputValue(input as HTMLInputElement, 'U+200D')
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('ZERO WIDTH JOINER')
    expect(container.textContent).toContain('Exact code point lookup')
  })

  it(
    'pins characters, clears search when reselected, and restores them after remount',
    async () => {
      await act(async () => {
        root.render(<App />)
        await Promise.resolve()
      })

      const input = container.querySelector('input[type="search"]')

      expect(input).toBeInstanceOf(HTMLInputElement)

      await act(async () => {
        setInputValue(input as HTMLInputElement, 'arrow')
        await Promise.resolve()
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
        await Promise.resolve()
      })

      expect(container.querySelector('.detail-panel h2')?.textContent).toBe('RIGHTWARDS ARROW')

      await act(async () => {
        container
          .querySelector('button[aria-label="Pin RIGHTWARDS ARROW"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await Promise.resolve()
      })

      expect(
        container.querySelector('button[aria-label="Show details for RIGHTWARDS ARROW"]'),
      ).toBeInstanceOf(HTMLButtonElement)
      expect(window.localStorage.getItem(PINNED_STORAGE_KEY)).toContain('RIGHTWARDS ARROW')

      await act(async () => {
        setInputValue(input as HTMLInputElement, 'quote')
        await Promise.resolve()
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
        await Promise.resolve()
      })

      expect((input as HTMLInputElement).value).toBe('quote')
      expect(container.querySelector('.detail-panel h2')?.textContent).not.toBe('RIGHTWARDS ARROW')

      await act(async () => {
        container
          .querySelector('button[aria-label="Show details for RIGHTWARDS ARROW"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await Promise.resolve()
      })

      expect((input as HTMLInputElement).value).toBe('')
      expect(container.querySelector('.detail-panel h2')?.textContent).toBe('RIGHTWARDS ARROW')

      await act(async () => {
        root.unmount()
      })

      root = ReactDOM.createRoot(container)

      await act(async () => {
        root.render(<App />)
        await Promise.resolve()
      })

      expect(
        container.querySelector('button[aria-label="Show details for RIGHTWARDS ARROW"]'),
      ).toBeInstanceOf(HTMLButtonElement)
    },
  )
})
