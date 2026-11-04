import { useEffect, useRef, useState } from 'react'
import type { InspectorOccurrence, InspectorUnit } from '../types/unicode'
import { getInspectorPlaceholder, isLineBreak } from '../utils/textInspectorProperties'
import { formatCodePoint } from '../utils/copyFormats'
import { InspectorPagination } from './InspectorPagination'

const PAGE_SIZE = 200

const previewClassName = (unit: InspectorUnit, hidden: boolean, selected: boolean): string =>
  'inspector-preview__unit' + (hidden ? ' is-hidden' : '')
    + (unit.findingIds.length ? ' has-finding' : '') + (selected ? ' is-selected' : '')

const endsLine = (unit: InspectorUnit, next: InspectorUnit | undefined): boolean =>
  isLineBreak(unit.cp) && !(unit.cp === 0x0d && next?.cp === 0x0a)

type TextInspectorPreviewProps = {
  units: InspectorUnit[]
  selection: InspectorOccurrence | null
  revealContext: boolean
  onSelectUnit: (unit: InspectorUnit) => void
}

export function TextInspectorPreview({
  units, selection, revealContext, onSelectUnit,
}: TextInspectorPreviewProps) {
  const [page, setPage] = useState(0)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const currentPage = Math.min(page, Math.max(0, Math.ceil(units.length / PAGE_SIZE) - 1))
  const selectedIndex = selection?.startIndex
  useEffect(() => {
    if (selectedIndex !== undefined) setPage(Math.floor(selectedIndex / PAGE_SIZE))
  }, [selectedIndex])
  useEffect(() => {
    if (revealContext) activeRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [currentPage, selectedIndex, revealContext])

  return (
    <section className="inspector-preview-section" aria-label="Annotated text">
      <div className="panel-heading compact">
        <h3>Text in context</h3>
        <p>Hidden characters are labeled. Select any character to inspect its occurrence.</p>
      </div>
      <InspectorPagination
        label="Preview" page={currentPage} pageSize={PAGE_SIZE} total={units.length}
        onPageChange={setPage}
      />
      <div className="inspector-preview" dir="ltr">
        {units.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((unit) => {
          const placeholder = getInspectorPlaceholder(unit)
          const selected = !!selection && unit.index >= selection.startIndex
            && unit.index < selection.endIndex
          const lineBreak = endsLine(unit, units[unit.index + 1])
          return (
            <span key={unit.id}>
              <button
                type="button"
                ref={unit.index === selectedIndex ? activeRef : null}
                className={previewClassName(unit, placeholder !== null, selected)}
                aria-pressed={selected}
                aria-label={`Inspect ${unit.name}, ${formatCodePoint(unit.cp)}, line ${unit.line}, column ${unit.column}`}
                onClick={() => onSelectUnit(unit)}
              >
                {placeholder ? `[${placeholder}]` : unit.text}
              </button>
              {lineBreak ? <br /> : null}
            </span>
          )
        })}
      </div>
    </section>
  )
}
