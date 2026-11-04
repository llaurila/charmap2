import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findBlockForCodePoint } from '../data/unicode'
import type {
  BlockIndexEntry, CharacterRecord, InspectorFilter, InspectorFinding, InspectorOccurrence,
  InspectorSummary,
  InspectorUnit, ResultRecord, SearchRecord,
} from '../types/unicode'
import {
  analyzeText, buildInspectorSummary, filterInspectorUnits, getInspectorContext,
  LIVE_ANALYSIS_LIMIT, MAX_INSPECTOR_INPUT,
} from '../utils/textInspector'
import { buildInspectorFindings } from '../utils/textInspectorFindings'
import {
  formatInspectorCopy, inspectorCopyFormats, type InspectorCopyFormat,
} from '../utils/textInspectorCopy'
import { useCopyFeedback } from './useCopyFeedback'

type UseTextInspectorOptions = {
  blockIndex: BlockIndexEntry[]
  isReady: boolean
  loadBlock: (block: BlockIndexEntry | undefined) => void
  loadedRecordsByCp: Map<number, ResultRecord>
  searchIndexByCp: Map<number, SearchRecord>
  setSelectedCp: React.Dispatch<React.SetStateAction<number | null>>
}

type Analysis = {
  units: InspectorUnit[]
  findings: InspectorFinding[]
  summary: InspectorSummary
}

type Selection = InspectorOccurrence & {
  findingId?: string
  occurrenceIndex?: number
  revealContext: boolean
}

const emptyAnalysis: Analysis = {
  units: [], findings: [], summary: {
    codePointCount: 0, lineCount: 0, invisibleCount: 0,
    findingGroupCount: 0, checkOrProblemGroupCount: 0,
  },
}

const getInputRecords = (input: string, index: Map<number, SearchRecord>): SearchRecord[] => {
  const unique = new Set<number>()
  for (const text of input) unique.add(text.codePointAt(0)!)
  return Array.from(unique).flatMap((cp) => {
    const record = index.get(cp)
    return record ? [record] : []
  })
}

const getFallbackDetail = (unit: InspectorUnit): ResultRecord => {
  const categories: Record<string, string> = {
    'lone surrogate': 'Cs', 'private-use': 'Co', noncharacter: 'Cn', unassigned: 'Cn',
  }
  const classification = unit.flags.find((flag) => flag in categories)
  if (!classification) return unit
  const record: CharacterRecord = {
    ...unit, category: categories[classification]!,
    description: `Retained ${classification} value. No richer character metadata is loaded.`,
  }
  return record
}

const getSelectionDetails = (
  selection: Selection | null, units: InspectorUnit[], records: Map<number, ResultRecord>,
) => {
  const selectedIndex = selection?.startIndex ?? null
  const selectedRecord = selectedIndex === null ? null : units[selectedIndex] ?? null
  const detailRecord = selectedRecord
    ? records.get(selectedRecord.cp) ?? getFallbackDetail(selectedRecord) : null
  const detailContext = selectedRecord ? {
    line: selectedRecord.line, column: selectedRecord.column,
    excerpt: getInspectorContext(units, selectedRecord.index),
  } : undefined
  return { selectedIndex, selectedRecord, detailRecord, detailContext }
}

