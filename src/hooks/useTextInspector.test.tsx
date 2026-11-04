// @vitest-environment jsdom

import { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchRecord } from '../types/unicode'
import {
  analyzeText, buildInspectorSummary, LIVE_ANALYSIS_LIMIT, MAX_INSPECTOR_INPUT,
} from '../utils/textInspector'
import { buildInspectorFindings } from '../utils/textInspectorFindings'
import { useTextInspector } from './useTextInspector'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  terminate = vi.fn()
  postMessage = vi.fn()
  constructor() { FakeWorker.instances.push(this) }
  complete(input: string) {
    const units = analyzeText(input)
    const findings = buildInspectorFindings(units)
    this.onmessage?.({ data: {
      units, findings, summary: buildInspectorSummary(units, findings),
    } } as MessageEvent)
  }
}

type HookValue = ReturnType<typeof useTextInspector>
const searchIndexByCp = new Map<number, SearchRecord>()
const loadedRecordsByCp = new Map()
const blockIndex: [] = []
const loadBlock = vi.fn()
const setSelectedCp = vi.fn()

function Harness({ onRender, isReady }: {
  onRender: (value: HookValue) => void
  isReady: boolean
}) {
  onRender(useTextInspector({
    blockIndex, isReady, loadBlock, loadedRecordsByCp, searchIndexByCp, setSelectedCp,
  }))
  return null
}

describe('useTextInspector analysis scheduling', () => {
  let container: HTMLDivElement
  let root: ReactDOM.Root
  let latest: HookValue
  const render = (isReady = true) => {
    act(() => {
      root.render(<Harness isReady={isReady} onRender={(value) => { latest = value }} />)
    })
  }
  beforeEach(() => {
    FakeWorker.instances = []
    vi.stubGlobal('Worker', FakeWorker)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = ReactDOM.createRoot(container)
    render()
  })
  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keeps short analysis live and requires explicit background analysis for long input', () => {
    act(() => { latest.onInputChange('hello') })
    expect(latest.isCurrent).toBe(true)
    expect(FakeWorker.instances).toHaveLength(0)
    const text = 'A'.repeat(LIVE_ANALYSIS_LIMIT + 1)
    act(() => { latest.onInputChange(text) })
    expect(latest.isCurrent).toBe(false)
    expect(latest.units).toHaveLength(0)
    act(() => { latest.onAnalyze() })
    expect(latest.isAnalyzing).toBe(true)
    const worker = FakeWorker.instances[0]!
    expect(worker.postMessage).toHaveBeenCalledWith({ input: text, records: [] })
    act(() => { worker.complete(text) })
    expect(latest.isCurrent).toBe(true)
    expect(latest.units).toHaveLength(text.length)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it('rejects obsolete worker results after an edit', () => {
    const oldText = 'A'.repeat(LIVE_ANALYSIS_LIMIT + 1)
    act(() => { latest.onInputChange(oldText) })
    act(() => { latest.onAnalyze() })
    const oldWorker = FakeWorker.instances[0]!
    act(() => { latest.onInputChange('B') })
    expect(oldWorker.terminate).toHaveBeenCalledOnce()
    act(() => { oldWorker.complete(oldText) })
    expect(latest.input).toBe('B')
    expect(latest.units.map((unit) => unit.text).join('')).toBe('B')
    expect(latest.isAnalyzing).toBe(false)
  })

  it('retains unsupported input without truncation or starting a worker', () => {
    const input = 'A'.repeat(MAX_INSPECTOR_INPUT + 1)
    act(() => { latest.onInputChange(input) })
    act(() => { latest.onAnalyze() })
    expect(latest.input).toBe(input)
    expect(latest.isUnsupported).toBe(true)
    expect(latest.isCurrent).toBe(false)
    expect(FakeWorker.instances).toHaveLength(0)
  })

  it('shows metadata readiness honestly and analyzes retained short input when ready', () => {
    render(false)
    act(() => { latest.onInputChange('\u202E') })
    expect(latest.isCurrent).toBe(false)
    expect(latest.input).toBe('\u202E')
    render(true)
    expect(latest.findings[0]?.id).toBe('bidi-override')
  })

  it('reports background errors and allows retry', () => {
    act(() => { latest.onInputChange('A'.repeat(LIVE_ANALYSIS_LIMIT + 1)) })
    act(() => { latest.onAnalyze() })
    act(() => { FakeWorker.instances[0]!.onerror?.() })
    expect(latest.isCurrent).toBe(false)
    expect(latest.isAnalyzing).toBe(false)
    expect(latest.error).toContain('Analysis failed')
    act(() => { latest.onAnalyze() })
    expect(FakeWorker.instances).toHaveLength(2)
    expect(latest.error).toBe('')
  })

  it('clears the selected occurrence after edits and terminates a worker on unmount', () => {
    act(() => { latest.onInputChange('AB') })
    act(() => { latest.onSelectUnit(latest.units[1]!) })
    expect(latest.selectedIndex).toBe(1)
    act(() => { latest.onInputChange('A'.repeat(LIVE_ANALYSIS_LIMIT + 1)) })
    expect(latest.selectedIndex).toBeNull()
    expect(latest.detailRecord).toBeNull()
    act(() => { latest.onAnalyze() })
    act(() => { root.unmount() })
    expect(FakeWorker.instances[0]!.terminate).toHaveBeenCalledOnce()
    root = ReactDOM.createRoot(container)
  })
})
