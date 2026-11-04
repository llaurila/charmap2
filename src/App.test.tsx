// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_VERSION } from './constants/app'
import { PINNED_STORAGE_KEY } from './hooks/usePinnedCharacters'

const { useInstallPromptMock, useUpdateCheckMock } = vi.hoisted(() => ({
  useInstallPromptMock: vi.fn(),
  useUpdateCheckMock: vi.fn(),
}))

vi.mock('./hooks/useInstallPrompt', () => ({
  useInstallPrompt: useInstallPromptMock,
}))

vi.mock('./hooks/useUpdateCheck', () => ({
  useUpdateCheck: useUpdateCheckMock,
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
    useInstallPromptMock.mockReturnValue({
      deferredInstallPrompt: null,
      dismissInstallPanel: vi.fn(),
      handleInstallClick: async () => {},
      installSurface: 'other' as const,
      shouldShowInstallPanel: false,
    })
    useUpdateCheckMock.mockReturnValue({
      acknowledgeUpdate: vi.fn(),
      currentBuildId: 'current-build',
      currentVersion: APP_VERSION,
      isUpdateAvailable: false,
      latestBuildId: null,
      latestVersion: null,
      reloadToUpdate: vi.fn(),
    })
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
    useInstallPromptMock.mockReset()
    useUpdateCheckMock.mockReset()
    Reflect.deleteProperty(navigator, 'clipboard')
    vi.useRealTimers()
  })

  const clickButton = async (label: string): Promise<void> => {
    const button = Array.from(container.querySelectorAll('button')).find((entry) =>
      entry.getAttribute('aria-label') === label || entry.textContent === label)
    expect(button, `Button: ${label}`).toBeInstanceOf(HTMLButtonElement)
    await act(async () => { button?.click() })
  }

  const enterInspector = async (): Promise<void> => {
    await act(async () => { root.render(<App />) })
    await clickButton('Text Inspector')
  }

  const typeInspectorText = async (value: string): Promise<void> => {
    const textarea = container.querySelector('.text-inspector-input textarea')
    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      descriptor?.set?.call(textarea, value)
      textarea?.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it('navigates findings in context and selects individual repeated occurrences', async () => {
    await enterInspector()
    await clickButton('No-break spaces')
    expect(container.querySelectorAll('.inspector-preview__unit.is-hidden')).toHaveLength(3)
    await clickButton('Next No-break spaces occurrence')
    expect(container.querySelector('.inspector-preview__unit.is-selected')?.textContent)
      .toBe('[NBSP]')
    expect(container.querySelector('.text-inspector-row.is-selected')?.textContent)
      .toContain('L2:7')
    expect(container.querySelector('.inspector-detail-context')?.textContent)
      .toContain('line 2, column 7')
    await clickButton('Inspect character for No-break spaces')
    expect(container.querySelector('.severity-check')?.textContent).toContain('2 of 2')
    await clickButton('Previous No-break spaces occurrence')
    expect(container.querySelector('.text-inspector-row.is-selected')?.textContent)
      .toContain('L1:7')
  })

  it('reveals finding context without scrolling away to the breakdown', async () => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
    const scrolled: Element[] = []
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: Element) { scrolled.push(this) },
    })
    try {
      await enterInspector()
      await clickButton('No-break spaces')
      await clickButton('Next No-break spaces occurrence')
      expect(scrolled).toHaveLength(1)
      expect(scrolled[0]?.classList.contains('inspector-preview__unit')).toBe(true)
    } finally {
      if (original) Object.defineProperty(Element.prototype, 'scrollIntoView', original)
      else Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    }
  })

  it('keeps pending search state separate from inspector selection', async () => {
    await act(async () => { root.render(<App />) })
    await act(async () => {
      setInputValue(container.querySelector('input[type="search"]') as HTMLInputElement, 'arrow')
    })
    await clickButton('Text Inspector')
    await typeInspectorText('A\u200D')
    await act(async () => {
      (container.querySelectorAll('.text-inspector-row')[1] as HTMLButtonElement).click()
      vi.advanceTimersByTime(500)
    })
    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('ZERO WIDTH JOINER')
    await clickButton('Search')
    const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement
    expect(searchInput.value).toBe('arrow')
    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('RIGHTWARDS ARROW')
    await clickButton('Text Inspector')
    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('ZERO WIDTH JOINER')
    await typeInspectorText('B')
    expect(container.querySelector('.detail-panel h2')).toBeNull()
    expect(container.querySelector('.inspector-detail-context')).toBeNull()
  })

  it('distinguishes a filtered empty view from empty input and does not flag normal structure',
    async () => {
      await enterInspector()
      await typeInspectorText('hello\tworld\n')
      expect(container.querySelectorAll('.severity-problem, .severity-check')).toHaveLength(0)
      await clickButton('Findings')
      expect(container.textContent).toContain('No matches for this filter')
      expect(container.textContent).not.toContain('No text inspected yet')
      expect((container.querySelector('textarea') as HTMLTextAreaElement).value)
        .toBe('hello\tworld\n')
      await clickButton('Show all characters')
      expect(container.querySelectorAll('.text-inspector-row')).toHaveLength(12)
      await clickButton('Clear text')
      expect(container.textContent).toContain('No text inspected yet')
      expect(document.activeElement).toBe(container.querySelector('textarea'))
    })

  it('supports menu keyboard navigation, Escape, outside click, and whole-input exports',
    async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true, value: { writeText },
      })
      await enterInspector()
      await typeInspectorText('A\u00A0')
      await clickButton('Findings')
      await clickButton('Copy and export text')
      expect(document.activeElement?.textContent).toBe('Raw text')
      await act(async () => {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowDown', bubbles: true,
        }))
      })
      expect(document.activeElement?.textContent).toBe('Code point list')
      await act(async () => {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Escape', bubbles: true,
        }))
      })
      const trigger = container.querySelector('button[aria-label="Copy and export text"]')
      expect(document.activeElement).toBe(trigger)
      expect(container.querySelector('[role="menu"]')).toBeNull()
      await clickButton('Copy and export text')
      await act(async () => {
        container.querySelector('textarea')?.dispatchEvent(new Event('pointerdown', {
          bubbles: true,
        }))
      })
      expect(container.querySelector('[role="menu"]')).toBeNull()
      await clickButton('Copy and export text')
      await clickButton('JavaScript string literal')
      const output = container.querySelector('textarea[aria-label="Export output"]')
      expect(document.activeElement).toBe(output)
      expect((output as HTMLTextAreaElement).value).toBe('"\\u0041\\u00A0"')
      await clickButton('Copy JavaScript string literal')
      expect(writeText).toHaveBeenCalledWith('"\\u0041\\u00A0"')
      expect(container.textContent).toContain('JavaScript string literal copied')
      await clickButton('Close preview')
      expect(document.activeElement).toBe(trigger)
      await clickButton('Clear text')
      expect(container.textContent).not.toContain('JavaScript string literal copied')
    })

  it('warns explicitly before copying HTML that cannot preserve a lone surrogate', async () => {
    await enterInspector()
    await typeInspectorText('A\uD800')
    await clickButton('Copy and export text')
    await clickButton('HTML numeric references')
    expect(container.textContent).toContain('Lossy HTML output: 1 values')
    expect(container.querySelector('textarea[aria-label="Export output"]')?.textContent)
      .toBe('&#x41;&#xD800;')
    expect(Array.from(container.querySelectorAll('button')).some((button) =>
      button.textContent === 'Copy lossy HTML output')).toBe(true)
  })

  it('pages long previews and rows instead of rendering every character at once', async () => {
    await enterInspector()
    await typeInspectorText('A'.repeat(350))
    expect(container.querySelectorAll('.text-inspector-row')).toHaveLength(100)
    expect(container.querySelectorAll('.inspector-preview__unit')).toHaveLength(200)
    await clickButton('Next breakdown page')
    expect(container.querySelector('.text-inspector-row')?.textContent).toContain('#101')
    await clickButton('Next preview page')
    expect(container.querySelectorAll('.inspector-preview__unit')).toHaveLength(150)
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
    expect(container.textContent).toContain(`Charmap2 v${APP_VERSION}`)
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

  it('shows a reload prompt when a newer build is available', async () => {
    const acknowledgeUpdate = vi.fn()
    const reloadToUpdate = vi.fn()

    useUpdateCheckMock.mockReturnValue({
      acknowledgeUpdate,
      currentBuildId: 'current-build',
      currentVersion: APP_VERSION,
      isUpdateAvailable: true,
      latestBuildId: 'next-build',
      latestVersion: '0.1.3',
      reloadToUpdate,
    })

    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Reload to get the latest build')
    expect(container.textContent).toContain(`swap from v${APP_VERSION} (current-build) to v0.1.3 (next-build)`)

    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Reload now')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(reloadToUpdate).toHaveBeenCalledTimes(1)

    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Dismiss')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(acknowledgeUpdate).toHaveBeenCalledTimes(1)
  })

  it('collapses the header on mobile and expands it on demand', async () => {
    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    const hero = container.querySelector('.hero')
    const toggle = container.querySelector('button[aria-label="Expand header"]')

    expect(hero).toBeInstanceOf(HTMLElement)
    expect(toggle).toBeInstanceOf(HTMLButtonElement)
    expect(hero?.classList.contains('is-expanded')).toBe(false)
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(hero?.classList.contains('is-expanded')).toBe(true)
    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('button[aria-label="Collapse header"]')).toBe(toggle)
  })

  it('dismisses the install panel for the current session', async () => {
    const dismissInstallPanel = vi.fn()

    useInstallPromptMock.mockReturnValue({
      deferredInstallPrompt: null,
      dismissInstallPanel,
      handleInstallClick: async () => {},
      installSurface: 'ios' as const,
      shouldShowInstallPanel: true,
    })

    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    const dismissButton = container.querySelector('button[aria-label="Hide install panel"]')

    expect(dismissButton).toBeInstanceOf(HTMLButtonElement)

    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(dismissInstallPanel).toHaveBeenCalledTimes(1)
  })

  it('switches to text inspector mode and inspects pasted text', async () => {
    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    await act(async () => {
      Array.from(container.querySelectorAll('.hero-mode-switch__button'))
        .find((button) => button.textContent === 'Text Inspector')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const textarea = container.querySelector('textarea')

    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    expect(document.activeElement).toBe(textarea)
    expect(container.querySelector('.hero textarea')).toBeNull()
    expect(container.querySelector('.search-panel')).toBeNull()

    await act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      descriptor?.set?.call(textarea, 'A\u00A0\u200D')
      textarea?.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.textContent).toContain('3 code points')
    expect(container.textContent).toContain('Findings')
    expect(container.textContent).toContain('these spaces prevent a line break')

    const inspectorRows = Array.from(container.querySelectorAll('.text-inspector-row'))

    expect(inspectorRows).toHaveLength(3)

    await act(async () => {
      inspectorRows[2]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.querySelector('.detail-panel h2')?.textContent).toBe('ZERO WIDTH JOINER')
  })

  it('scrolls to the detail panel when a pinned character is selected on mobile', async () => {
    const scrollTo = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(max-width: 840px)',
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })

    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect

    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if ((this as Element).classList.contains('pinned-panel')) {
        return {
          bottom: 72,
          height: 64,
          left: 0,
          right: 390,
          top: 8,
          width: 390,
          x: 0,
          y: 8,
          toJSON: () => ({}),
        }
      }

      if ((this as Element).classList.contains('detail-panel')) {
        return {
          bottom: 760,
          height: 520,
          left: 0,
          right: 390,
          top: 240,
          width: 390,
          x: 0,
          y: 240,
          toJSON: () => ({}),
        }
      }

      return originalGetBoundingClientRect.call(this)
    }

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 160,
    })

    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    const selectedName = container.querySelector('.detail-panel h2')?.textContent ?? ''
    const pinButton = container.querySelector(`button[aria-label="Pin ${selectedName}"]`)

    expect(pinButton).toBeInstanceOf(HTMLButtonElement)

    await act(async () => {
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const pinnedButton = container.querySelector(`button[aria-label="Show details for ${selectedName}"]`)

    expect(pinnedButton).toBeInstanceOf(HTMLButtonElement)

    await act(async () => {
      pinnedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 316 })

    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  it('hides the pinned panel on mobile when there are no pinned characters', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(max-width: 840px)',
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })

    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    expect(container.querySelector('.pinned-panel')).toBeNull()
  })

  it('scrolls to the detail panel when a search result is selected on mobile', async () => {
    const scrollTo = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(max-width: 840px)',
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })

    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect

    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if ((this as Element).classList.contains('pinned-panel')) {
        return {
          bottom: 72,
          height: 64,
          left: 0,
          right: 390,
          top: 8,
          width: 390,
          x: 0,
          y: 8,
          toJSON: () => ({}),
        }
      }

      if ((this as Element).classList.contains('detail-panel')) {
        return {
          bottom: 760,
          height: 520,
          left: 0,
          right: 390,
          top: 240,
          width: 390,
          x: 0,
          y: 240,
          toJSON: () => ({}),
        }
      }

      return originalGetBoundingClientRect.call(this)
    }

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 160,
    })

    await act(async () => {
      root.render(<App />)
      await Promise.resolve()
    })

    await act(async () => {
      container
        .querySelector('#result-8596')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 400 })

    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })
})