export function useTextInspector({
  blockIndex, isReady, loadBlock, loadedRecordsByCp, searchIndexByCp, setSelectedCp,
}: UseTextInspectorOptions) {
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<InspectorFilter>('all')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [completed, setCompleted] = useState<{ input: string; analysis: Analysis } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const workerRef = useRef<Worker | null>(null)
  const { announceMessage, copiedLabel, copyValue, clearFeedback } = useCopyFeedback()
  const isLargeInput = input.length > LIVE_ANALYSIS_LIMIT
  const isUnsupported = input.length > MAX_INSPECTOR_INPUT
  const analysis = useMemo(() => {
    if (!isReady || isUnsupported) return null
    if (isLargeInput) return completed?.input === input ? completed.analysis : null
    const units = analyzeText(input, searchIndexByCp)
    const findings = buildInspectorFindings(units)
    return { units, findings, summary: buildInspectorSummary(units, findings) }
  }, [completed, input, isLargeInput, isReady, isUnsupported, searchIndexByCp])
  const units = useMemo(() => (analysis?.units ?? []).map((unit) => {
    const record = loadedRecordsByCp.get(unit.cp)
    return record ? { ...unit, name: record.name, aliases: record.aliases,
      block: record.block, script: record.script } : unit
  }), [analysis, loadedRecordsByCp])
  const visibleUnits = useMemo(() => filterInspectorUnits(units, filter), [filter, units])
  const details = getSelectionDetails(selection, units, loadedRecordsByCp)
  const { selectedRecord } = details
  const { findings, summary } = analysis ?? emptyAnalysis

  useEffect(() => {
    if (selectedRecord) loadBlock(findBlockForCodePoint(blockIndex, selectedRecord.cp))
  }, [blockIndex, loadBlock, selectedRecord])

  useEffect(() => () => workerRef.current?.terminate(), [])

  const cancelAnalysis = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsAnalyzing(false)
    setCompleted(null)
  }, [])

  const onInputChange = useCallback((value: string) => {
    cancelAnalysis()
    setInput(value)
    setSelection(null)
    setSelectedCp(null)
    setError('')
    clearFeedback()
  }, [cancelAnalysis, clearFeedback, setSelectedCp])

  const onReset = useCallback(() => {
    onInputChange('')
    setFilter('all')
  }, [onInputChange])

  const onAnalyze = useCallback(() => {
    if (!isReady || !isLargeInput || isUnsupported) return
    cancelAnalysis()
    setError('')
    setIsAnalyzing(true)
    try {
      const worker = new Worker(new URL('../workers/textInspector.worker.ts', import.meta.url), {
        type: 'module',
      })
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent<Analysis>) => {
        if (workerRef.current !== worker) return
        setCompleted({ input, analysis: event.data })
        setIsAnalyzing(false)
        worker.terminate()
        workerRef.current = null
      }
      worker.onerror = () => {
        if (workerRef.current !== worker) return
        setError('Analysis failed. Try again or inspect a smaller section of text.')
        setIsAnalyzing(false)
        worker.terminate()
        workerRef.current = null
      }
      worker.postMessage({ input, records: getInputRecords(input, searchIndexByCp) })
    } catch {
      setIsAnalyzing(false)
      setError('Background analysis is unavailable. Try inspecting a smaller section of text.')
    }
  }, [cancelAnalysis, input, isLargeInput, isReady, isUnsupported, searchIndexByCp])

  const onSelectUnit = useCallback((unit: InspectorUnit, revealContext = true) => {
    setSelection((current) => current?.startIndex === unit.index
      ? { ...current, revealContext } : {
      startIndex: unit.index, endIndex: unit.index + 1,
      utf16Start: unit.utf16Start, utf16End: unit.utf16End, revealContext,
    })
    setSelectedCp(unit.cp)
  }, [setSelectedCp])

  const onSelectFinding = useCallback((finding: InspectorFinding, occurrenceIndex = 0) => {
    const occurrence = finding.occurrences[occurrenceIndex]
    if (!occurrence) return
    setFilter('all')
    setSelection({ ...occurrence, findingId: finding.id, occurrenceIndex, revealContext: true })
    setSelectedCp(units[occurrence.startIndex]!.cp)
  }, [setSelectedCp, units])

  const onSelectFilter = useCallback((nextFilter: InspectorFilter) => {
    setFilter(nextFilter)
    setSelection(null)
    setSelectedCp(null)
  }, [setSelectedCp])

  const onCopy = useCallback(async (format: InspectorCopyFormat) => {
    const label = inspectorCopyFormats.find((entry) => entry.id === format)!.label
    try {
      await copyValue(label, formatInspectorCopy(format, input, units))
      setError('')
    } catch {
      setError('Could not copy text. Check clipboard permissions or copy from the input manually.')
    }
  }, [copyValue, input, units])

  return {
    input, filter, selection, ...details,
    units, visibleUnits, findings, summary,
    isCurrent: analysis !== null, isReady, isLargeInput, isUnsupported, isAnalyzing,
    error, announceMessage, copiedLabel, onInputChange, onReset, onAnalyze,
    onSelectUnit, onSelectFinding, onSelectFilter, onCopy,
  }
}
