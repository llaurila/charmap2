import { useCallback, useMemo, useState } from 'react'
import type {
  InspectorFilter,
  SearchRecord,
  InspectorSummary,
  InspectorUnit,
  InspectorWarning,
  ResultRecord,
} from '../types/unicode'
import {
  analyzeText,
  buildInspectorSummary,
  buildInspectorWarnings,
  filterInspectorUnits,
  formatCodePointList,
  formatHtmlEscapedText,
  formatJavaScriptEscapedText,
  getInspectorFilterLabel,
} from '../utils/textInspector'
import { useCopyFeedback } from './useCopyFeedback'

type UseTextInspectorOptions = {
  loadedRecordsByCp: Map<number, ResultRecord>
  searchIndex: SearchRecord[]
  setSelectedCp: React.Dispatch<React.SetStateAction<number | null>>
}

type InspectorCopyAction = {
  id: 'raw' | 'code-points' | 'javascript' | 'html'
  label: string
  value: string
}

type UseTextInspectorResult = {
  actions: InspectorCopyAction[]
  announceMessage: string
  copiedLabel: string | null
  filter: InspectorFilter
  filterLabel: string
  input: string
  isMenuOpen: boolean
  onCopyAction: (action: InspectorCopyAction) => Promise<void>
  onInputChange: (value: string) => void
  onJumpToWarning: (warning: InspectorWarning) => void
  onReset: () => void
  onSelectFilter: (filter: InspectorFilter) => void
  onSelectUnit: (unit: InspectorUnit) => void
  onToggleMenu: () => void
  selectedRecord: SearchRecord | null
  selectedIndex: number | null
  summary: InspectorSummary
  units: InspectorUnit[]
  visibleUnits: InspectorUnit[]
  warnings: InspectorWarning[]
}

export function useTextInspector({
  loadedRecordsByCp,
  searchIndex,
  setSelectedCp,
}: UseTextInspectorOptions): UseTextInspectorResult {
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<InspectorFilter>('all')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { announceMessage, copiedLabel, copyValue } = useCopyFeedback()

  const units = useMemo(
    () => analyzeText(input, searchIndex, loadedRecordsByCp),
    [input, loadedRecordsByCp, searchIndex],
  )
  const warnings = useMemo(() => buildInspectorWarnings(units), [units])
  const summary = useMemo(() => buildInspectorSummary(units, warnings), [units, warnings])
  const visibleUnits = useMemo(() => filterInspectorUnits(units, filter), [filter, units])
  const filterLabel = useMemo(() => getInspectorFilterLabel(filter), [filter])
  const selectedRecord = useMemo<SearchRecord | null>(() => {
    if (selectedIndex === null) {
      return null
    }

    const unit = units.find((entry) => entry.index === selectedIndex)

    if (!unit) {
      return null
    }

    return {
      aliases: unit.aliases,
      block: unit.block,
      cp: unit.cp,
      kind: unit.kind,
      name: unit.name,
      script: unit.script,
    }
  }, [selectedIndex, units])
  const actions = useMemo<InspectorCopyAction[]>(
    () => [
      {
        id: 'raw',
        label: 'Raw text',
        value: input,
      },
      {
        id: 'code-points',
        label: 'Code point list',
        value: formatCodePointList(units),
      },
      {
        id: 'javascript',
        label: 'JavaScript escaped string',
        value: formatJavaScriptEscapedText(units),
      },
      {
        id: 'html',
        label: 'HTML escaped string',
        value: formatHtmlEscapedText(units),
      },
    ],
    [input, units],
  )

  const handleInputChange = useCallback((value: string): void => {
    setInput(value)
    setIsMenuOpen(false)
    setSelectedIndex((current) => (value.length === 0 ? null : current))
  }, [])

  const handleReset = useCallback((): void => {
    setInput('')
    setFilter('all')
    setSelectedIndex(null)
    setIsMenuOpen(false)
    setSelectedCp(null)
  }, [setSelectedCp])

  const handleSelectUnit = useCallback(
    (unit: InspectorUnit): void => {
      setSelectedIndex(unit.index)
      setSelectedCp(unit.cp)
    },
    [setSelectedCp],
  )

  const handleJumpToWarning = useCallback(
    (warning: InspectorWarning): void => {
      const unit = units.find((entry) => entry.index === warning.firstIndex)

      if (!unit) {
        return
      }

      setFilter('all')
      setSelectedIndex(unit.index)
      setSelectedCp(unit.cp)
      setIsMenuOpen(false)
    },
    [setSelectedCp, units],
  )

  const handleCopyAction = useCallback(
    async (action: InspectorCopyAction): Promise<void> => {
      await copyValue(action.label, action.value)
      setIsMenuOpen(false)
    },
    [copyValue],
  )

  const handleSelectFilter = useCallback((nextFilter: InspectorFilter): void => {
    setFilter(nextFilter)
    setIsMenuOpen(false)
  }, [])

  const handleToggleMenu = useCallback((): void => {
    setIsMenuOpen((current) => !current)
  }, [])

  return {
    actions,
    announceMessage,
    copiedLabel,
    filter,
    filterLabel,
    input,
    isMenuOpen,
    onCopyAction: handleCopyAction,
    onInputChange: handleInputChange,
    onJumpToWarning: handleJumpToWarning,
    onReset: handleReset,
    onSelectFilter: handleSelectFilter,
    onSelectUnit: handleSelectUnit,
    onToggleMenu: handleToggleMenu,
    selectedRecord,
    selectedIndex,
    summary,
    units,
    visibleUnits,
    warnings,
  }
}
