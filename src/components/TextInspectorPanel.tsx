import { useEffect, useRef } from 'react'
import type { InspectorSummary, InspectorUnit, InspectorWarning } from '../types/unicode'
import { formatCodePoint } from '../utils/copyFormats'
import { getPrimaryGlyph } from '../utils/rendering'

type TextInspectorPanelProps = {
  announceMessage: string
  copiedLabel: string | null
  filterLabel: string
  onJumpToWarning: (warning: InspectorWarning) => void
  onReset: () => void
  onSelectUnit: (unit: InspectorUnit) => void
  selectedIndex: number | null
  summary: InspectorSummary
  visibleUnits: InspectorUnit[]
  warnings: InspectorWarning[]
}

export function TextInspectorPanel({
  announceMessage,
  copiedLabel,
  filterLabel,
  onJumpToWarning,
  onReset,
  onSelectUnit,
  selectedIndex,
  summary,
  visibleUnits,
  warnings,
}: TextInspectorPanelProps) {
  const selectedRowRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (typeof selectedRowRef.current?.scrollIntoView === 'function') {
      selectedRowRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <section className="panel text-inspector-panel">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announceMessage}
      </div>

      <div className="panel-heading text-inspector-heading">
        <div>
          <h2>Text Inspector</h2>
          <p>
            Paste arbitrary text to inspect code points, invisible characters,
            and suspicious content.
          </p>
        </div>

        <div className="text-inspector-heading__actions">
          <button type="button" className="ghost-button" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      <div className="text-inspector-summary" aria-label="Text inspector summary">
        <span>{summary.codePointCount.toLocaleString()} code points</span>
        <span>{summary.lineCount.toLocaleString()} lines</span>
        <span>{summary.invisibleCount.toLocaleString()} invisible or control</span>
        <span>{summary.warningCount.toLocaleString()} warnings</span>
        <span>{filterLabel}</span>
      </div>

      {copiedLabel ? <p className="text-inspector-feedback">{copiedLabel} copied</p> : null}

      {warnings.length > 0 ? (
        <div className="text-inspector-warnings">
          <div className="panel-heading compact">
            <h3>Warnings</h3>
            <p>High-signal findings from the inspected text.</p>
          </div>

          <div className="text-inspector-warning-list">
            {warnings.map((warning) => (
              <button
                key={warning.id}
                type="button"
                className="note-card text-inspector-warning"
                onClick={() => onJumpToWarning(warning)}
              >
                <strong>{warning.title}</strong>
                <span>{warning.count.toLocaleString()} matches</span>
                <p>{warning.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {visibleUnits.length > 0 ? (
        <div className="text-inspector-results">
          <div className="panel-heading compact">
            <h3>Inspected Text</h3>
            <p>Ordered code-point breakdown for the current input.</p>
          </div>

          <div className="text-inspector-list" role="listbox" aria-label="Text inspector rows">
            {visibleUnits.map((unit) => {
              const isSelected = selectedIndex === unit.index

              return (
                <button
                  key={unit.id}
                  ref={isSelected ? selectedRowRef : null}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`Inspect ${unit.name} at line ${unit.line}, column ${unit.column}`}
                  className={isSelected ? 'text-inspector-row is-selected' : 'text-inspector-row'}
                  onClick={() => onSelectUnit(unit)}
                >
                  <span className="text-inspector-row__index">#{unit.index + 1}</span>
                  <span className={`text-inspector-row__glyph kind-${unit.kind}`}>{getPrimaryGlyph(unit)}</span>
                  <span className="text-inspector-row__meta">
                    <strong>{unit.aliases?.[0] ?? unit.name}</strong>
                    <small>
                      {formatCodePoint(unit.cp)} - line {unit.line}, col {unit.column}
                    </small>
                  </span>
                  <span className="inline-badges text-inspector-row__badges">
                    <span>{unit.kind}</span>
                    {unit.isSuspicious ? <span>Suspicious</span> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state text-inspector-empty">
          <h3>No text inspected yet</h3>
          <p>Paste text to break it into code points and inspect hidden characters.</p>
        </div>
      )}
    </section>
  )
}
