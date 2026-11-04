import { useEffect, useState } from 'react'
import type { useTextInspector } from '../hooks/useTextInspector'
import type { InspectorUnit } from '../types/unicode'
import { formatCodePoint } from '../utils/copyFormats'
import { getPrimaryGlyph } from '../utils/rendering'
import { getInspectorPlaceholder } from '../utils/textInspectorProperties'
import { InspectorPagination } from './InspectorPagination'

const PAGE_SIZE = 100

type TextInspectorListProps = {
  model: ReturnType<typeof useTextInspector>
  onInspectUnit: (unit: InspectorUnit) => void
}

export function TextInspectorList({ model, onInspectUnit }: TextInspectorListProps) {
  const [page, setPage] = useState(0)
  const { visibleUnits, selectedIndex } = model
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visibleUnits.length / PAGE_SIZE) - 1))
  useEffect(() => { setPage(0) }, [model.input, model.filter])
  useEffect(() => {
    if (selectedIndex !== null) {
      const index = visibleUnits.findIndex((unit) => unit.index === selectedIndex)
      if (index >= 0) setPage(Math.floor(index / PAGE_SIZE))
    }
  }, [selectedIndex, visibleUnits])

  return (
    <section className="text-inspector-results" aria-label="Code-point breakdown">
      <div className="panel-heading compact"><h3>Code-point breakdown</h3></div>
      <div className="inspector-filters" aria-label="Breakdown filter">
        {(['all', 'findings', 'invisible'] as const).map((filter) => (
          <button
            key={filter} type="button" className="ghost-button"
            aria-pressed={model.filter === filter} onClick={() => model.onSelectFilter(filter)}
          >{filter.charAt(0).toUpperCase() + filter.slice(1)}</button>
        ))}
        <span>{visibleUnits.length.toLocaleString()} of {model.units.length.toLocaleString()}</span>
      </div>
      <InspectorPagination
        label="Breakdown" page={currentPage} pageSize={PAGE_SIZE} total={visibleUnits.length}
        onPageChange={setPage}
      />
      {visibleUnits.length ? (
        <ul className="text-inspector-list" aria-label="Text inspector rows">
          {visibleUnits.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
            .map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                aria-pressed={selectedIndex === unit.index}
                aria-label={`Inspect ${unit.name}, ${formatCodePoint(unit.cp)}, line ${unit.line}, column ${unit.column}`}
                className={'text-inspector-row'
                  + (selectedIndex === unit.index ? ' is-selected' : '')}
                onClick={() => onInspectUnit(unit)}
              >
                <span className="text-inspector-row__index">#{unit.index + 1}</span>
                <span className="text-inspector-row__glyph" dir="ltr">
                  {getInspectorPlaceholder(unit) ?? getPrimaryGlyph(unit)}
                </span>
                <span className="text-inspector-row__meta">
                  <strong>{unit.aliases?.[0] ?? unit.name}</strong>
                  <small>
                    {formatCodePoint(unit.cp)} · L{unit.line}:{unit.column}
                    <span className="text-inspector-row__badges">
                      {' · '}{unit.flags.length ? unit.flags.join(', ') : unit.kind}
                      {unit.findingIds.length ? ' · Finding' : ''}
                    </span>
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h3>No matches for this filter</h3>
          <p>Your text is still inspected. Choose All to see every code point.</p>
          <button
            type="button" className="ghost-button" onClick={() => model.onSelectFilter('all')}
          >Show all characters</button>
        </div>
      )}
    </section>
  )
}
